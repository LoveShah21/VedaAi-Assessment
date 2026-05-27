// Quick LLM test - run with: node src/utils/testLLM.js
const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.OPENCODE_API_KEY;
const model = process.env.OPENCODE_MODEL;
const apiUrl = process.env.OPENCODE_API_URL;

console.log('=== LLM CONFIG ===');
console.log('API Key (first 10):', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');
console.log('Model:', model);
console.log('URL:', apiUrl);

const prompt = `You are an expert educational assessment creator for Indian schools.

Generate a complete question paper with the following specifications:

SCHOOL: Test School
SUBJECT: Science
CLASS: 10
TIME ALLOWED: 60 minutes

QUESTION CONFIGURATION:
Section A: MCQ — 2 questions × 2 marks each

DIFFICULTY DISTRIBUTION:
- Easy: 50%
- Moderate: 30%
- Hard: 20%

ADDITIONAL INSTRUCTIONS: Newton laws of motion

Return ONLY valid JSON in this exact structure, no markdown, no explanation:
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

async function test() {
  try {
    console.log('\n=== Sending request... ===');
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
        timeout: 90000,
      }
    );

    const choice = response.data.choices[0];
    const content = choice.message.content;
    const reasoning = choice.message.reasoning_content;

    console.log('\n=== RAW CONTENT (first 1000 chars) ===');
    console.log(content.substring(0, 1000));
    console.log('\n=== CONTENT LENGTH:', content.length);
    console.log('=== HAS REASONING_CONTENT:', !!reasoning);
    console.log('=== FINISH REASON:', choice.finish_reason);
    console.log('\n=== CONTENT STARTS WITH (hex):', Buffer.from(content.substring(0, 10)).toString('hex'));

    // Try parsing
    console.log('\n=== ATTEMPTING JSON PARSE ===');
    // Strip code fences
    let cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    // Strip think tags if present
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    console.log('Cleaned starts with:', JSON.stringify(cleaned.substring(0, 100)));
    
    try {
      const parsed = JSON.parse(cleaned);
      console.log('✅ JSON PARSE SUCCESS');
      console.log('Sections count:', parsed.sections?.length);
      console.log('First section questions:', parsed.sections?.[0]?.questions?.length);
    } catch (parseErr) {
      console.error('❌ JSON PARSE FAILED:', parseErr.message);
      console.log('Cleaned content:', cleaned.substring(0, 500));
    }
  } catch (err) {
    console.error('❌ API CALL FAILED');
    console.error('Status:', err.response?.status);
    console.error('Data:', JSON.stringify(err.response?.data));
    console.error('Message:', err.message);
  }
}

test();
