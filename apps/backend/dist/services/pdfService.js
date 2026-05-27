"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdf = generatePdf;
// apps/backend/src/services/pdfService.ts
const puppeteer_1 = __importDefault(require("puppeteer"));
function buildHtml(result, assignment, includeAnswerKey) {
    const sectionsHtml = result.sections
        .map((section) => `
      <div style="margin-bottom: 36px; page-break-inside: avoid;">
        <!-- Section heading: left-aligned bold uppercase with bottom border (matches reference) -->
        <div style="border-bottom: 1px solid #1A1A1A; padding-bottom: 4px; margin-bottom: 8px;">
          <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; margin: 0;">
            ${section.title} &mdash; ${section.questionType}
          </h2>
        </div>
        <!-- Italic instruction -->
        <p style="font-style: italic; font-size: 12px; color: #1A1A1A; margin-bottom: 14px;">
          ${section.instruction}
        </p>
        <!-- Questions list -->
        ${section.questions
        .map((q) => `
        <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 10px; font-size: 13px; line-height: 1.6;">
          <span style="font-weight: 700; flex-shrink: 0; width: 24px; text-align: right;">${q.number}.</span>
          <div style="flex: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
            <span>
              ${q.text}
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; margin-left: 4px;">(${q.difficulty})</span>
            </span>
            <span style="flex-shrink: 0; font-weight: 700; font-size: 11px; padding: 1px 6px; white-space: nowrap;">
              [${q.marks} ${q.marks === 1 ? 'Mark' : 'Marks'}]
            </span>
          </div>
        </div>`)
        .join('')}
      </div>`)
        .join('');
    const answerKeyHtml = includeAnswerKey
        ? `<div style="margin-top: 40px; padding-top: 16px; border-top: 2px dashed #1A1A1A; page-break-before: always;">
        <h2 style="font-weight: 800; font-size: 14px; margin-bottom: 16px;">Answer Key:</h2>
        ${result.sections
            .map((s) => `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; letter-spacing: 0.05em; border-bottom: 1px solid #E5E7EB; padding-bottom: 2px; margin-bottom: 8px;">
              ${s.title}
            </h3>
            <ol style="padding-left: 20px; margin: 0; font-size: 13px;">
              ${s.questions
            .map((q) => `<li style="margin-bottom: 8px; line-height: 1.6; color: #1A1A1A;">${q.answer || 'No answer key provided.'}</li>`)
            .join('')}
            </ol>
          </div>`)
            .join('')}
       </div>`
        : '';
    const totalMarks = result.totalMarks;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', 'Georgia', serif;
      font-size: 14px;
      color: #1A1A1A;
      background: white;
    }
    hr.solid {
      border: none;
      border-top: 1px solid #1A1A1A;
      margin: 0;
    }
    @page {
      margin: 22mm 18mm;
      size: A4 portrait;
    }
  </style>
</head>
<body>

  <!-- ===== PAPER HEADER — centered school info (matches reference image) ===== -->
  <div style="text-align: center; margin-bottom: 16px;">
    <h1 style="font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;">
      ${assignment.schoolName || 'Veda International School'}
    </h1>
    <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; margin-top: 4px;">
      ${assignment.title || `${assignment.subject} Examination`}
    </p>
    <p style="font-size: 13px; font-weight: 600; margin-top: 2px;">
      ${assignment.className} &nbsp;|&nbsp; ${assignment.subject}
    </p>
  </div>

  <hr class="solid">

  <!-- ===== EXAM METADATA ROW ===== -->
  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; padding: 8px 0;">
    <span>Time Allowed: ${assignment.timeAllowed} Minutes</span>
    <span>Maximum Marks: ${totalMarks} Marks</span>
  </div>

  <hr class="solid" style="margin-bottom: 12px;">

  <!-- ===== GENERAL INSTRUCTIONS ===== -->
  <p style="font-style: italic; font-size: 12px; color: #374151; margin-bottom: 16px;">
    General Instructions: Read all questions carefully. All questions are compulsory unless stated otherwise.
  </p>

  <!-- ===== STUDENT DETAILS — plain text lines (matches reference) ===== -->
  <div style="font-size: 13px; font-weight: 600; margin-bottom: 32px;">
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <span style="white-space: nowrap;">Student Name:</span>
      <span style="flex: 1; border-bottom: 1px solid #1A1A1A; margin-left: 8px; height: 16px; display: inline-block;"></span>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <span style="white-space: nowrap;">Roll Number:</span>
      <span style="width: 160px; border-bottom: 1px solid #1A1A1A; margin-left: 8px; height: 16px; display: inline-block;"></span>
    </div>
    <div style="display: flex; align-items: center;">
      <span style="white-space: nowrap;">Class: ${assignment.className} Section:</span>
      <span style="width: 80px; border-bottom: 1px solid #1A1A1A; margin-left: 8px; height: 16px; display: inline-block;"></span>
    </div>
  </div>

  <!-- ===== QUESTION SECTIONS ===== -->
  ${sectionsHtml}

  <!-- ===== END OF PAPER ===== -->
  <p style="text-align: center; font-weight: 700; font-size: 11px; margin-top: 48px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em;">
    *** End of Question Paper ***
  </p>

  <!-- Generation info footer -->
  <p style="font-size: 10px; color: #9CA3AF; text-align: center; margin-top: 16px; padding-top: 8px; border-top: 1px solid #F3F4F6;">
    Generated by VedaAI &bull; ${new Date(result.generatedAt).toLocaleString()} &bull; Version ${result.version}
  </p>

  <!-- ===== ANSWER KEY ===== -->
  ${answerKeyHtml}

</body>
</html>`;
}
async function generatePdf(result, assignment, includeAnswerKey) {
    const browser = await puppeteer_1.default.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm (Docker has 64MB limit)
            '--disable-gpu', // No GPU process needed in containers
            '--no-zygote', // Reduces process spawning overhead
            '--single-process', // Single process mode — lower memory, acceptable for PDF gen
        ],
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(buildHtml(result, assignment, includeAnswerKey), {
        waitUntil: 'networkidle0',
    });
    // @page CSS inside the HTML handles all margins — no extra margin here.
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        // margins are driven by the @page rule in the HTML itself
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();
    return Buffer.from(pdf);
}
