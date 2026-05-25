import axios from 'axios';
import { env } from '../config/env';
import { IQuestion } from '../models/Result';

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code block prefixes if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  // Remove markdown code block suffixes if present
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

export const generateQuestions = async (params: {
  subject: string;
  gradeLevel: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  questionType: 'mcq' | 'short' | 'long' | 'mixed';
  sourceMaterial?: string;
}): Promise<IQuestion[]> => {
  const { subject, gradeLevel, topic, difficulty, numberOfQuestions, questionType, sourceMaterial } = params;

  const systemPrompt = `You are VedaAI, an expert educational assessment designer.
Your task is to generate high-quality assessment questions based on the parameters provided.
You MUST respond with a single valid JSON object containing a "questions" array.
Do not include any introductory or concluding text, explanations, or markdown code block formatting in your response. The output must be raw, parsable JSON.

Format structure:
{
  "questions": [
    {
      "questionText": "Question text here",
      "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"], // Required ONLY if type is MCQ or mixed (for MCQ questions). Provide exactly 4 options.
      "correctAnswer": "A", // For MCQ, specify the option letter like 'A', 'B', 'C', or 'D'. For short/long answer, provide a brief sample answer.
      "explanation": "Explanation of the correct answer.",
      "difficulty": "easy", // Must be 'easy', 'medium', or 'hard'
      "cognitiveLevel": "Remembering" // e.g., Remembering, Understanding, Applying, Analyzing, Evaluating, Creating (from Bloom's Taxonomy)
    }
  ]
}
`;

  const userPrompt = `Generate a test containing exactly ${numberOfQuestions} questions of type '${questionType}' at a '${difficulty}' difficulty level.
Subject: ${subject}
Grade Level: ${gradeLevel}
Topic: ${topic}
${sourceMaterial ? `Source Material: ${sourceMaterial}` : ''}
`;

  let lastError: Error | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🤖 AI Service: Attempt ${attempt}/${maxAttempts} to generate questions...`);

      const response = await axios.post(
        env.OPENCODE_API_URL,
        {
          model: env.OPENCODE_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENCODE_API_KEY}`,
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response content from AI endpoint');
      }

      const cleanedContent = cleanJsonString(content);
      const parsedData = JSON.parse(cleanedContent);

      if (!parsedData || !Array.isArray(parsedData.questions)) {
        throw new Error('Parsed JSON does not contain a "questions" array');
      }

      if (parsedData.questions.length === 0) {
        throw new Error('Generated questions array is empty');
      }

      // Basic structure validation/normalization
      const validatedQuestions: IQuestion[] = parsedData.questions.map((q: any) => {
        const difficultyVal = ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : difficulty;
        return {
          questionText: String(q.questionText || ''),
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          correctAnswer: q.correctAnswer ? String(q.correctAnswer) : undefined,
          explanation: q.explanation ? String(q.explanation) : undefined,
          difficulty: difficultyVal as 'easy' | 'medium' | 'hard',
          cognitiveLevel: q.cognitiveLevel ? String(q.cognitiveLevel) : 'Understanding',
        };
      });

      return validatedQuestions;
    } catch (error: any) {
      console.warn(`⚠️ AI Service: Attempt ${attempt} failed: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`Failed to generate valid questions JSON after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
};
