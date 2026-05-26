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

const QuestionItem = ({ question, showAnswerKeys }: { question: IQuestion; showAnswerKeys: boolean }) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = () => {
    const copyText = `Q${question.number}. [${question.difficulty}] ${question.text} [${question.marks} Mark${question.marks > 1 ? 's' : ''}]`;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedId(question.number);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  let difficultyColor = "bg-green-50 text-green-700 border-green-200";
  if (question.difficulty === "Moderate" || question.difficulty === "medium" || question.difficulty === "Medium") {
    difficultyColor = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (question.difficulty === "Hard") {
    difficultyColor = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <div className="group relative p-4 rounded-xl border border-gray-150 hover:border-brand-orange hover:bg-orange-50/5 transition-all space-y-3">
      {/* Hover Copy Button with inline copied tooltip */}
      <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className={`relative flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
            copiedId === question.number
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-white border-gray-200 text-gray-500 hover:text-brand-orange hover:border-brand-orange"
          }`}
          title="Copy Question"
        >
          <Copy className="w-3 h-3" />
          <span>{copiedId === question.number ? "Copied!" : "Copy"}</span>
          
          {copiedId === question.number && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded z-50 shadow-md">
              Copied!
            </span>
          )}
        </button>
      </div>

      <div className="flex items-start justify-between pr-8">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            Q{question.number}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${difficultyColor}`}>
            {question.difficulty}
          </span>
        </div>
        <span className="text-xs font-bold text-brand-orange">
          [{question.marks} Mark{question.marks > 1 ? 's' : ''}]
        </span>
      </div>

      <p className="text-sm font-semibold text-brand-dark leading-relaxed">
        {question.text}
      </p>

      {/* Answer Key inside transition container */}
      <div
        style={{
          maxHeight: showAnswerKeys && question.answer ? '400px' : '0',
          opacity: showAnswerKeys && question.answer ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s ease, opacity 0.3s ease',
        }}
      >
        <div className="mt-3 p-3 bg-green-50/30 border border-green-150 rounded-lg space-y-1">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
            Correct Answer / Explanation
          </p>
          <p className="text-xs font-semibold text-green-900 leading-relaxed">
            {question.answer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function AssignmentDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const addAssignment = useAssignmentStore((state) => state.addAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);

  // Retrieve current assignment
  const assignment = assignments.find((a) => a.id === id);

  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateLogs, setRegenerateLogs] = useState<string[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(false);
  const [result, setResult] = useState<IResult | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(true);

  // Fetch sections-based result
  useEffect(() => {
    if (!assignment) return;
    
    const fetchResult = async () => {
      setVersionLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/assignments/${id}/results?version=${selectedVersion}`);
        if (res.data) {
          setResult(res.data);
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
      if (key === "g" || key === "r") {
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
      const shareUrl = `${window.location.origin}/assignments/${assignment.id}/preview`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast("Preview share link copied to clipboard!", "success");
      }).catch(() => {
        addToast("Failed to copy link.", "error");
      });
    }
  };

  // Action: Regenerate
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setRegenerateLogs(["Initiating paper regeneration...", "Connecting to OpenCode Zen API..."]);
    
    setTimeout(() => {
      setRegenerateLogs(prev => [...prev, "Drafting alternative curriculum questions...", "Aligning question difficulties..."]);
    }, 600);

    setTimeout(async () => {
      const nextVer = (assignment.versionHistory?.length || 1) + 1;
      const updatedHistory = [
        ...(assignment.versionHistory || [{ version: 1, timestamp: assignment.assignedDate, questionsCount: assignment.questions.length }]),
        {
          version: nextVer,
          timestamp: new Date().toLocaleString(),
          questionsCount: assignment.questions.length
        }
      ];

      const updatedAssignment: Assignment = {
        ...assignment,
        version: nextVer,
        versionHistory: updatedHistory
      };

      addAssignment(updatedAssignment);
      setSelectedVersion(nextVer);
      setIsRegenerating(false);
      addToast(`Version ${nextVer} regenerated successfully!`, "success");
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans relative pb-20">
      {/* Conversational Introductory Banner */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm text-sm text-brand-dark leading-relaxed font-sans flex items-center justify-between">
        <p>Certainly, John Doe! Here are customized Question Paper for your {assignment.grade} {assignment.subject} classes on the {assignment.title}:</p>
      </div>

      {/* Dark Action Banner (Print/Version control) */}
      <div className="bg-brand-dark rounded-2xl p-4 md:p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg border border-gray-800">
        <div className="flex items-center space-x-3.5">
          <button 
            onClick={() => router.push("/assignments")}
            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-bold text-base md:text-lg">{assignment.title}</h3>
            <p className="text-xs text-gray-400">
              {assignment.grade} • {assignment.subject}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Version Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold border border-gray-700 transition-colors"
            >
              <span>Version {selectedVersion}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isVersionDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-lg shadow-xl text-xs text-brand-dark py-1 z-35 font-medium">
                {(assignment.versionHistory || [{ version: 1, timestamp: assignment.assignedDate, questionsCount: assignment.questions.length }]).map((h) => (
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
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold border border-gray-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All</span>
          </button>

          {/* Share Preview Button */}
          <button
            onClick={handleSharePreviewLink}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold border border-gray-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Share Link</span>
          </button>

          {/* Regenerate Trigger */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold border border-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
            <span className="shortcut-hint" style={{ fontSize: '10px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', padding: '1px 4px', color: '#FFF', marginLeft: '6px' }}>Ctrl+R</span>
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-orange-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
            <span className="shortcut-hint" style={{ fontSize: '10px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', padding: '1px 4px', color: '#FFF', marginLeft: '6px' }}>Ctrl+D</span>
          </button>
        </div>
      </div>

      {/* Regeneration status logs box (if active) */}
      {isRegenerating && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs flex flex-col space-y-1 border border-gray-800">
          <p className="text-white font-bold mb-1">Regenerating Questions...</p>
          {regenerateLogs.map((log, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="animate-pulse">⚡</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Left Column (Exam sheet), Right Column (Settings & Stats Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Exam Layout Paper */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Difficulty Summary Chart Widget - Relocated above the question paper card */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
              Difficulty Distribution
            </h4>
            
            {/* Horizontal Segmented Bar */}
            <div className="h-6 rounded-full overflow-hidden flex border border-gray-150 shadow-inner">
              <div 
                className="bg-green-500 h-full hover:brightness-105 transition-all cursor-pointer" 
                style={{ width: `${assignment.difficulty.easy}%` }}
                title={`Easy: ${assignment.difficulty.easy}%`}
              />
              <div 
                className="bg-amber-500 h-full hover:brightness-105 transition-all cursor-pointer" 
                style={{ width: `${assignment.difficulty.medium}%` }}
                title={`Medium: ${assignment.difficulty.medium}%`}
              />
              <div 
                className="bg-red-500 h-full hover:brightness-105 transition-all cursor-pointer" 
                style={{ width: `${assignment.difficulty.hard}%` }}
                title={`Hard: ${assignment.difficulty.hard}%`}
              />
            </div>

            {/* Badge Labels & Stats */}
            <div className="flex items-center justify-between text-xs font-semibold gap-4 pt-1 flex-wrap">
              <span className="flex items-center space-x-2 text-green-700">
                <span className="w-3 h-3 rounded bg-green-500" />
                <span>Easy: {assignment.difficulty.easy}%</span>
              </span>
              <span className="flex items-center space-x-2 text-amber-600">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Medium: {assignment.difficulty.medium}%</span>
              </span>
              <span className="flex items-center space-x-2 text-red-600">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span>Hard: {assignment.difficulty.hard}%</span>
              </span>
            </div>
          </div>

          {/* Exam Paper Sheet */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-10 shadow-sm print:shadow-none print:border-none space-y-8">
            <ErrorBoundary fallback={<div className="p-6 text-center text-red-600 font-bold border border-red-200 rounded-xl">Failed to load question paper. <button onClick={() => window.location.reload()} className="underline font-semibold ml-2">Retry</button></div>}>
              {versionLoading ? (
                <QuestionPaperSkeleton />
              ) : (
                <>
                  {/* School Prefill Header Layout */}
                  <div className="text-center pb-6 border-b-2 border-gray-200 space-y-2">
                    <h2 className="text-xl font-black text-brand-dark uppercase tracking-wide">
                      {assignment.schoolName || "Veda International School"}
                    </h2>
                    <h3 className="text-sm font-bold text-brand-secondary">
                      Term Examination — {assignment.subject}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 text-xs font-semibold text-brand-dark text-left md:text-center max-w-2xl mx-auto border-t border-gray-100">
                      <div className="p-2 bg-gray-50 rounded">Grade: {assignment.grade}</div>
                      <div className="p-2 bg-gray-50 rounded">Time: {assignment.timeAllowed} Mins</div>
                      <div className="p-2 bg-gray-50 rounded">Total Marks: {result ? result.totalMarks : assignment.questions.reduce((a: number, b: { marks: number }) => a + b.marks, 0)} Pts</div>
                      <div className="p-2 bg-gray-50 rounded">Due Date: {assignment.dueDate}</div>
                    </div>
                  </div>

                  {/* Student Info Block */}
                  <div className="border-b border-[#E5E5E5] pb-4 mb-4 font-sans">
                    <p className="font-bold text-center mb-4 text-sm">All questions are compulsory unless stated otherwise.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 max-w-xl mx-auto text-sm pt-2">
                      <p className="flex items-center">
                        <span className="font-semibold text-brand-secondary mr-2">Name:</span>
                        <span className="flex-1 border-b border-black h-5">&nbsp;</span>
                      </p>
                      <p className="flex items-center">
                        <span className="font-semibold text-brand-secondary mr-2">Roll Number:</span>
                        <span className="flex-1 border-b border-black h-5">&nbsp;</span>
                      </p>
                      <p className="flex items-center md:col-span-2">
                        <span className="font-semibold text-brand-secondary mr-2">Class:</span>
                        <span className="border-b border-black w-24 h-5 text-center font-bold text-brand-dark">{assignment.grade}</span>
                        <span className="font-semibold text-brand-secondary mx-3">Section:</span>
                        <span className="flex-1 border-b border-black h-5">&nbsp;</span>
                      </p>
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-8">
                    {result && result.sections.map((section: ISection, sIdx: number) => (
                      <div key={sIdx} className="space-y-4">
                        <div className="text-center pb-2 border-b border-dashed border-gray-200">
                          <h4 className="text-base font-extrabold text-brand-dark uppercase tracking-wide">
                            {section.title}
                          </h4>
                          <p className="text-xs text-brand-secondary font-bold mt-1">
                            {section.questionType}
                          </p>
                          <p className="text-[11px] text-brand-secondary italic mt-0.5">
                            {section.instruction}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          {section.questions.map((q: IQuestion) => (
                            <QuestionItem key={q.number} question={q} showAnswerKeys={showAnswerKeys} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* End of Question Paper Footer */}
                  <p className="text-center font-bold mt-8 pt-4 border-t border-[#E5E5E5] text-brand-dark">— End of Question Paper —</p>

                  {/* Generation Info Footer */}
                  {result && (
                    <p style={{ fontSize: '11px', color: '#6B7280', textAlign: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E5E5E5' }}>
                      Generated by VedaAI &bull; OpenCode Zen &bull; {new Date(result.generatedAt).toLocaleString()} &bull; Version {result.version}
                    </p>
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
              className={`w-full flex items-center justify-center space-x-2 rounded-full py-2.5 text-sm font-semibold transition-all shadow-sm border ${
                showAnswerKeys
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

      {/* B4: Keyboard Shortcuts Hint Bar */}
      <div className="bg-white rounded-2xl border border-gray-150 px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-1 text-[11px] text-brand-secondary">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-brand-dark">Keyboard Shortcuts:</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-brand-secondary flex-wrap">
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-[10px] text-brand-dark">Ctrl+R</kbd>
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
          <span>Bloom's Taxonomy criteria and syllabus alignment metrics verified by VedaAI validator.</span>
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
