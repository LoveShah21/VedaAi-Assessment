import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAssignmentStore, Assignment } from "../store/useAssignmentStore";
import { useRouter } from "next/navigation";
import axios from "axios";

// Helper to map backend assignment structure to frontend structure
const mapBackendAssignmentToFrontend = (backendAss: any): Assignment => {
  return {
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
    questions: [], // Loaded from results on details page
    includeAnswerKey: backendAss.includeAnswerKey,
    version: backendAss.version || 1,
    status: backendAss.status,
    versionHistory: backendAss.versionHistory && backendAss.versionHistory.length > 0
      ? backendAss.versionHistory
      : [{ version: 1, timestamp: new Date(backendAss.createdAt).toLocaleString(), questionsCount: 0 }]
  };
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function useWebSocket() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const currentJob = useAssignmentStore((state) => state.currentJob);
  const updateJobProgress = useAssignmentStore((state) => state.updateJobProgress);
  const setCurrentJob = useAssignmentStore((state) => state.setCurrentJob);
  const addToast = useAssignmentStore((state) => state.addToast);
  const addAssignment = useAssignmentStore((state) => state.addAssignment);

  useEffect(() => {
    if (!currentJob || currentJob.status !== "processing") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Check if simulation mode is active or this is a client-side offline job
    const shouldSimulate = process.env.NEXT_PUBLIC_SIMULATE === "true" || 
                           SOCKET_URL.includes("mock") ||
                           currentJob.id.startsWith("offline_");

    if (shouldSimulate) {
      console.log("Starting local socket simulation for job:", currentJob.id);
      
      const simulationLogs = [
        "Initializing VedaAI generator parser...",
        "Analyzing uploaded prompt context and documents...",
        "Extracting relevant knowledge topics from material...",
        "Drafting Multiple Choice Questions (Section A)...",
        "Validating MCQs key alignment and bloom's taxonomy...",
        "Drafting Short Answer Questions (Section B)...",
        "Synthesizing structured marking guide...",
        "Compiling school test header and page configurations...",
        "Running validation suite on generated questions...",
        "Finalizing VedaAI assessment document..."
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (step >= simulationLogs.length) {
          clearInterval(interval);
          
          // Generate a mockup assignment
          const mockupAssignment: Assignment = {
            id: currentJob.id,
            title: `Assessment on Biology & Cell Division`,
            subject: "Science",
            grade: "Class 10",
            dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
            assignedDate: new Date().toLocaleDateString(),
            timeAllowed: 60,
            difficulty: { easy: 40, medium: 40, hard: 20 },
            includeAnswerKey: true,
            version: 1,
            versionHistory: [
              { version: 1, timestamp: new Date().toLocaleString(), questionsCount: 5 }
            ],
            questions: [
              {
                id: "q1",
                type: "MCQ",
                questionText: "Which organelle is known as the powerhouse of the cell?",
                options: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"],
                marks: 2,
                answerKey: "Mitochondria"
              },
              {
                id: "q2",
                type: "MCQ",
                questionText: "What is the primary function of chlorophyll in plants?",
                options: ["Absorb light", "Store water", "Release oxygen", "Support stem"],
                marks: 2,
                answerKey: "Absorb light"
              },
              {
                id: "q3",
                type: "Short Answer",
                questionText: "Explain the difference between mitosis and meiosis in brief.",
                marks: 5,
                answerKey: "Mitosis produces two genetically identical diploid somatic cells. Meiosis produces four genetically diverse haploid gamete cells for sexual reproduction."
              },
              {
                id: "q4",
                type: "True/False",
                questionText: "Plant cells possess a cell wall, whereas animal cells do not.",
                options: ["True", "False"],
                marks: 1,
                answerKey: "True"
              },
              {
                id: "q5",
                type: "Long Answer",
                questionText: "Describe the process of photosynthesis, detailing the light-dependent and light-independent reactions.",
                marks: 10,
                answerKey: "Light-dependent reactions occur in the thylakoid membranes, converting solar energy to chemical energy (ATP/NADPH). Light-independent (Calvin cycle) reactions occur in the stroma, using carbon dioxide and chemical energy to synthesize glucose."
              }
            ]
          };

          addAssignment(mockupAssignment);
          addToast("Assessment generated successfully (Simulated)!", "success");
          setCurrentJob(null);
          router.push(`/assignments/${mockupAssignment.id}`);
        } else {
          const progress = Math.min(Math.round(((step + 1) / simulationLogs.length) * 100), 99);
          updateJobProgress(progress, simulationLogs[step]);
          step++;
        }
      }, 1500);

      return () => {
        clearInterval(interval);
      };
    }

    // Connect to Socket.IO server
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket.IO connected, joining job room:", currentJob.id);
      socket.emit("join-job", currentJob.id);
      updateJobProgress(5, "Connected to generator server...");
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection failed, falling back to simulated generation:", err.message);
      // Fallback to simulation mode if backend socket fails
      addToast("Server offline. Running in offline generation mode.", "info");
      
      const simulationLogs = [
        "Initializing offline generator parser...",
        "Analyzing prompt context & generating sample questions...",
        "Finalizing sample VedaAI assessment document..."
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (step >= simulationLogs.length) {
          clearInterval(interval);
          const offlineId = currentJob.id;
          const offlineAssignment: Assignment = {
            id: offlineId,
            title: "Cell Biology Practice Quiz",
            subject: "Biology",
            grade: "Class 10",
            dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
            assignedDate: new Date().toLocaleDateString(),
            timeAllowed: 45,
            difficulty: { easy: 50, medium: 30, hard: 20 },
            includeAnswerKey: true,
            version: 1,
            versionHistory: [{ version: 1, timestamp: new Date().toLocaleString(), questionsCount: 3 }],
            questions: [
              {
                id: "q1",
                type: "MCQ",
                questionText: "What is the basic structural and functional unit of life?",
                options: ["Tissue", "Cell", "Organ", "Organelle"],
                marks: 2,
                answerKey: "Cell"
              },
              {
                id: "q2",
                type: "True/False",
                questionText: "Mitochondria contain their own DNA.",
                options: ["True", "False"],
                marks: 2,
                answerKey: "True"
              },
              {
                id: "q3",
                type: "Short Answer",
                questionText: "State the cell theory principles.",
                marks: 6,
                answerKey: "1. All living organisms are composed of one or more cells. 2. The cell is the basic unit of structure and organization in organisms. 3. Cells arise from pre-existing cells."
              }
            ]
          };
          addAssignment(offlineAssignment);
          addToast("Assessment generated (Offline Fallback)!", "success");
          setCurrentJob(null);
          router.push(`/assignments/${offlineId}`);
        } else {
          updateJobProgress((step + 1) * 33, simulationLogs[step]);
          step++;
        }
      }, 2000);

      socket.disconnect();
      socketRef.current = null;
    });

    socket.on("job:queued", (data: { assignmentId: string; position: number }) => {
      console.log("Socket: job:queued received:", data);
      if (data.assignmentId !== currentJob.id) return;
      updateJobProgress(10, `Queued on generator server (position: ${data.position})...`);
    });

    socket.on("job:processing", (data: { assignmentId: string; progress: number; log?: string }) => {
      console.log("Socket: job:processing received:", data);
      if (data.assignmentId !== currentJob.id) return;

      let logMessage = "Generating assessment...";
      if (data.log) {
        logMessage = data.log;
      } else if (data.progress === 30) {
        logMessage = "Reading files & parsing context documents...";
      } else if (data.progress === 60) {
        logMessage = "AI is drafting questions matching syllabus parameters...";
      } else if (data.progress === 90) {
        logMessage = "Synthesizing answer keys & validating marks distribution...";
      }

      updateJobProgress(data.progress, logMessage);
    });

    socket.on("job:completed", (data: { assignmentId: string; resultId: string }) => {
      console.log("Socket: job:completed received:", data);
      if (data.assignmentId !== currentJob.id) return;

      updateJobProgress(100, "Finalizing VedaAI assessment document...");

      const fetchAndAdd = async () => {
        try {
          const res = await axios.get(`${SOCKET_URL}/api/assignments/${data.assignmentId}`);
          if (res.data && res.data.assignment) {
            const mapped = mapBackendAssignmentToFrontend(res.data.assignment);
            addAssignment(mapped);
            addToast("Assignment generated successfully!", "success");
            setCurrentJob(null);
            router.push(`/assignments/${mapped.id}`);
          }
        } catch (err) {
          console.error("Failed to retrieve generated assignment details:", err);
          addToast("Failed to retrieve generated assignment.", "error");
          setCurrentJob({ status: "failed" });
        }
      };
      
      fetchAndAdd();
    });

    socket.on("job:failed", (data: { assignmentId: string; error: string }) => {
      console.log("Socket: job:failed received:", data);
      if (data.assignmentId !== currentJob.id) return;
      
      addToast(`Generation failed: ${data.error}`, "error");
      setCurrentJob({ status: "failed", logs: ["Error: " + data.error] });
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [currentJob?.id, currentJob?.status]);

  return socketRef.current;
}
