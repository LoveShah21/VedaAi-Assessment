// apps/backend/src/services/aiService.ts
import axios from 'axios';
import { IAssignment } from '../models/Assignment';
import { ISection } from '../models/Result';
import { env } from '../config/env';

export function buildPrompt(assignment: IAssignment, extractedText?: string): string {
  return `You are an expert educational assessment creator for Indian schools.

Generate a complete question paper with the following specifications:

SCHOOL: ${assignment.schoolName}
SUBJECT: ${assignment.subject}
CLASS: ${assignment.className}
TIME ALLOWED: ${assignment.timeAllowed} minutes

QUESTION CONFIGURATION:
${assignment.questionTypes
  .map(
    (qt, i) =>
      `Section ${String.fromCharCode(65 + i)}: ${qt.type} — ${qt.count} questions × ${qt.marksPerQuestion} marks each`
  )
  .join('\n')}

DIFFICULTY DISTRIBUTION:
- Easy: ${assignment.difficultyDistribution.easy}%
- Moderate: ${assignment.difficultyDistribution.medium}%
- Hard: ${assignment.difficultyDistribution.hard}%

${extractedText ? `REFERENCE MATERIAL:\n${extractedText.slice(0, 3000)}` : ''}

ADDITIONAL INSTRUCTIONS: ${assignment.additionalInstructions || 'None'}

IMPORTANT: Your response must be ONLY a valid JSON object. Do not include any explanation, markdown, code fences, or thinking text. Start your response directly with { and end with }.

Required JSON structure:
{
  "sections": [
    {
      "title": "Section A",
      "questionType": "MCQ",
      "instruction": "Attempt all questions. Each question carries 2 marks.",
      "questions": [
        {
          "number": 1,
          "text": "Full question text here.",
          "difficulty": "Easy",
          "marks": 2,
          "answer": "Model answer here."
        }
      ]
    }
  ]
}`;
}

/**
 * Extract JSON from LLM response that may contain:
 * - <think>...</think> reasoning blocks (DeepSeek, Qwen thinking models)
 * - ```json ... ``` markdown code fences
 * - Extra explanation text before/after the JSON object
 */
function extractJSON(raw: string): string {
  let text = raw.trim();

  // 1. Strip <think>...</think> blocks (reasoning/thinking models)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  // 3. If it already starts with {, return directly
  if (text.startsWith('{')) {
    return text;
  }

  // 4. Find the first complete { ... } block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // 5. Return as-is and let JSON.parse throw a clear error
  return text;
}

async function callLLM(prompt: string): Promise<string> {
  const apiKey = env.OPENCODE_API_KEY;
  const model = env.OPENCODE_MODEL;
  const apiUrl = env.OPENCODE_API_URL;

  if (!apiKey || !model) {
    throw new Error('OPENCODE_API_KEY and OPENCODE_MODEL must be set in environment variables');
  }

  console.log(`🤖 Calling LLM: model=${model}`);

  const response = await axios.post(
    apiUrl,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes — LLM can take time for large papers
    }
  );

  if (!response.data || !response.data.choices || !response.data.choices[0]) {
    throw new Error(`Invalid API Response structure: ${JSON.stringify(response.data)}`);
  }

  const content = response.data.choices[0].message.content;
  const finishReason = response.data.choices[0].finish_reason;
  console.log(`🤖 LLM responded: ${content?.length} chars, finish_reason=${finishReason}`);
  console.log(`🤖 Preview: ${content?.substring(0, 200)}`);

  return content;
}

export async function generateQuestionPaper(
  assignment: IAssignment,
  extractedText?: string
): Promise<{ sections: ISection[]; totalMarks: number; totalQuestions: number }> {
  const prompt = buildPrompt(assignment, extractedText);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 AI generation attempt ${attempt}/3`);
      const raw = await callLLM(prompt);
      const cleaned = extractJSON(raw);

      console.log(`🔄 Parsing JSON. Starts with: ${cleaned.substring(0, 80)}`);
      const parsed = JSON.parse(cleaned);

      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error(`Response missing sections array. Got keys: ${Object.keys(parsed).join(', ')}`);
      }
      if (parsed.sections.length === 0) {
        throw new Error('Response has empty sections array');
      }

      const totalQuestions = parsed.sections.reduce(
        (sum: number, s: ISection) => sum + s.questions.length,
        0
      );
      const totalMarks = parsed.sections.reduce(
        (sum: number, s: ISection) =>
          sum + s.questions.reduce((qSum: number, q) => qSum + q.marks, 0),
        0
      );

      console.log(`✅ AI generation succeeded: ${totalQuestions} questions, ${totalMarks} total marks`);
      return { sections: parsed.sections, totalMarks, totalQuestions };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`❌ AI attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('AI generation failed after 3 attempts');
}
