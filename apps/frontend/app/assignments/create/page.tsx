"use client";

import React, { useState } from "react";
import { useAssignmentStore, QuestionRow } from "../../../store/useAssignmentStore";
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
  BookOpen
} from "lucide-react";
import axios from "axios";

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

  // Local state variables
  const [isDragActive, setIsDragActive] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // File Upload Handlers
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
      
      // Simulate file reading/storage
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

  // Speech Recognition Interfaces
  interface SpeechRecognitionResultEvent {
    results: {
      [key: number]: {
        [key: number]: {
          transcript: string;
        };
      };
    };
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }

  interface SpeechRecognitionInstance {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    onstart: () => void;
    onresult: (event: SpeechRecognitionResultEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
  }

  // Speech Recognition Handler
  const startSpeechRecognition = () => {
    const SpeechRecognition = 
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

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

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const speechToText = event.results[0][0].transcript;
      setFormData({ 
        voicePrompt: formData.voicePrompt 
          ? `${formData.voicePrompt} ${speechToText}` 
          : speechToText 
      });
      addToast("Voice prompt appended!", "success");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech error:", event.error);
      addToast(`Voice Error: ${event.error}`, "error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Auto-balancing Sliders Logic
  const handleDifficultyChange = (key: "easy" | "moderate" | "hard", val: number) => {
    const otherKeys = (["easy", "moderate", "hard"] as const).filter(k => k !== key);
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

  // Math totals calculation
  const totalQuestions = formData.questionRows.reduce((sum, r) => sum + r.count, 0);
  const totalMarks = formData.questionRows.reduce((sum, r) => sum + (r.count * r.marksPerQuestion), 0);

  // Steppers controls
  const adjustCount = (id: string, step: number) => {
    const row = formData.questionRows.find(r => r.id === id);
    if (!row) return;
    const newVal = Math.max(1, row.count + step);
    updateQuestionRow(id, { count: newVal });
  };

  const adjustMarks = (id: string, step: number) => {
    const row = formData.questionRows.find(r => r.id === id);
    if (!row) return;
    const newVal = Math.max(1, row.marksPerQuestion + step);
    updateQuestionRow(id, { marksPerQuestion: newVal });
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.dueDate) {
      addToast("Please select a due date.", "error");
      return false;
    }
    if (formData.questionRows.length === 0) {
      addToast("Please add at least one question type row.", "error");
      return false;
    }
    // Check that there is context
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

  // Submit Generation Request
  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      addToast("Please select or enter a Subject.", "error");
      return;
    }
    if (!formData.grade.trim()) {
      addToast("Please select or enter a Class/Grade.", "error");
      return;
    }
    if (!formData.schoolName.trim()) {
      addToast("School name is required.", "error");
      return;
    }
    if (formData.timeAllowed <= 0) {
      addToast("Time allowed must be greater than 0 minutes.", "error");
      return;
    }

    // Set Job processing to true
    const jobId = `job_${Date.now()}`;
    setCurrentJob({
      id: jobId,
      status: "processing",
      progress: 0,
      logs: ["Submitting parameters to generation pipeline..."]
    });

    try {
      // Post details to backend API (Mock payload or real endpoint)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      await axios.post(`${apiUrl}/api/assignments`, {
        jobId,
        formData
      });
      addToast("Assessment job registered on server.", "info");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("Backend API not reachable. Running on offline simulator:", errMsg);
      // Simulating job progress is handled in hook fallback. So no extra code needed here!
    }
  };

  // Generation Loading State view (PAGE D)
  if (currentJob && currentJob.status === "processing") {
    // Determine active checkpoint based on progress
    const getCheckpointClass = (minProgress: number) => {
      if (currentJob.progress >= minProgress) return "text-brand-orange border-brand-orange bg-orange-50 font-bold";
      return "text-gray-400 border-gray-200 bg-white";
    };

    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-150 p-8 md:p-12 shadow-sm font-sans flex flex-col items-center justify-center space-y-8 my-10">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-orange-50 rounded-full text-brand-orange border border-orange-100 animate-pulseSlow">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-brand-dark">Generating Assessment</h3>
          <p className="text-sm text-brand-secondary">
            VedaAI is building a syllabus-aligned exam. This might take a minute.
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-brand-dark">
            <span>Progress Status</span>
            <span>{currentJob.progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-brand-orange to-[#ff7d4d] transition-all duration-500 ease-out" 
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>
        </div>

        {/* Step checkpoints tracker */}
        <div className="w-full grid grid-cols-3 gap-2 text-center text-xs">
          <div className="flex flex-col items-center space-y-1.5">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(15)}`}>
              1
            </div>
            <span className="font-medium text-brand-dark">Reading File</span>
          </div>
          <div className="flex flex-col items-center space-y-1.5">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(55)}`}>
              2
            </div>
            <span className="font-medium text-brand-dark">Drafting Qs</span>
          </div>
          <div className="flex flex-col items-center space-y-1.5">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(90)}`}>
              3
            </div>
            <span className="font-medium text-brand-dark">Answer Key</span>
          </div>
        </div>

        {/* Terminal Logs Box */}
        <div className="w-full bg-brand-dark text-gray-250 p-4 rounded-xl text-[11px] font-mono h-40 overflow-y-auto border border-gray-800 shadow-inner flex flex-col space-y-1">
          {currentJob.logs.map((log, index) => (
            <div key={index} className="flex items-start">
              <span className="text-brand-orange mr-1.5">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
          {/* Scroll target */}
          <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
        </div>

        <div className="text-[11px] text-brand-secondary flex items-center space-x-1 justify-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          <span>Realtime generator pipeline active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden font-sans">
      
      {/* Step Tracker Header */}
      <div className="bg-gray-50 border-b border-gray-150 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-sm">
            {activeStep}
          </div>
          <div>
            <h3 className="font-bold text-brand-dark">
              {activeStep === 1 ? "Configure Questions & Prompt" : "Configure Parameters & Settings"}
            </h3>
            <p className="text-xs text-brand-secondary">
              {activeStep === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center space-x-1.5">
          <div className={`w-3 h-3 rounded-full ${activeStep === 1 ? "bg-brand-orange" : "bg-gray-200"}`} />
          <div className={`w-3 h-3 rounded-full ${activeStep === 2 ? "bg-brand-orange" : "bg-gray-200"}`} />
        </div>
      </div>

      {activeStep === 1 ? (
        /* STEP 1 FORM */
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Due date and Upload row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Due Date Input Card */}
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-semibold"
                />
              </div>
              <p className="text-[10px] text-brand-secondary">
                Students must submit by this day.
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Curriculum Documents (Optional)
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                  formData.file 
                    ? "border-green-250 bg-green-50/20" 
                    : isDragActive 
                    ? "border-brand-orange bg-orange-50/20" 
                    : "border-gray-200 hover:border-brand-orange bg-gray-55"
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />
                
                {formData.file ? (
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-brand-dark truncate max-w-[200px]">
                        {formData.file.name}
                      </p>
                      <p className="text-[10px] text-brand-secondary">
                        {(formData.file.size / 1024).toFixed(1)} KB • Click to replace
                      </p>
                    </div>
                    <label
                      htmlFor="file-upload"
                      className="text-xs font-semibold text-brand-orange hover:underline cursor-pointer ml-4"
                    >
                      Change
                    </label>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer space-y-1">
                    <Upload className="w-6 h-6 text-brand-orange mx-auto stroke-[1.5]" />
                    <p className="text-xs font-semibold text-brand-dark">
                      Drag file here or <span className="text-brand-orange hover:underline">browse</span>
                    </p>
                    <p className="text-[9px] text-brand-secondary">
                      Supports PDF, TXT, PNG, JPG (Max 5MB)
                    </p>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Question Builder Row Dynamic Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Question Blueprints
              </label>
              <div className="text-xs font-semibold text-brand-secondary flex items-center space-x-3">
                <span>Total Qs: <strong className="text-brand-dark">{totalQuestions}</strong></span>
                <span>Total Marks: <strong className="text-brand-orange">{totalMarks}</strong></span>
              </div>
            </div>

            {/* Questions Table */}
            <div className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-brand-secondary font-semibold">
                    <th className="px-4 py-3">Question Type</th>
                    <th className="px-4 py-3 text-center">Count</th>
                    <th className="px-4 py-3 text-center">Marks Per Question</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.questionRows.map((row: QuestionRow) => (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <select
                          value={row.type}
                          onChange={(e) => updateQuestionRow(row.id, { type: e.target.value })}
                          className="px-2 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-brand-orange"
                        >
                          <option value="MCQ">Multiple Choice (MCQ)</option>
                          <option value="Short Answer">Short Answer</option>
                          <option value="Long Answer">Long Answer / Essay</option>
                          <option value="True/False">True / False</option>
                        </select>
                      </td>

                      {/* Count Stepper */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => adjustCount(row.id, -1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 border border-gray-200 rounded font-bold text-brand-dark"
                          >
                            -
                          </button>
                          <span className="w-6 font-semibold text-brand-dark">{row.count}</span>
                          <button
                            type="button"
                            onClick={() => adjustCount(row.id, 1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 border border-gray-200 rounded font-bold text-brand-dark"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Marks Stepper */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => adjustMarks(row.id, -1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 border border-gray-200 rounded font-bold text-brand-dark"
                          >
                            -
                          </button>
                          <span className="w-6 font-semibold text-brand-dark">{row.marksPerQuestion}</span>
                          <button
                            type="button"
                            onClick={() => adjustMarks(row.id, 1)}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-100 border border-gray-200 rounded font-bold text-brand-dark"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right font-semibold text-brand-dark">
                        {row.count * row.marksPerQuestion} pts
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeQuestionRow(row.id)}
                          disabled={formData.questionRows.length <= 1}
                          className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addQuestionRow}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-brand-orange hover:bg-orange-50 border border-orange-200 rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question Row</span>
            </button>
          </div>

          {/* Voice Input Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Exam Outline & Specific Instructions
              </label>
              <button
                type="button"
                onClick={startSpeechRecognition}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isListening
                    ? "bg-red-50 text-red-500 border-red-200 animate-pulse"
                    : "bg-orange-50 text-brand-orange border-orange-200 hover:bg-orange-100"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice Input</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={formData.voicePrompt}
              onChange={(e) => setFormData({ voicePrompt: e.target.value })}
              placeholder="e.g. Create a biology quiz focused on Cell Division and Mitochondria. Include practical questions on chromosome counts during mitosis..."
              rows={4}
              className="w-full p-3.5 bg-gray-55 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20"
            />
          </div>

          {/* Nav buttons */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 bg-brand-dark hover:bg-black text-white font-semibold rounded-lg text-sm flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <span>Settings & Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      ) : (
        /* STEP 2 FORM */
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Prefill School, Class, Subject */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Subject Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Subject
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ subject: e.target.value })}
                className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
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
                className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
              >
                <option value="">-- Choose Grade --</option>
                <option value="Class 8">Class 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            {/* School Name Prefill */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block flex items-center space-x-1">
                <School className="w-3.5 h-3.5 text-gray-400" />
                <span>School Name Prefill</span>
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ schoolName: e.target.value })}
                className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-semibold"
                placeholder="Veda International School"
              />
            </div>
          </div>

          {/* Time Limit Allowed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Time Allowed (Minutes)</span>
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="15"
                  value={formData.timeAllowed}
                  onChange={(e) => setFormData({ timeAllowed: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-orange"
                />
                <span className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-center text-sm font-bold text-brand-dark bg-gray-50">
                  {formData.timeAllowed} min
                </span>
              </div>
            </div>

            {/* Answer Key Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-150 rounded-xl">
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

          {/* Difficulty Sliders Auto-Balancing */}
          <div className="space-y-4 p-4 border border-gray-150 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                Difficulty Balance
              </label>
              <div className="text-xs font-semibold text-brand-orange bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                Sum: {formData.difficulty.easy + formData.difficulty.moderate + formData.difficulty.hard}%
              </div>
            </div>

            <div className="space-y-4">
              {/* Easy Slider */}
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
                  className="w-full accent-green-500"
                />
              </div>

              {/* Moderate Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-amber-500">Moderate Questions</span>
                  <span className="font-bold text-brand-dark">{formData.difficulty.moderate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.difficulty.moderate}
                  onChange={(e) => handleDifficultyChange("moderate", parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Hard Slider */}
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
                  className="w-full accent-red-500"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="px-4 py-2 border border-gray-250 hover:bg-gray-50 text-brand-dark font-semibold rounded-lg text-sm flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-sm flex items-center space-x-1.5 transition-all shadow-md shadow-orange-500/10"
            >
              <Sparkles className="w-4.5 h-4.5" />
              <span>Generate Assessment</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
