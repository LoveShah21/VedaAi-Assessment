import { create } from "zustand";

export interface QuestionRow {
  id: string;
  type: string;
  count: number;
  marksPerQuestion: number;
}

export interface AssignmentFormData {
  file: { name: string; size: number; type: string; base64?: string } | null;
  dueDate: string;
  questionRows: QuestionRow[];
  voicePrompt: string;
  subject: string;
  grade: string;
  schoolName: string;
  timeAllowed: number;
  difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeAnswerKey: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface AssignmentJob {
  id: string;
  status: "idle" | "processing" | "completed" | "failed";
  progress: number;
  logs: string[];
}

export interface Question {
  id: string;
  type: string;
  questionText: string;
  options?: string[];
  marks: number;
  answerKey?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  assignedDate: string;
  schoolName?: string;
  timeAllowed: number;
  difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  questions: Question[];
  includeAnswerKey: boolean;
  version: number;
  status?: string;
  versionHistory?: {
    version: number;
    timestamp: string;
    questionsCount: number;
  }[];
}

export interface AssignmentStore {
  activeStep: number;
  formData: AssignmentFormData;
  setFormData: (data: Partial<AssignmentFormData>) => void;
  resetForm: () => void;
  setActiveStep: (step: number) => void;
  addQuestionRow: () => void;
  removeQuestionRow: (id: string) => void;
  updateQuestionRow: (id: string, updates: Partial<QuestionRow>) => void;
  currentJob: AssignmentJob | null;
  setCurrentJob: (job: Partial<AssignmentJob> | null) => void;
  updateJobProgress: (progress: number, log?: string) => void;
  assignments: Assignment[];
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;
  deleteAssignment: (id: string) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const initialFormData: AssignmentFormData = {
  file: null,
  dueDate: "",
  questionRows: [{ id: "1", type: "MCQ", count: 5, marksPerQuestion: 2 }],
  voicePrompt: "",
  subject: "",
  grade: "",
  schoolName: "Veda International School",
  timeAllowed: 60,
  difficulty: {
    easy: 50,
    medium: 30,
    hard: 20,
  },
  includeAnswerKey: true,
};

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  activeStep: 1,
  formData: initialFormData,
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  resetForm: () =>
    set({
      formData: initialFormData,
      activeStep: 1,
    }),
  setActiveStep: (step) => set({ activeStep: step }),
  addQuestionRow: () =>
    set((state) => {
      const nextId = (
        Math.max(...state.formData.questionRows.map((r) => parseInt(r.id) || 0)) + 1
      ).toString();
      return {
        formData: {
          ...state.formData,
          questionRows: [
            ...state.formData.questionRows,
            { id: nextId, type: "MCQ", count: 5, marksPerQuestion: 2 },
          ],
        },
      };
    }),
  removeQuestionRow: (id) =>
    set((state) => ({
      formData: {
        ...state.formData,
        questionRows: state.formData.questionRows.filter((r) => r.id !== id),
      },
    })),
  updateQuestionRow: (id, updates) =>
    set((state) => ({
      formData: {
        ...state.formData,
        questionRows: state.formData.questionRows.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      },
    })),
  currentJob: null,
  setCurrentJob: (job) =>
    set((state) => ({
      currentJob: job
        ? {
            id: job.id || state.currentJob?.id || "",
            status: job.status || "idle",
            progress: job.progress ?? state.currentJob?.progress ?? 0,
            logs: job.logs || state.currentJob?.logs || [],
          }
        : null,
    })),
  updateJobProgress: (progress, log) =>
    set((state) => {
      if (!state.currentJob) return {};
      return {
        currentJob: {
          ...state.currentJob,
          progress,
          logs: log ? [...state.currentJob.logs, log] : state.currentJob.logs,
          status: progress >= 100 ? "completed" : state.currentJob.status,
        },
      };
    }),
  assignments: [],
  setAssignments: (assignments) => set({ assignments }),
  addAssignment: (assignment) =>
    set((state) => {
      const filtered = state.assignments.filter((a) => a.id !== assignment.id);
      return { assignments: [...filtered, assignment] };
    }),
  deleteAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    })),
  toasts: [],
  addToast: (message, type = "success") =>
    set((state) => {
      const id = Math.random().toString(36).substring(2, 9);
      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      }, 4000);
      return {
        toasts: [...state.toasts, { id, message, type }],
      };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
