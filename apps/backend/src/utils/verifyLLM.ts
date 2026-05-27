// apps/backend/src/utils/verifyLLM.ts
import { generateQuestionPaper } from '../services/aiService';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ZEN_URL = 'https://opencode.ai/zen/v1/chat/completions';
const MODEL_ID = 'deepseek-v4-flash-free';

async function verify() {
  console.log('🧪 Starting LLM configuration validation...');

  const key = process.env.OPENCODE_API_KEY || '';
  if (!key) {
    console.error('❌ OPENCODE_API_KEY is not defined in backend .env');
    process.exit(1);
  }

  console.log(`Endpoint: ${ZEN_URL}`);
  console.log(`Model to test: ${MODEL_ID}\n`);

  try {
    console.log(`Generating question paper with model: ${MODEL_ID} ...`);
    process.env.OPENCODE_MODEL = MODEL_ID;
    
    const mockAssignment: any = {
      schoolName: 'Veda International School',
      subject: 'General Science',
      className: '10',
      timeAllowed: 60,
      difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
      additionalInstructions: "Include questions about Newton's laws of motion.",
      questionTypes: [
        { type: 'MCQ', count: 2, marksPerQuestion: 2 },
        { type: 'Short Answer', count: 1, marksPerQuestion: 5 },
      ],
    };

    const result = await generateQuestionPaper(
      mockAssignment,
      "Sir Isaac Newton formulated the three laws of motion."
    );
    console.log('\n✅ Question paper generated successfully!');
    console.log(`   Sections  : ${result.sections.length}`);
    console.log(`   Questions : ${result.totalQuestions}`);
    console.log(`   Total marks: ${result.totalMarks}`);
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('\n❌ generateQuestionPaper failed:', message);
    process.exit(1);
  }
}

verify();