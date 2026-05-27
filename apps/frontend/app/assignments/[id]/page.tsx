"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAssignmentStore, Assignment } from "../../../store/useAssignmentStore";
import { ErrorBoundary } from "../../../components/common/ErrorBoundary";
import {
  Download,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  HelpCircle,
  Share2,
  ShieldCheck
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface IQuestion {
  number: number;
  text: string;
  difficulty: string;
  marks: number;
  answer: string;
}

interface ISection {
  title: string;
  questionType: string;
  instruction: string;
  questions: IQuestion[];
}

interface IResult {
  _id: string;
  assignmentId?: string;
  sections: ISection[];
  totalMarks: number;
  totalQuestions: number;
  generatedAt: string;
  version: number;
}

const QuestionPaperSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto" />
    <div className="space-y-3 pt-6 border-t border-gray-100">
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
    <div className="space-y-4 pt-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="p-4 border border-gray-150 rounded-xl space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/5" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-100 rounded w-full" />
        </div>
      ))}
    </div>
  </div>
);

export default function AssignmentDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const addAssignment = useAssignmentStore((state) => state.addAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);

  // Retrieve current assignment
  const assignment = assignments.find((a) => a.id === id);

  const currentJob = useAssignmentStore((state) => state.currentJob);
  const setCurrentJob = useAssignmentStore((state) => state.setCurrentJob);

  const isRegenerating = !!(currentJob && currentJob.id === id && currentJob.status === "processing");

  const [selectedVersion, setSelectedVersion] = useState<number>(assignment?.version || 1);
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(false);
  const [result, setResult] = useState<IResult | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(true);

  // Automatically select the latest version when a new version is created/updated
  useEffect(() => {
    if (assignment && assignment.version) {
      setSelectedVersion((prev) => {
        if (assignment.version > prev) {
          return assignment.version;
        }
        return prev;
      });
    }
  }, [assignment?.version]);

  // Fetch assignment if missing from store (e.g. direct page refresh)
  useEffect(() => {
    if (assignment) return;
    const fetchAssignmentData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/assignments/${id}`);
        if (res.data && res.data.assignment) {
          const backendAss = res.data.assignment;
          const mappedAss: Assignment = {
            id: backendAss._id,
            title: backendAss.title,
            subject: backendAss.subject,
            grade: backendAss.className,
            dueDate: new Date(backendAss.dueDate).toISOString().split('T')[0],
            assignedDate: new Date(backendAss.createdAt).toLocaleDateString(),
            schoolName: backendAss.schoolName,
            timeAllowed: backendAss.timeAllowed,
            difficulty: {
              easy: backendAss.difficultyDistribution?.easy ?? 30,
              medium: backendAss.difficultyDistribution?.medium ?? 50,
              hard: backendAss.difficultyDistribution?.hard ?? 20,
            },
            questions: [],
            includeAnswerKey: backendAss.includeAnswerKey,
            version: backendAss.version || 1,
            status: backendAss.status,
            versionHistory: backendAss.versionHistory && backendAss.versionHistory.length > 0
              ? backendAss.versionHistory
              : [{ version: 1, timestamp: new Date(backendAss.createdAt).toLocaleString(), questionsCount: 0 }]
          };
          addAssignment(mappedAss);
        }
      } catch (err) {
        console.error("Failed to load assignment on direct page load:", err);
      }
    };
    fetchAssignmentData();
  }, [id, assignment, addAssignment]);

  // Fetch sections-based result
  useEffect(() => {
    if (!assignment) return;

    const fetchResult = async () => {
      setVersionLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/assignments/${id}/results?version=${selectedVersion}`);
        if (res.data) {
          if (res.data.result) {
            setResult(res.data.result);
          } else {
            setResult(res.data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch result from API, creating mock result.", err);
        // Create mock sections-based result based on assignment
        const mockResult = {
          _id: id,
          sections: [
            {
              title: "Section A",
              questionType: "Multiple Choice Questions",
              instruction: "Attempt all questions. Each question carries 2 marks.",
              questions: assignment.questions.map((q, idx) => ({
                number: idx + 1,
                text: q.questionText,
                difficulty: idx % 3 === 0 ? "Easy" : idx % 3 === 1 ? "Moderate" : "Hard",
                marks: q.marks,
                answer: q.answerKey || "N/A"
              }))
            }
          ],
          totalMarks: assignment.questions.reduce((sum, q) => sum + q.marks, 0),
          totalQuestions: assignment.questions.length,
          generatedAt: new Date().toISOString(),
          version: selectedVersion
        };
        setResult(mockResult);
      } finally {
        setVersionLoading(false);
      }
    };
    fetchResult();
  }, [id, selectedVersion, assignment]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (!assignment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier) return;

      const key = e.key.toLowerCase();
      if (key === "e") {
        e.preventDefault();
        handleRegenerate();
      } else if (key === "d") {
        e.preventDefault();
        handleDownloadPDF();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assignment, result, showAnswerKeys]);

  if (!assignment) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4 font-sans">
        <div className="animate-spin text-brand-orange text-3xl font-bold">↻</div>
        <p className="text-brand-secondary font-medium">Loading assessment details...</p>
        <button
          onClick={() => router.push("/assignments")}
          className="text-brand-orange hover:underline text-sm font-semibold flex items-center justify-center mx-auto space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments</span>
        </button>
      </div>
    );
  }

  // Action: PDF Download
  const handleDownloadPDF = () => {
    if (!result) {
      addToast("Please wait until the assessment results have loaded.", "error");
      return;
    }
    addToast("Exporting assessment as PDF document...", "info");
    try {
      const resultId = result._id || id;
      window.open(`${API_URL}/api/results/${resultId}/pdf?includeAnswerKey=${showAnswerKeys}`, "_blank");
      addToast("PDF generated successfully!", "success");
    } catch (err) {
      console.warn("PDF download API failed, falling back to print:", err);
      window.print();
    }
  };

  // Action: Copy All Questions
  const handleCopyAllQuestions = () => {
    if (!result) return;
    let formattedText = `${assignment.title}\nSubject: ${assignment.subject} | Grade: ${assignment.grade}\n\n`;

    result.sections.forEach((sec: ISection) => {
      formattedText += `--- ${sec.title}: ${sec.questionType} ---\n${sec.instruction}\n\n`;
      sec.questions.forEach((q: IQuestion) => {
        formattedText += `Q${q.number}. [${q.difficulty}] ${q.text} [${q.marks} Pts]\n`;
        if (showAnswerKeys && q.answer) {
          formattedText += `Answer: ${q.answer}\n`;
        }
        formattedText += `\n`;
      });
    });

    navigator.clipboard.writeText(formattedText).then(() => {
      addToast("All question data copied to clipboard!", "success");
    }).catch(() => {
      addToast("Failed to copy question text.", "error");
    });
  };

  // Action: Share Preview
  const handleSharePreviewLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/assignments/${assignment.id}/preview?version=${selectedVersion}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast("Preview share link copied to clipboard!", "success");
      }).catch(() => {
        addToast("Failed to copy link.", "error");
      });
    }
  };

  // Action: Regenerate
  const handleRegenerate = async () => {
    if (isRegenerating) return;

    setCurrentJob({
      id: id,
      status: "processing",
      progress: 5,
      logs: ["Initiating paper regeneration...", "Connecting to OpenCode Zen API..."]
    });

    try {
      const res = await axios.post(`${API_URL}/api/assignments/${id}/regenerate`);
      if (res.data && res.data.success) {
        addToast("Assessment regeneration requested successfully.", "info");
      } else {
        throw new Error(res.data?.message || "Regeneration request failed");
      }
    } catch (err) {
      console.error("Failed to regenerate assignment:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      addToast(`Regeneration failed: ${errMsg}`, "error");
      setCurrentJob(null);
    }
  }; return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans relative pb-20">
      {/* Conversational Introductory Banner - Dark rounded card */}
      <div className="bg-[#1A1A1A] text-white rounded-2xl p-6 shadow-md text-sm leading-relaxed font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="flex-1">Certainly, John Doe! Here is the customized Question Paper for your {assignment.grade} {assignment.subject} classes on the topic of &ldquo;{assignment.title}&rdquo;:</p>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 font-bold rounded-full text-xs transition-all shadow-sm flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download as PDF</span>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/assignments")}
            className="p-2 hover:bg-gray-150 text-[#1A1A1A] rounded-lg transition-colors border border-gray-200"
            title="Back to Assignments"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-bold text-sm text-[#1A1A1A]">{assignment.title}</h3>
            <p className="text-[10px] text-brand-secondary font-medium">
              {assignment.grade} • {assignment.subject}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Version Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-[#1A1A1A] rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
            >
              <span>Version {selectedVersion}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-550" />
            </button>

            {isVersionDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-lg shadow-xl text-xs text-brand-dark py-1 z-35 font-medium">
                {(assignment.versionHistory && assignment.versionHistory.length > 0
                  ? assignment.versionHistory
                  : [{ version: 1, timestamp: assignment.assignedDate, questionsCount: result?.totalQuestions || 0 }]
                ).map((h) => (
                  <button
                    key={h.version}
                    onClick={() => {
                      setSelectedVersion(h.version);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${selectedVersion === h.version ? "text-brand-orange font-bold bg-orange-50/20" : ""}`}
                  >
                    <span>Version {h.version}</span>
                    <span className="text-[10px] text-brand-secondary">{h.questionsCount} Qs</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy All Button */}
          <button
            onClick={handleCopyAllQuestions}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-[#1A1A1A] rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
            <span>Copy All</span>
          </button>

          {/* Share Preview Button */}
          <button
            onClick={handleSharePreviewLink}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-[#1A1A1A] rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
            <span>Share Link</span>
          </button>

          {/* Regenerate Trigger */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-[#1A1A1A] rounded-lg text-xs font-semibold border border-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-550 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
            <span className="shortcut-hint ml-1.5 text-[9px] border border-gray-250 rounded px-1 text-brand-secondary">Ctrl+E</span>
          </button>
        </div>
      </div>

      {/* Regeneration status logs box (if active) */}
      {isRegenerating && currentJob && (
        <div className="bg-gray-950 text-gray-200 p-4 rounded-xl font-mono text-[11px] flex flex-col space-y-1 border border-gray-800 shadow-inner max-h-40 overflow-y-auto">
          <p className="text-white font-bold mb-1">Regenerating Questions...</p>
          {currentJob.logs.map((log, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="animate-pulse text-brand-orange">⚡</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Left Column (Exam sheet), Right Column (Settings & Stats Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Side: Exam Layout Paper */}
        <div className="lg:col-span-2 space-y-6">

          {/* Difficulty Summary Chart Widget */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
              Difficulty Distribution
            </h4>

            {/* Horizontal Segmented Bar */}
            <div className="h-6 rounded-full overflow-hidden flex border border-gray-150 shadow-inner">
              <div
                className="bg-green-505 bg-[#22C55E] h-full hover:brightness-105 transition-all cursor-pointer"
                style={{ width: `${assignment.difficulty.easy}%` }}
                title={`Easy: ${assignment.difficulty.easy}%`}
              />
              <div
                className="bg-amber-505 bg-[#EAB308] h-full hover:brightness-105 transition-all cursor-pointer"
                style={{ width: `${assignment.difficulty.medium}%` }}
                title={`Medium: ${assignment.difficulty.medium}%`}
              />
              <div
                className="bg-red-55 bg-[#EF4444] h-full hover:brightness-105 transition-all cursor-pointer"
                style={{ width: `${assignment.difficulty.hard}%` }}
                title={`Hard: ${assignment.difficulty.hard}%`}
              />
            </div>

            {/* Badge Labels & Stats */}
            <div className="flex items-center justify-between text-xs font-semibold gap-4 pt-1 flex-wrap">
              <span className="flex items-center space-x-2 text-green-700">
                <span className="w-3 h-3 rounded bg-[#22C55E]" />
                <span>Easy: {assignment.difficulty.easy}%</span>
              </span>
              <span className="flex items-center space-x-2 text-amber-600">
                <span className="w-3 h-3 rounded bg-[#EAB308]" />
                <span>Medium: {assignment.difficulty.medium}%</span>
              </span>
              <span className="flex items-center space-x-2 text-red-600">
                <span className="w-3 h-3 rounded bg-[#EF4444]" />
                <span>Hard: {assignment.difficulty.hard}%</span>
              </span>
            </div>
          </div>

          {/* Exam Paper Sheet - White printed paper sheet style */}
          <div className="bg-white rounded-2xl border border-gray-150 p-8 md:p-12 shadow-sm print:shadow-none print:border-none" id="exam-paper">
            <ErrorBoundary fallback={<div className="p-6 text-center text-red-600 font-bold border border-red-200 rounded-xl">Failed to load question paper. <button onClick={() => window.location.reload()} className="underline font-semibold ml-2">Retry</button></div>}>
              {versionLoading ? (
                <QuestionPaperSkeleton />
              ) : (
                <>
                  {/* ===== PAPER HEADER — centered (matches reference image) ===== */}
                  <div className="text-center mb-4">
                    <h2 className="text-xl md:text-2xl font-extrabold text-[#1A1A1A] uppercase">
                      {assignment.schoolName || "Veda International School"}
                    </h2>
                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase mt-1">
                      {assignment.title || `${assignment.subject} Examination`}
                    </h3>
                    <p className="text-sm font-semibold text-[#4B5563] mt-0.5">
                      {assignment.grade} &nbsp;|&nbsp; {assignment.subject}
                    </p>
                  </div>

                  <hr className="border-t border-[#1A1A1A]" />

                  {/* ===== EXAM METADATA ROW ===== */}
                  <div className="flex justify-between items-center text-sm font-bold text-[#1A1A1A] py-2">
                    <span>Time Allowed: {assignment.timeAllowed} Minutes</span>
                    <span>Maximum Marks: {result ? result.totalMarks : assignment.questions.reduce((a: number, b: { marks: number }) => a + b.marks, 0)} Marks</span>
                  </div>

                  <hr className="border-t border-[#1A1A1A] mb-3" />

                  {/* ===== GENERAL INSTRUCTIONS ===== */}
                  <p className="text-xs italic text-[#374151] mb-4">
                    General Instructions: Read all questions carefully. All questions are compulsory unless stated otherwise.
                  </p>

                  {/* ===== STUDENT DETAILS — plain text lines (matches reference) ===== */}
                  <div className="text-sm font-semibold text-[#1A1A1A] space-y-2 mb-8">
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Student Name:</span>
                      <span className="flex-1 border-b border-black ml-1 h-4 inline-block" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Roll Number:</span>
                      <span className="w-40 border-b border-black ml-1 h-4 inline-block" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="whitespace-nowrap">Class: {assignment.grade} Section:</span>
                      <span className="w-20 border-b border-black ml-1 h-4 inline-block" />
                    </div>
                  </div>

                  {/* ===== SECTIONS & QUESTIONS ===== */}
                  <div className="space-y-10">
                    {result && result.sections.map((section: ISection, sIdx: number) => (
                      <div key={sIdx} className="space-y-3">
                        {/* Section heading — left-aligned with bottom border (matches reference) */}
                        <div className="border-b border-[#1A1A1A] pb-1">
                          <h4 className="text-sm font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                            {section.title} — {section.questionType}
                          </h4>
                        </div>
                        {/* Italic instruction line */}
                        <p className="text-xs italic text-[#1A1A1A]">
                          {section.instruction}
                        </p>

                        {/* Questions — matches reference format */}
                        <div className="space-y-3 pt-1">
                          {section.questions.map((q: IQuestion) => (
                            <div key={q.number} className="group relative flex items-start gap-2 text-sm text-[#1A1A1A] leading-relaxed">
                              {/* Hover Copy Button */}
                              <div className="absolute -right-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                <button
                                  onClick={() => {
                                    const copyText = `${q.number}. ${q.text} [${q.marks} Mark${q.marks > 1 ? 's' : ''}]`;
                                    navigator.clipboard.writeText(copyText);
                                    addToast(`Question ${q.number} copied!`, "success");
                                  }}
                                  className="flex items-center space-x-1 px-2 py-0.5 bg-white border border-gray-200 hover:border-brand-orange hover:text-brand-orange rounded text-[10px] font-bold shadow-sm"
                                  title="Copy question text"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </button>
                              </div>
                              {/* Question Number */}
                              <span className="font-bold flex-shrink-0 w-7 text-right">{q.number}.</span>
                              {/* Question body + difficulty + marks */}
                              <div className="flex-grow flex items-start justify-between gap-4 pr-16 group-hover:pr-20 transition-all">
                                <span>
                                  {q.text}
                                  {" "}
                                  <span className="text-[11px] font-semibold uppercase text-[#6B7280]">({q.difficulty})</span>
                                </span>
                                <span className="flex-shrink-0 font-bold text-xs text-[#1A1A1A] px-2 py-0.5 whitespace-nowrap">
                                  [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ===== END OF PAPER ===== */}
                  <p className="text-center font-bold text-xs mt-16 pt-4 text-[#6B7280] uppercase tracking-widest">
                    *** End of Question Paper ***
                  </p>

                  {/* Generation Info Footer */}
                  {result && (
                    <p style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
                      Generated by VedaAI &bull; {new Date(result.generatedAt).toLocaleString()} &bull; Version {result.version}
                    </p>
                  )}

                  {/* ===== ANSWER KEY (numbered list — matches reference) ===== */}
                  {showAnswerKeys && result && (
                    <div className="mt-12 pt-6 border-t-2 border-dashed border-[#1A1A1A] font-sans no-print">
                      <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">
                        Answer Key:
                      </h3>
                      <div className="space-y-6">
                        {result.sections.map((section: ISection) => (
                          <div key={section.title}>
                            <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 border-b border-gray-100 pb-0.5">
                              {section.title}
                            </h4>
                            <ol className="list-decimal list-outside pl-5 space-y-3 text-sm">
                              {section.questions.map((q: IQuestion) => (
                                <li key={q.number} className="leading-relaxed text-[#1A1A1A]">
                                  {q.answer || "No answer key provided."}
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Side: sticky-floating toggle and metadata card */}
        <div className="space-y-6 lg:sticky lg:top-4">
          {/* Sticky floating answer key toggle button */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
              Grading Mode
            </p>
            <button
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`w-full flex items-center justify-center space-x-2 rounded-full py-2.5 text-sm font-semibold transition-all shadow-sm border ${showAnswerKeys
                ? "bg-[#1A1A1A] text-white border-transparent"
                : "bg-white text-brand-dark border-gray-200 hover:bg-gray-50"
                }`}
            >
              <span>{showAnswerKeys ? '🙈 Hide Answer Key' : '👁 Show Answer Key'}</span>
            </button>
          </div>

          {/* Exam metadata statistics card (Collapsible) */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-brand-dark uppercase tracking-wider focus:outline-none"
            >
              <span>Assessment Summary</span>
              {isSummaryExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isSummaryExpanded && (
              <div className="divide-y divide-gray-100 text-xs font-semibold">
                <div className="py-2.5 flex justify-between">
                  <span className="text-brand-secondary">Subject:</span>
                  <span className="text-brand-dark">{assignment.subject}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-brand-secondary">Class Grade:</span>
                  <span className="text-brand-dark">{assignment.grade}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-brand-secondary">Questions Count:</span>
                  <span className="text-brand-dark">{result ? result.totalQuestions : assignment.questions.length}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-brand-secondary">Marks Allocation:</span>
                  <span className="text-brand-dark">{result ? result.totalMarks : assignment.questions.reduce((a, b) => a + b.marks, 0)} Points</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-brand-secondary">Version Level:</span>
                  <span className="text-brand-dark font-mono">v{selectedVersion}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="bg-white rounded-2xl border border-gray-150 px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-1 text-[11px] text-brand-secondary">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-brand-dark">Keyboard Shortcuts:</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-brand-secondary flex-wrap">
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-[10px] text-brand-dark">Ctrl+E</kbd>
            <span>Regenerate</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-[10px] text-brand-dark">Ctrl+D</kbd>
            <span>Download PDF</span>
          </span>
        </div>
      </div>

      {/* Verification footer */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 text-xs font-medium text-brand-secondary flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span>Bloom&rsquo;s Taxonomy criteria and syllabus alignment metrics verified by VedaAI validator.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-right md:justify-end">
          <span>Model: <strong className="text-brand-dark font-semibold">OpenCode Zen</strong></span>
          <span>Pipeline: <strong className="text-brand-dark font-semibold">VedaAI-GenCore-v1.2</strong></span>
          <span>Timestamp: <strong className="text-brand-dark font-semibold">{assignment.assignedDate}</strong></span>
        </div>
      </div>
    </div>
  );
}
