"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAssessmentPDF = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
const generateAssessmentPDF = async (assignment, questions) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${assignment.title}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header-container {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 10px 0;
      color: #111;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .meta-item {
      margin-bottom: 4px;
    }
    .meta-label {
      font-weight: bold;
      color: #555;
    }
    .question-list {
      margin-top: 20px;
    }
    .question-item {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .question-header {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .option-item {
      font-size: 14px;
    }
    .answer-key-section {
      page-break-before: always;
      margin-top: 40px;
      border-top: 2px dashed #999;
      padding-top: 20px;
    }
    .answer-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .answer-item {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .explanation {
      font-style: italic;
      color: #666;
      font-size: 13px;
      margin-top: 4px;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
      }
      .question-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <h1 class="title">${assignment.title}</h1>
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Subject:</span> ${assignment.subject}</div>
      <div class="meta-item"><span class="meta-label">Grade Level:</span> ${assignment.gradeLevel}</div>
      <div class="meta-item"><span class="meta-label">Topic:</span> ${assignment.topic}</div>
      <div class="meta-item"><span class="meta-label">Difficulty:</span> ${assignment.difficulty}</div>
      <div class="meta-item"><span class="meta-label">Questions:</span> ${assignment.numberOfQuestions}</div>
      <div class="meta-item"><span class="meta-label">Date:</span> ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="question-list">
    ${questions
        .map((q, index) => `
      <div class="question-item">
        <div class="question-header">Q${index + 1}. ${q.questionText}</div>
        ${q.options && q.options.length > 0
        ? `
          <div class="options-grid">
            ${q.options.map((opt) => `<div class="option-item">${opt}</div>`).join('')}
          </div>
        `
        : ''}
      </div>
    `)
        .join('')}
  </div>

  <div class="answer-key-section">
    <h2 class="answer-title">Answer Key & Explanations</h2>
    ${questions
        .map((q, index) => `
      <div class="answer-item">
        <div><strong>Q${index + 1}. Correct Answer:</strong> ${q.correctAnswer || 'N/A'}</div>
        ${q.explanation ? `<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
      </div>
    `)
        .join('')}
  </div>
</body>
</html>
  `;
    const uploadDir = path_1.default.resolve(env_1.env.UPLOAD_DIR);
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `assessment-${assignment._id}.pdf`;
    const outputPath = path_1.default.join(uploadDir, filename);
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            margin: {
                top: '20mm',
                bottom: '20mm',
                left: '20mm',
                right: '20mm',
            },
            printBackground: true,
        });
        return filename;
    }
    finally {
        await browser.close();
    }
};
exports.generateAssessmentPDF = generateAssessmentPDF;
