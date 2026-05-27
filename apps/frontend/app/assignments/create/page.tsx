"use client";

import React, { useState, useEffect } from "react";
import { useAssignmentStore, QuestionRow } from "../../../store/useAssignmentStore";
import { ErrorBoundary } from "../../../components/common/ErrorBoundary";
import { GenerationProgress } from "../../../components/common/GenerationProgress";
import {
  Upload,
  Trash2,
  Plus,
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  School,
  BookOpen,
  Calendar,
  ChevronDown
} from "lucide-react";
import axios from "axios";
import { Step2SettingsSkeleton } from "../../../components/Skeletons";
import { z } from "zod";
import { useRouter } from "next/navigation";

const step1Schema = z.object({
  dueDate: z.string().min(1, 'Due date is required'),
  questionTypes: z
    .array(
      z.object({
        type: z.string().min(1, 'Question type is required'),
        count: z.number().min(1, 'Minimum 1 question').max(50),
        marksPerQuestion: z.number().min(1, 'Minimum 1 mark').max(20),
      })
    )
    .min(1, 'Add at least one question type'),
  additionalInstructions: z.string().optional(),
});

const step2Schema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  className: z.string().min(1, 'Class is required'),
  schoolName: z.string().min(1, 'School name is required'),
  timeAllowed: z.number().min(15, 'Minimum 15 minutes').max(240),
  difficultyDistribution: z
    .object({ easy: z.number(), medium: z.number(), hard: z.number() })
    .refine((d) => d.easy + d.medium + d.hard === 100, 'Must sum to 100%'),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CreateAssignmentPage() {
  const activeStep = useAssignmentStore((state) => state.activeStep);
  const formData = useAssignmentStore((state) => state.formData);
  const setFormData = useAssignmentStore((state) => state.setFormData);
  const addQuestionRow = useAssignmentStore((state) => state.addQuestionRow);
  const removeQuestionRow = useAssignmentStore((state) => state.removeQuestionRow);
  const updateQuestionRow = useAssignmentStore((state) => state.updateQuestionRow);
  const setActiveStep = useAssignmentStore((state) => state.setActiveStep);
  const resetForm = useAssignmentStore((state) => state.resetForm);
  const currentJob = useAssignmentStore((state) => state.currentJob);
  const setCurrentJob = useAssignmentStore((state) => state.setCurrentJob);
  const addToast = useAssignmentStore((state) => state.addToast);

  const router = useRouter();

  // Local state variables
  const [isDragActive, setIsDragActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [countdown, setCountdown] = useState(150);

  // Keyboard shortcut Ctrl+G to trigger generation/next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (activeStep === 2) {
          handleSubmit();
        } else {
          handleNextStep();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, formData]);

  // Countdown timer while job is processing
  useEffect(() => {
    if (!currentJob || currentJob.status !== "processing") return;
    setCountdown(150);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentJob?.status]);

  // Load defaults
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/settings`);
        if (res.data) {
          setFormData({
            schoolName: formData.schoolName || res.data.schoolName || "Delhi Public School",
            timeAllowed: formData.timeAllowed === 60 ? (res.data.defaultTimeAllowed || 60) : formData.timeAllowed,
            includeAnswerKey: res.data.includeAnswerKeyDefault !== false,
            difficulty: res.data.defaultDifficulty === "easy"
              ? { easy: 60, medium: 30, hard: 10 }
              : res.data.defaultDifficulty === "hard"
                ? { easy: 10, medium: 30, hard: 60 }
                : { easy: 30, medium: 50, hard: 20 }
          });
        }
      } catch (err) {
        console.warn("Could not load settings on create form mount. Checking cache.");
        const cached = localStorage.getItem("veda_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          setFormData({
            schoolName: formData.schoolName || parsed.schoolName || "Delhi Public School",
            timeAllowed: formData.timeAllowed === 60 ? (parsed.defaultTimeAllowed || 60) : formData.timeAllowed,
            includeAnswerKey: parsed.includeAnswerKeyDefault !== false,
            difficulty: parsed.defaultDifficulty === "easy"
              ? { easy: 60, medium: 30, hard: 10 }
              : parsed.defaultDifficulty === "hard"
                ? { easy: 10, medium: 30, hard: 60 }
                : { easy: 30, medium: 50, hard: 20 }
          });
        } else {
          if (!formData.schoolName) {
            setFormData({ schoolName: "Delhi Public School" });
          }
        }
      } finally {
        setTimeout(() => {
          setLoadingSettings(false);
        }, 600);
      }
    };
    loadDefaults();
  }, []);

  // File drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ["application/pdf", "text/plain", "image/png", "image/jpeg"];
      if (!validTypes.includes(file.type)) {
        addToast("Unsupported file type. Please upload PDF, TXT, PNG or JPG.", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast("File is too large. Maximum size is 10MB.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFormData({
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            base64: reader.result as string
          }
        });
        addToast(`File "${file.name}" uploaded successfully!`, "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        addToast("File is too large. Maximum size is 10MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData({
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            base64: reader.result as string
          }
        });
        addToast(`File "${file.name}" uploaded successfully!`, "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Speech Recognition Handler
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addToast("Web Speech recognition not supported in this browser.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      addToast("Listening... Speak the details of your exam.", "info");
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setFormData({
        voicePrompt: formData.voicePrompt
          ? `${formData.voicePrompt} ${speechToText}`
          : speechToText
      });
      addToast("Voice prompt appended!", "success");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      addToast(`Voice Error: ${event.error}`, "error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Auto-balancing sliders step 2
  const handleDifficultyChange = (key: "easy" | "medium" | "hard", val: number) => {
    const otherKeys = (["easy", "medium", "hard"] as const).filter(k => k !== key);
    const diff = 100 - val;
    const otherSum = formData.difficulty[otherKeys[0]] + formData.difficulty[otherKeys[1]];

    let newVals = { ...formData.difficulty, [key]: val };

    if (otherSum === 0) {
      newVals[otherKeys[0]] = Math.round(diff / 2);
      newVals[otherKeys[1]] = diff - newVals[otherKeys[0]];
    } else {
      newVals[otherKeys[0]] = Math.round((formData.difficulty[otherKeys[0]] / otherSum) * diff);
      newVals[otherKeys[1]] = diff - newVals[otherKeys[0]];
    }

    setFormData({ difficulty: newVals });
  };

  // Math Totals
  const totalQuestions = formData.questionRows.reduce((sum, r) => sum + r.count, 0);
  const totalMarks = formData.questionRows.reduce((sum, r) => sum + (r.count * r.marksPerQuestion), 0);

  // Steppers boundaries
  const adjustCount = (id: string, step: number) => {
    const row = formData.questionRows.find(r => r.id === id);
    if (!row) return;
    const newVal = Math.max(1, Math.min(50, row.count + step));
    updateQuestionRow(id, { count: newVal });
  };

  const adjustMarks = (id: string, step: number) => {
    const row = formData.questionRows.find(r => r.id === id);
    if (!row) return;
    const newVal = Math.max(1, Math.min(20, row.marksPerQuestion + step));
    updateQuestionRow(id, { marksPerQuestion: newVal });
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const dataToParse = {
      dueDate: formData.dueDate,
      questionTypes: formData.questionRows.map(r => ({
        type: r.type,
        count: r.count,
        marksPerQuestion: r.marksPerQuestion
      })),
      additionalInstructions: formData.voicePrompt
    };

    const result = step1Schema.safeParse(dataToParse);
    if (!result.success) {
      addToast(result.error.errors[0].message, "error");
      return false;
    }

    if (!formData.file && !formData.voicePrompt.trim()) {
      addToast("Please upload a study material file or provide a text/voice prompt description.", "error");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setActiveStep(2);
    }
  };

  // Submit assessment Generation
  const handleSubmit = async () => {
    const dataToParse = {
      subject: formData.subject,
      className: formData.grade,
      schoolName: formData.schoolName,
      timeAllowed: formData.timeAllowed,
      difficultyDistribution: formData.difficulty
    };

    const result = step2Schema.safeParse(dataToParse);
    if (!result.success) {
      addToast(result.error.errors[0].message, "error");
      return;
    }

    setCurrentJob({
      id: `pending_${Date.now()}`,
      status: "processing",
      progress: 2,
      logs: ["Connecting to VedaAI generation server..."]
    });

    try {
      const res = await axios.post(`${API_URL}/api/assignments`, {
        formData
      }, { timeout: 15000 });

      if (res.data && res.data.assignment && res.data.assignment._id) {
        const backendId = res.data.assignment._id;
        setCurrentJob({
          id: backendId,
          status: "processing",
          progress: 8,
          logs: [
            "Connecting to VedaAI generation server...",
            `Assessment queued on server (ID: ${backendId.slice(-8)})`,
            "Initializing question generation pipeline..."
          ]
        });
        addToast("Assessment job registered on server.", "info");
      } else {
        throw new Error(`Unexpected server response: ${JSON.stringify(res.data)}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[CreatePage] Backend API error:", errMsg);
      addToast(`Server error: ${errMsg}. Running offline simulation.`, "error");

      const jobId = `offline_${Date.now()}`;
      setCurrentJob({
        id: jobId,
        status: "processing",
        progress: 5,
        logs: [
          "Server unreachable — running offline simulation mode.",
          "Initializing offline assessment generator..."
        ]
      });
    }
  };

  if (currentJob && currentJob.status === "processing") {
    return (
      <ErrorBoundary fallback={<div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-150 p-8 text-center text-red-600 font-bold">Generation status unavailable.</div>}>
        <GenerationProgress countdown={countdown} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-150 p-8 text-center text-red-600 font-bold">Create Page Error</div>}>

      {/* ----------------- DESKTOP VIEW (lg and above) ----------------- */}
      <div className="hidden lg:flex flex-col w-full max-w-[1103px] mx-auto h-[calc(100vh-120px)] relative overflow-hidden font-sans animate-fadeIn">
        {/* Title & Progress Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center space-x-3 mb-1">
            {/* Active Green Dot */}
            <div className="w-3.5 h-3.5 rounded-full bg-[#4BC26D] shadow-sm animate-pulse" />
            <h1 className="text-[28px] font-bold font-bricolage text-brand-dark tracking-tight leading-none">Create Assignment</h1>
          </div>
          <p className="text-xs text-brand-secondary pl-[26px]">Set up a new assignment for your students</p>

          {/* Two-part Progress Bar */}
          <div className="mt-5 pl-[26px] pr-4 flex items-center gap-1.5">
            <div className={`h-1.5 rounded-l-full flex-grow transition-all duration-300 ${activeStep >= 1 ? "bg-[#4D4D4D]" : "bg-[#D9D9D9]"}`} />
            <div className={`h-1.5 rounded-r-full flex-grow transition-all duration-300 ${activeStep >= 2 ? "bg-[#4D4D4D]" : "bg-[#D9D9D9]"}`} />
          </div>
        </div>

        {/* Main Card Wrapper (Frame 1984077325: Unified visual white bg card, 40px rounded corners) */}
        <div className="flex-grow bg-white rounded-[40px] border border-gray-200/60 shadow-[0px_4px_24px_rgba(0,0,0,0.02)] overflow-hidden relative flex flex-col mb-4">

          {/* Card Body - Independently Scrollable */}
          <div className="flex-grow overflow-y-auto p-10 pb-[100px] space-y-8">

            {activeStep === 1 ? (
              /* --- Step 1 Desktop Content --- */
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-bold text-brand-dark font-bricolage">Assignment Details</h2>
                  <p className="text-xs text-brand-secondary">Basic information about your assignment</p>
                </div>

                {/* Ordered Layout: File Upload Dashed Selector FIRST */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                    Curriculum Documents
                  </label>

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-[20px] p-6 flex flex-col items-center justify-center text-center transition-all min-h-[140px] ${formData.file
                      ? "border-green-200 bg-green-50/20"
                      : isDragActive
                        ? "border-brand-orange bg-orange-50/15"
                        : "border-[#CCCCCC] bg-[#FAFAFA] shadow-xs hover:border-brand-orange"
                      }`}
                  >
                    <input
                      type="file"
                      id="desktop-file-upload"
                      onChange={handleFileChange}
                      accept=".pdf,.txt,.png,.jpg,.jpeg"
                      className="hidden"
                    />

                    {formData.file ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-brand-dark truncate max-w-[400px]">
                            {formData.file.name}
                          </p>
                          <p className="text-[10px] text-brand-secondary">
                            {(formData.file.size / 1024).toFixed(1)} KB • Click to replace file
                          </p>
                        </div>
                        <label
                          htmlFor="desktop-file-upload"
                          className="text-xs font-bold text-brand-orange hover:underline cursor-pointer ml-6"
                        >
                          Change File
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="desktop-file-upload" className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-brand-gray shadow-xs border border-gray-200 mb-1">
                          <Upload className="w-5 h-5 text-brand-gray stroke-[2]" />
                        </div>
                        <p className="text-sm font-bold text-brand-dark">
                          Choose a file or drag & drop it here
                        </p>
                        <p className="text-[10px] text-brand-secondary font-medium">
                          JPEG, PNG, upto 10MB
                        </p>
                        <div className="px-5 py-1.5 bg-[#F2F2F2] border border-gray-200 rounded-full text-[11px] font-semibold text-brand-dark hover:bg-gray-100 active:scale-95 transition-all shadow-xs mt-1">
                          Browse Files
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-brand-secondary text-center mt-1">
                    Upload images of your preferred document/image
                  </p>
                </div>

                {/* Ordered Layout: Due Date Input SECOND */}
                <div className="space-y-2 max-w-md">
                  <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                    Due Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-semibold text-brand-dark cursor-pointer shadow-xs"
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-brand-secondary leading-normal">
                    Students must submit their responses by this calendar date.
                  </p>
                </div>

                {/* Ordered Layout: Questions blueprint builder THIRD */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                      Question Blueprints
                    </label>
                  </div>

                  {/* Blueprint Rows (Horizontal Row-wise styling) */}
                  <div className="space-y-3.5">
                    {formData.questionRows.map((row: QuestionRow) => (
                      <div
                        key={row.id}
                        className="flex flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all shadow-xs animate-fadeIn"
                      >
                        <div className="flex items-center gap-2 flex-grow">
                          {/* Dropdown Type Selector */}
                          <div className="relative flex-grow max-w-[340px]">
                            <select
                              value={row.type}
                              onChange={(e) => updateQuestionRow(row.id, { type: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-orange text-xs font-semibold text-brand-dark appearance-none pr-8 cursor-pointer shadow-xs"
                            >
                              <option value="MCQ">Multiple Choice Questions</option>
                              <option value="Short Answer">Short Questions</option>
                              <option value="Diagram/Graph-Based Questions">Diagram/Graph-Based Questions</option>
                              <option value="Numerical Problems">Numerical Problems</option>
                              <option value="Long Answer">Long Answer</option>
                              <option value="True/False">True / False</option>
                              <option value="Fill in the Blanks">Fill in the Blanks</option>
                              <option value="Essay Questions">Essay Questions</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                          </div>

                          {/* Delete button next to select dropdown */}
                          <button
                            type="button"
                            onClick={() => removeQuestionRow(row.id)}
                            disabled={formData.questionRows.length <= 1}
                            className="text-gray-400 hover:text-red-500 font-sans text-xl font-bold px-2 disabled:opacity-20 transition-all active:scale-90"
                          >
                            ×
                          </button>
                        </div>

                        {/* Stepper pills in grey capsules row-wise */}
                        <div className="flex items-center gap-4">
                          {/* Count Stepper */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. of Questions</span>
                            <div className="inline-flex items-center bg-[#F2F2F2] rounded-full px-2.5 py-1 gap-2 border border-gray-150/40 w-[72px] justify-between shadow-inner">
                              <button
                                type="button"
                                onClick={() => adjustCount(row.id, -1)}
                                className="w-5.5 h-5.5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                              >
                                -
                              </button>
                              <span className="font-bold text-brand-dark text-xs">{row.count}</span>
                              <button
                                type="button"
                                onClick={() => adjustCount(row.id, 1)}
                                className="w-5.5 h-5.5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Marks Stepper */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Marks</span>
                            <div className="inline-flex items-center bg-[#F2F2F2] rounded-full px-2.5 py-1 gap-2 border border-gray-150/40 w-[72px] justify-between shadow-inner">
                              <button
                                type="button"
                                onClick={() => adjustMarks(row.id, -1)}
                                className="w-5.5 h-5.5 flex items-center justify-center rounded-full hover:bg-gray-250 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                              >
                                -
                              </button>
                              <span className="font-bold text-brand-dark text-xs">{row.marksPerQuestion}</span>
                              <button
                                type="button"
                                onClick={() => adjustMarks(row.id, 1)}
                                className="w-5.5 h-5.5 flex items-center justify-center rounded-full hover:bg-gray-250 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add button and Totals */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={addQuestionRow}
                      className="flex items-center space-x-3 text-sm font-bold text-brand-dark hover:opacity-80 active:scale-95 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
                        <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                      </div>
                      <span className="text-xs font-bold text-brand-dark">Add Question Type</span>
                    </button>

                    <div className="flex flex-col items-end gap-1 text-right">
                      <div className="text-sm text-brand-secondary font-medium">Total Questions : <span className="font-bold text-brand-dark">{totalQuestions}</span></div>
                      <div className="text-sm text-brand-secondary font-medium">Total Marks : <span className="font-bold text-brand-dark">{totalMarks}</span></div>
                    </div>
                  </div>
                </div>

                {/* Additional Information outline box */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">Additional Information (For better output)</label>
                  <div className="relative border border-dashed border-gray-300 rounded-[16px] p-1 bg-[#FAFAFA] hover:border-gray-400 transition-all shadow-xs">
                    <textarea
                      value={formData.voicePrompt}
                      onChange={(e) => setFormData({ voicePrompt: e.target.value })}
                      placeholder="e.g Generate a question paper for 3 hour exam duration.."
                      rows={4}
                      className="w-full bg-transparent p-4 pr-16 text-sm focus:outline-none resize-none font-medium text-brand-dark"
                    />
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`absolute bottom-4 right-4 p-2.5 rounded-full transition-all ${isListening
                        ? "bg-red-50 text-red-500 border border-red-200 animate-pulse"
                        : "text-gray-400 hover:text-brand-orange bg-white shadow-xs border border-gray-150 active:scale-90"
                        }`}
                    >
                      {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* --- Step 2 Desktop Content --- */
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-bold text-brand-dark font-bricolage">Assessment Settings</h2>
                  <p className="text-xs text-brand-secondary">Configure defaults and difficulty metrics</p>
                </div>

                {loadingSettings ? (
                  <Step2SettingsSkeleton />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Subject Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ subject: e.target.value })}
                          className="w-full px-4 py-3 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange font-semibold text-brand-dark cursor-pointer appearance-none pr-10 shadow-xs"
                        >
                          <option value="">-- Choose Subject --</option>
                          <option value="Science">Science (Biology/Physics)</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="English">English Literature</option>
                          <option value="History">History & Social Studies</option>
                          <option value="Geography">Geography</option>
                        </select>
                      </div>

                      {/* Class Grade Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                          Class / Grade
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) => setFormData({ grade: e.target.value })}
                          className="w-full px-4 py-3 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange font-semibold text-brand-dark cursor-pointer appearance-none pr-10 shadow-xs"
                        >
                          <option value="">-- Choose Grade --</option>
                          <option value="Class 8">Class 8</option>
                          <option value="Grade 9">Grade 9</option>
                          <option value="Class 10">Class 10</option>
                          <option value="Grade 11">Grade 11</option>
                          <option value="Grade 12">Grade 12</option>
                        </select>
                      </div>

                      {/* School Name input */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block flex items-center space-x-1">
                          <School className="w-3.5 h-3.5 text-gray-400" />
                          <span>School Name Prefill</span>
                        </label>
                        <input
                          type="text"
                          value={formData.schoolName}
                          onChange={(e) => setFormData({ schoolName: e.target.value })}
                          className="w-full px-4 py-3 bg-[#FAFAFA] border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange font-semibold text-brand-dark shadow-xs"
                          placeholder="Delhi Public School"
                        />
                      </div>
                    </div>

                    {/* Time Limit & Toggle switch */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Time allowed */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>Time Allowed (Minutes)</span>
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="15"
                            max="180"
                            step="15"
                            value={formData.timeAllowed}
                            onChange={(e) => setFormData({ timeAllowed: parseInt(e.target.value) })}
                            className="flex-grow accent-brand-orange cursor-pointer"
                          />
                          <span className="w-22 px-3 py-2 border border-gray-200 rounded-xl text-center text-xs font-bold text-brand-dark bg-[#FAFAFA] shadow-xs">
                            {formData.timeAllowed} min
                          </span>
                        </div>
                      </div>

                      {/* Answer Key Toggle Switch */}
                      <div className="flex items-center justify-between p-4 bg-[#FAFAFA] border border-gray-200 rounded-2xl shadow-xs">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-brand-dark">Include Complete Answer Key</p>
                          <p className="text-[10px] text-brand-secondary">Generate reference explanations for grading.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.includeAnswerKey}
                            onChange={(e) => setFormData({ includeAnswerKey: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                        </label>
                      </div>
                    </div>

                    {/* Difficulty balancing */}
                    <div className="space-y-4 p-5 border border-gray-150 rounded-2xl bg-white shadow-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                          Difficulty Balance
                        </label>
                        <div className="text-xs font-bold text-brand-orange bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full shadow-xs">
                          Sum: {formData.difficulty.easy + formData.difficulty.medium + formData.difficulty.hard}%
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Easy */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-green-600">Easy Questions</span>
                            <span className="font-bold text-brand-dark">{formData.difficulty.easy}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.difficulty.easy}
                            onChange={(e) => handleDifficultyChange("easy", parseInt(e.target.value))}
                            className="w-full accent-green-500 cursor-pointer"
                          />
                        </div>

                        {/* Medium */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-amber-500">Medium Questions</span>
                            <span className="font-bold text-brand-dark">{formData.difficulty.medium}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.difficulty.medium}
                            onChange={(e) => handleDifficultyChange("medium", parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Hard */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-red-500">Hard Questions</span>
                            <span className="font-bold text-brand-dark">{formData.difficulty.hard}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.difficulty.hard}
                            onChange={(e) => handleDifficultyChange("hard", parseInt(e.target.value))}
                            className="w-full accent-red-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Locked Translucent Bottom Bar (aligned matching rounded-b-[40px]) */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[73px] rounded-b-[40px] border-t border-gray-200/40 px-8 flex items-center justify-between pointer-events-auto z-20"
            style={{
              background: "linear-gradient(176.12deg, rgba(234, 234, 234, 0) 3.17%, rgba(218, 218, 218, 0.35) 81.22%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)"
            }}
          >
            {/* Previous button */}
            <button
              type="button"
              onClick={activeStep === 1 ? () => router.push("/assignments") : () => setActiveStep(1)}
              className="px-6 py-2 bg-white border border-gray-250 hover:bg-gray-55 text-brand-dark font-semibold rounded-full text-xs flex items-center space-x-2 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-brand-dark" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={activeStep === 1 ? handleNextStep : handleSubmit}
              className="px-6 py-2 bg-[#181818] hover:bg-black text-white font-bold rounded-full text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95"
            >
              <span>{activeStep === 1 ? "Next" : "Generate"}</span>
              {activeStep === 2 && <span className="text-[9px] border border-white/30 rounded px-1 opacity-70">Ctrl+G</span>}
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>


      {/* ----------------- MOBILE VIEW (smaller than lg) ----------------- */}
      <div className="flex lg:hidden flex-col w-full max-w-[393px] mx-auto relative font-sans animate-fadeIn pb-[110px]">
        {/* Mobile Header (Frame 1984077205) */}
        <div
          className="w-full h-[81px] flex flex-row items-center justify-between px-5 pointer-events-auto mt-[8px] rounded-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.01)",
            backdropFilter: "blur(0px)",
            WebkitBackdropFilter: "blur(0px)"
          }}
        >
          {/* Back Circular Button */}
          <button
            type="button"
            onClick={activeStep === 1 ? () => router.push("/assignments") : () => setActiveStep(1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-150 flex items-center justify-center hover:bg-gray-55 active:scale-90 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-brand-dark" />
          </button>

          {/* Mobile Title */}
          <h2 className="text-[20px] font-bold text-brand-dark font-bricolage flex-grow text-center tracking-tight pr-6">
            Create Assignment
          </h2>
        </div>

        {/* Mobile Two-part Progress Bar */}
        <div className="w-full px-5 mt-2 flex items-center gap-1">
          <div className={`h-1 rounded-l-full flex-grow transition-all duration-300 ${activeStep >= 1 ? "bg-[#4D4D4D]" : "bg-[#D9D9D9]"}`} />
          <div className={`h-1 rounded-r-full flex-grow transition-all duration-300 ${activeStep >= 2 ? "bg-[#4D4D4D]" : "bg-[#D9D9D9]"}`} />
        </div>

        {/* Scrollable Container (Frame 1984077582) */}
        <div className="w-full px-3 mt-6 space-y-6 flex flex-col">

          {activeStep === 1 ? (
            /* --- Step 1 Mobile Content --- */
            <div className="bg-white border border-gray-150 rounded-[28px] p-6 space-y-6 shadow-sm animate-fadeIn">

              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A] font-bricolage leading-none">Assignment Details</h3>
                <p className="text-[10px] text-brand-secondary mt-1">Basic information about your assignment</p>
              </div>

              {/* Ordered Layout: File Upload Dashed Container FIRST */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed rounded-[20px] p-4 flex flex-col items-center justify-center text-center transition-all ${formData.file
                  ? "border-green-250 bg-green-50/10"
                  : isDragActive
                    ? "border-brand-orange bg-orange-50/15"
                    : "border-[#CCCCCC] bg-[#FAFAFA] shadow-xs"
                  }`}
              >
                <input
                  type="file"
                  id="mobile-file-upload"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />

                {formData.file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-brand-dark truncate max-w-[220px]">
                        {formData.file.name}
                      </p>
                      <p className="text-[9px] text-brand-secondary">
                        {(formData.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <label
                      htmlFor="mobile-file-upload"
                      className="text-[11px] font-bold text-brand-orange hover:underline cursor-pointer"
                    >
                      Change File
                    </label>
                  </div>
                ) : (
                  <label htmlFor="mobile-file-upload" className="cursor-pointer flex flex-col items-center gap-1 w-full">
                    <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-brand-gray shadow-xs border border-gray-200 mb-1">
                      <Upload className="w-4.5 h-4.5 text-brand-gray" />
                    </div>
                    <p className="text-xs font-bold text-[#1A1A1A]">
                      Choose a file or drag & drop it here
                    </p>
                    <p className="text-[9px] text-brand-secondary">
                      JPEG, PNG, upto 10MB
                    </p>
                    <div className="px-4 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-brand-dark active:scale-95 transition-all mt-1 shadow-xs">
                      Browse Files
                    </div>
                  </label>
                )}
              </div>
              <p className="text-[10px] text-brand-secondary text-center leading-none">
                Upload images of your preferred document/image
              </p>

              {/* Ordered Layout: Due Date box SECOND */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                  Due Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-orange font-bold text-brand-dark cursor-pointer shadow-xs"
                  />
                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Ordered Layout: Question Types Blueprint Row-wise THIRD */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                  Question Type
                </label>

                <div className="space-y-3">
                  {formData.questionRows.map((row: QuestionRow) => (
                    <div
                      key={row.id}
                      className="flex flex-row items-center justify-between gap-2.5 p-3.5 bg-white rounded-2xl border border-gray-150 shadow-xs animate-fadeIn"
                    >
                      {/* Dropdown Type Selector */}
                      <div className="relative flex-grow min-w-[120px]">
                        <select
                          value={row.type}
                          onChange={(e) => updateQuestionRow(row.id, { type: e.target.value })}
                          className="w-full pl-2 pr-6 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-orange text-[10px] font-semibold text-brand-dark appearance-none pr-8 cursor-pointer"
                        >
                          <option value="MCQ">Multiple Choice Questions</option>
                          <option value="Short Answer">Short Questions</option>
                          <option value="Diagram/Graph-Based Questions">Diagram/Graph Questions</option>
                          <option value="Numerical Problems">Numerical Problems</option>
                          <option value="Long Answer">Long Answer</option>
                          <option value="True/False">True / False</option>
                          <option value="Fill in the Blanks">Fill in the Blanks</option>
                          <option value="Essay Questions">Essay Questions</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeQuestionRow(row.id)}
                        disabled={formData.questionRows.length <= 1}
                        className="text-gray-400 hover:text-red-500 font-sans text-xl font-bold p-1 disabled:opacity-20 transition-all active:scale-75"
                      >
                        ×
                      </button>

                      {/* No. of Questions Stepper capsule */}
                      <div className="inline-flex items-center bg-[#F2F2F2] rounded-full px-2 py-1 gap-1.5 border border-gray-150/40 w-[64px] justify-between shadow-inner flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustCount(row.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold text-brand-dark text-xs">{row.count}</span>
                        <button
                          type="button"
                          onClick={() => adjustCount(row.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Marks Stepper capsule */}
                      <div className="inline-flex items-center bg-[#F2F2F2] rounded-full px-2 py-1 gap-1.5 border border-gray-150/40 w-[64px] justify-between shadow-inner flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustMarks(row.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold text-brand-dark text-xs">{row.marksPerQuestion}</span>
                        <button
                          type="button"
                          onClick={() => adjustMarks(row.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 active:scale-75 font-bold text-gray-400 text-xs transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add button & totals for mobile */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={addQuestionRow}
                    className="flex items-center space-x-2 text-xs font-bold text-brand-dark hover:opacity-80 active:scale-95 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shadow-xs">
                      <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    </div>
                    <span>Add Question Type</span>
                  </button>

                  <div className="flex flex-col items-end gap-0.5 text-right font-sans text-xs">
                    <div className="text-brand-secondary font-medium">Total Questions : <span className="font-bold text-brand-dark">{totalQuestions}</span></div>
                    <div className="text-brand-secondary font-medium">Total Marks : <span className="font-bold text-brand-dark">{totalMarks}</span></div>
                  </div>
                </div>
              </div>

              {/* Textarea outline prompt */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">Additional Information (For better output)</label>
                <div className="relative border border-dashed border-gray-300 rounded-[18px] p-0.5 bg-[#FAFAFA] shadow-xs">
                  <textarea
                    value={formData.voicePrompt}
                    onChange={(e) => setFormData({ voicePrompt: e.target.value })}
                    placeholder="e.g Generate a question paper for 3 hour exam duration.."
                    rows={4}
                    className="w-full bg-transparent p-3 pr-12 text-xs focus:outline-none resize-none font-semibold text-brand-dark"
                  />
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${isListening
                      ? "bg-red-50 text-red-500 animate-pulse border border-red-250"
                      : "text-gray-400 bg-white border border-gray-150 shadow-xs active:scale-80"
                      }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* --- Step 2 Mobile Content --- */
            <div className="bg-white border border-gray-150 rounded-[28px] p-6 space-y-6 shadow-sm animate-fadeIn">

              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A] font-bricolage leading-none">Assessment Settings</h3>
                <p className="text-[10px] text-brand-secondary mt-1">Configure parameters and difficulty</p>
              </div>

              {loadingSettings ? (
                <Step2SettingsSkeleton />
              ) : (
                <div className="space-y-4">
                  {/* Subject select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ subject: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-orange font-bold text-brand-dark shadow-xs"
                    >
                      <option value="">-- Choose Subject --</option>
                      <option value="Science">Science (Biology/Physics)</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English">English Literature</option>
                      <option value="History">History & Social Studies</option>
                      <option value="Geography">Geography</option>
                    </select>
                  </div>

                  {/* Class grade select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Class / Grade
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ grade: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-orange font-bold text-brand-dark shadow-xs"
                    >
                      <option value="">-- Choose Grade --</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>

                  {/* School prefill */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-gray-400" />
                      <span>School Name Prefill</span>
                    </label>
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ schoolName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-orange font-bold text-brand-dark shadow-xs"
                      placeholder="Delhi Public School"
                    />
                  </div>

                  {/* Time allowed */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Time Allowed</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="15"
                        max="180"
                        step="15"
                        value={formData.timeAllowed}
                        onChange={(e) => setFormData({ timeAllowed: parseInt(e.target.value) })}
                        className="flex-grow accent-brand-orange"
                      />
                      <span className="w-18 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-xs font-bold text-brand-dark bg-white shadow-xs">
                        {formData.timeAllowed}m
                      </span>
                    </div>
                  </div>

                  {/* Complete Answer Key toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] border border-gray-150 rounded-2xl shadow-xs">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-brand-dark">Include Answer Key</p>
                      <p className="text-[9px] text-brand-secondary">Generate reference explanations.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.includeAnswerKey}
                        onChange={(e) => setFormData({ includeAnswerKey: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-orange"></div>
                    </label>
                  </div>

                  {/* Difficulty sliders */}
                  <div className="space-y-3.5 p-3.5 border border-gray-150 rounded-2xl bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <label className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider block">
                        Difficulty Balance
                      </label>
                      <div className="text-[10px] font-bold text-brand-orange bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                        {formData.difficulty.easy + formData.difficulty.medium + formData.difficulty.hard}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Easy */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-green-600">Easy</span>
                          <span className="font-bold text-brand-dark">{formData.difficulty.easy}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.difficulty.easy}
                          onChange={(e) => handleDifficultyChange("easy", parseInt(e.target.value))}
                          className="w-full accent-green-500"
                        />
                      </div>

                      {/* Medium */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-amber-500">Medium</span>
                          <span className="font-bold text-brand-dark">{formData.difficulty.medium}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.difficulty.medium}
                          onChange={(e) => handleDifficultyChange("medium", parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Hard */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-red-500">Hard</span>
                          <span className="font-bold text-brand-dark">{formData.difficulty.hard}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.difficulty.hard}
                          onChange={(e) => handleDifficultyChange("hard", parseInt(e.target.value))}
                          className="w-full accent-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Floating Mobile Bottom Action Overlay (placed fixed at bottom-0, above the suppressed global bottom bar) */}
        <div
          className="fixed bottom-0 left-0 right-0 h-[82px] pb-[16px] px-6 py-4 flex items-center justify-between gap-4 pointer-events-auto border-t border-gray-200/40 z-30"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)"
          }}
        >
          {/* Previous button */}
          <button
            type="button"
            onClick={activeStep === 1 ? () => router.push("/assignments") : () => setActiveStep(1)}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-brand-dark font-bold rounded-full text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-brand-dark" />
            <span>Previous</span>
          </button>

          {/* Next / Generate */}
          <button
            type="button"
            onClick={activeStep === 1 ? handleNextStep : handleSubmit}
            className="flex-1 py-2.5 bg-[#181818] text-white font-bold rounded-full text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform"
          >
            <span>{activeStep === 1 ? "Next" : "Generate"}</span>
            {activeStep === 2 && <span className="text-[9px] border border-white/30 rounded px-1 opacity-70">Ctrl+G</span>}
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

    </ErrorBoundary>
  );
}
