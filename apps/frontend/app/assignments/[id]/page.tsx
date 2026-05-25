"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAssignmentStore, Assignment, Question } from "../../../store/useAssignmentStore";
import { 
  Download, 
  Copy, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  HelpCircle
} from "lucide-react";

export default function AssignmentDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const addAssignment = useAssignmentStore((state) => state.addAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);

  // Retrieve current assignment
  const assignment = assignments.find((a) => a.id === id);

  // States
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateLogs, setRegenerateLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "answers">("questions");

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (!assignment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier) return;

      const key = e.key.toLowerCase();
      if (key === "g") {
        e.preventDefault();
        handleRegenerate();
      } else if (key === "d") {
        e.preventDefault();
        handleDownloadPDF();
      } else if (key === "r") {
        e.preventDefault();
        handleCopyAllQuestions();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assignment, selectedVersion]);

  // If assignment is not found, render fallback/loading
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

  // Version Control: Get questions for current version (in simulation, we shuffle or modify questions)
  const getQuestionsForVersion = (): Question[] => {
    // If selected version is higher than 1, we simulate minor alterations or shuffling
    if (selectedVersion === 1) {
      return assignment.questions;
    }
    
    // Simulate modified questions for newer versions
    return assignment.questions.map((q, idx) => ({
      ...q,
      questionText: `[v${selectedVersion}] ${q.questionText}`,
      marks: q.marks + (idx % 2 === 0 ? 1 : 0)
    }));
  };

  const displayedQuestions = getQuestionsForVersion();

  // Action: PDF Download Simulation
  const handleDownloadPDF = () => {
    addToast("Exporting assessment as PDF document...", "info");
    setTimeout(() => {
      window.print();
      addToast("PDF generated successfully!", "success");
    }, 1000);
  };

  // Action: Copy All Questions
  const handleCopyAllQuestions = () => {
    const text = displayedQuestions
      .map((q, idx) => {
        const optionsText = q.options ? `\nOptions:\n` + q.options.map(o => `- ${o}`).join("\n") : "";
        return `${idx + 1}. [${q.type} - ${q.marks} Marks] ${q.questionText}${optionsText}`;
      })
      .join("\n\n");
      
    navigator.clipboard.writeText(text).then(() => {
      addToast("All questions copied to clipboard!", "success");
    }).catch(() => {
      addToast("Failed to copy questions.", "error");
    });
  };

  // Action: Copy Single Question
  const handleCopySingleQuestion = (q: Question, idx: number) => {
    const optionsText = q.options ? `\nOptions:\n` + q.options.map(o => `- ${o}`).join("\n") : "";
    const text = `Q${idx + 1}: ${q.questionText}${optionsText} (${q.marks} Marks)`;
    
    navigator.clipboard.writeText(text).then(() => {
      addToast(`Question ${idx + 1} copied to clipboard!`, "success");
    });
  };

  // Action: Regenerate (Bumps Version / Modifies Questions)
  const handleRegenerate = () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegenerateLogs(["Connecting to VedaAI pipeline...", "Analyzing layout constraint metrics..."]);

    // Simulated quick regeneration steps
    setTimeout(() => {
      setRegenerateLogs(prev => [...prev, "Re-shuffling question parameters...", "Verifying bloom taxonomy criteria..."]);
    }, 800);

    setTimeout(() => {
      const nextVer = (assignment.versionHistory?.length || 1) + 1;
      const updatedHistory = [
        ...(assignment.versionHistory || [{ version: 1, timestamp: new Date().toLocaleString(), questionsCount: assignment.questions.length }]),
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
      
      {/* Keyboard Shortcuts Hint Bar */}
      <div className="bg-orange-55/60 border border-orange-100 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-brand-dark gap-2">
        <span className="font-semibold flex items-center space-x-1">
          <HelpCircle className="w-4 h-4 text-brand-orange" />
          <span>Speed up your flow with keyboard shortcuts:</span>
        </span>
        <div className="flex items-center space-x-4">
          <span>Regenerate: <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono shadow-sm">Ctrl+G</kbd></span>
          <span>Download PDF: <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono shadow-sm">Ctrl+D</kbd></span>
          <span>Copy All: <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono shadow-sm">Ctrl+R</kbd></span>
        </div>
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

          {/* Regenerate Trigger */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold border border-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-orange-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
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
          
          {/* Tabs for Questions vs Answers */}
          <div className="flex border-b border-gray-250">
            <button
              onClick={() => {
                setActiveTab("questions");
                setShowAnswerKeys(false);
              }}
              className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${
                activeTab === "questions" 
                  ? "border-brand-orange text-brand-orange" 
                  : "border-transparent text-brand-secondary hover:text-brand-dark"
              }`}
            >
              Questions Paper
            </button>
            
            {assignment.includeAnswerKey && (
              <button
                onClick={() => {
                  setActiveTab("answers");
                  setShowAnswerKeys(true);
                }}
                className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${
                  activeTab === "answers" 
                    ? "border-brand-orange text-brand-orange" 
                    : "border-transparent text-brand-secondary hover:text-brand-dark"
                }`}
              >
                Marking Guide & Answers
              </button>
            )}
          </div>

          {/* Exam Paper Sheet */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-10 shadow-sm print:shadow-none print:border-none space-y-8">
            
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
                <div className="p-2 bg-gray-50 rounded">Total Marks: {displayedQuestions.reduce((a, b) => a + b.marks, 0)} Pts</div>
                <div className="p-2 bg-gray-50 rounded">Due Date: {assignment.dueDate}</div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {displayedQuestions.map((q, idx) => {
                // Determine difficulty badge colors
                let difficultyColor = "bg-green-50 text-green-700 border-green-200";
                let diffLevel = "Easy";
                
                if (idx % 3 === 1) {
                  difficultyColor = "bg-amber-50 text-amber-700 border-amber-200";
                  diffLevel = "Moderate";
                } else if (idx % 3 === 2) {
                  difficultyColor = "bg-red-50 text-red-700 border-red-200";
                  diffLevel = "Hard";
                }

                return (
                  <div
                    key={q.id}
                    className="group relative p-4 rounded-xl border border-gray-150 hover:border-brand-orange hover:bg-orange-50/5 transition-all space-y-3"
                  >
                    
                    {/* Hover Copy Button */}
                    <button
                      onClick={() => handleCopySingleQuestion(q, idx)}
                      className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 border border-gray-200 p-1.5 rounded-lg text-gray-500 hover:text-brand-orange"
                      title="Copy Question"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-start justify-between pr-8">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          Q{idx + 1}
                        </span>
                        
                        {/* Difficulty badge */}
                        <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${difficultyColor}`}>
                          {diffLevel}
                        </span>

                        <span className="text-[10px] bg-orange-50 text-brand-orange border border-orange-100 font-bold px-2 py-0.5 rounded-full">
                          {q.type}
                        </span>
                      </div>
                      
                      <span className="text-xs font-bold text-brand-orange">
                        [{q.marks} Pts]
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-brand-dark leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* Question Options for MCQ */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="flex items-center space-x-2 p-2 bg-gray-50 border border-gray-150 rounded-lg text-xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-white border border-gray-250 flex items-center justify-center font-bold text-[10px] text-brand-secondary">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="text-brand-dark">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collapsible Answer Key Details */}
                    {showAnswerKeys && q.answerKey && (
                      <div className="mt-4 p-3 bg-green-50/30 border border-green-150 rounded-lg space-y-1">
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                          Correct Answer / Explanation
                        </p>
                        <p className="text-xs font-semibold text-green-900 leading-relaxed">
                          {q.answerKey}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Answer Key Toggle Indicator Section */}
            {assignment.includeAnswerKey && (
              <div className="border-t border-gray-150 pt-4 flex justify-between items-center text-xs">
                <span className="text-brand-secondary font-medium">
                  {showAnswerKeys ? "Explanations & Answer guidelines are active" : "Answer guide is collapsed"}
                </span>
                <button
                  onClick={() => setShowAnswerKeys(!showAnswerKeys)}
                  className="flex items-center space-x-1 text-brand-orange font-bold hover:underline"
                >
                  <span>{showAnswerKeys ? "Hide Answer Guide" : "View Answer Guide"}</span>
                  {showAnswerKeys ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Widget Summary chart */}
        <div className="space-y-6">
          
          {/* Difficulty Summary Chart Widget */}
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
                style={{ width: `${assignment.difficulty.moderate}%` }}
                title={`Moderate: ${assignment.difficulty.moderate}%`}
              />
              <div 
                className="bg-red-500 h-full hover:brightness-105 transition-all cursor-pointer" 
                style={{ width: `${assignment.difficulty.hard}%` }}
                title={`Hard: ${assignment.difficulty.hard}%`}
              />
            </div>

            {/* Badge Labels & Stats */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-green-700">
                  <span className="w-3 h-3 rounded bg-green-500" />
                  <span>Easy</span>
                </span>
                <span className="text-brand-dark">{assignment.difficulty.easy}%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-amber-600">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span>Moderate</span>
                </span>
                <span className="text-brand-dark">{assignment.difficulty.moderate}%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-red-600">
                  <span className="w-3 h-3 rounded bg-red-500" />
                  <span>Hard</span>
                </span>
                <span className="text-brand-dark">{assignment.difficulty.hard}%</span>
              </div>
            </div>
          </div>

          {/* Exam metadata statistics card */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
              Assessment Summary
            </h4>
            
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
                <span className="text-brand-dark">{displayedQuestions.length}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-brand-secondary">Marks Allocation:</span>
                <span className="text-brand-dark">{displayedQuestions.reduce((a, b) => a + b.marks, 0)} Points</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-brand-secondary">Version Level:</span>
                <span className="text-brand-dark font-mono">v{selectedVersion}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
