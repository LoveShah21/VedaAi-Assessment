// apps/backend/src/services/aiService.ts
import axios from 'axios';
import { IAssignment } from '../models/Assignment';
import { ISection } from '../models/Result';

export function buildPrompt(assignment: IAssignment, extractedText?: string): string {
  return `
You are an expert educational assessment creator for Indian schools.

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

Return ONLY valid JSON in this exact structure, no markdown, no explanation:
{
  "sections": [
    {
      "title": "Section A",
      "questionType": "Short Answer Questions",
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
}
`;
}

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENCODE_API_KEY;
  const model = process.env.OPENCODE_MODEL;

  if (!apiKey || !model) {
    throw new Error('OPENCODE_API_KEY and OPENCODE_MODEL must be set in environment variables');
  }

  const response = await axios.post(
    'https://api.opencode.ai/v1/chat/completions',
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
      timeout: 60000,
    }
  );

  return response.data.choices[0].message.content;
}

export async function generateQuestionPaper(
  assignment: IAssignment,
  extractedText?: string
): Promise<{ sections: ISection[]; totalMarks: number; totalQuestions: number }> {
  const prompt = buildPrompt(assignment, extractedText);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callLLM(prompt);
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);

      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error('Response missing sections array');
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

      return { sections: parsed.sections, totalMarks, totalQuestions };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) continue;
    }
  }

  throw lastError ?? new Error('AI generation failed after 3 attempts');
}
