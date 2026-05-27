"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignmentStore, Assignment } from "../../store/useAssignmentStore";
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Clock, 
  Layers, 
  Tag
} from "lucide-react";
import axios from "axios";
import { LibrarySkeleton } from "../../components/Skeletons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LibraryPage() {
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const setFormData = useAssignmentStore((state) => state.setFormData);
  const setActiveStep = useAssignmentStore((state) => state.setActiveStep);
  const addToast = useAssignmentStore((state) => state.addToast);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [libraryItems, setLibraryItems] = useState<Assignment[]>([]);

  // Query completed assignments
  const fetchLibrary = async (pageNum: number, typeFilter: string, append = false) => {
    try {
      const res = await axios.get(`${API_URL}/api/assignments?page=${pageNum}&limit=12&status=completed`);
      
      if (res.data && res.data.assignments && Array.isArray(res.data.assignments)) {
        const mapped = res.data.assignments.map((backendAss: any) => ({
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
          questions: backendAss.questionTypes
            ? backendAss.questionTypes.map((qt: any) => ({
                id: qt._id,
                type: qt.type,
                questionText: "",
                marks: qt.marksPerQuestion * qt.count,
              }))
            : [],
          includeAnswerKey: backendAss.includeAnswerKey,
          version: backendAss.version || 1,
          status: backendAss.status,
          versionHistory: backendAss.versionHistory
        }));

        if (append) {
          setLibraryItems(prev => [...prev, ...mapped]);
        } else {
          setLibraryItems(mapped);
        }
        setHasMore(mapped.length === 12);
      }
    } catch (err) {
      console.warn("API offline. Loading mock items filtered from Zustand/local cache.", err);
      // Fallback local completed assessments
      const completed = assignments;
      const startIdx = (pageNum - 1) * 12;
      const paginated = completed.slice(startIdx, startIdx + 12);
      
      if (append) {
        setLibraryItems(prev => [...prev, ...paginated]);
      } else {
        setLibraryItems(paginated);
      }
      setHasMore(completed.length > pageNum * 12);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchLibrary(1, activeTab, false);
  }, [activeTab]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLibrary(nextPage, activeTab, true);
  };

  // Duplication triggering
  const handleDuplicate = async (assignmentId: string) => {
    addToast("Cloning assessment blueprints...", "info");
    let original: Assignment | undefined = libraryItems.find(a => a.id === assignmentId) || assignments.find(a => a.id === assignmentId);
    
    try {
      const res = await axios.post(`${API_URL}/api/assignments/${assignmentId}/duplicate`);
      if (res.data && res.data.assignment) {
        original = res.data.assignment;
      }
    } catch (err) {
      console.warn("API offline or duplicate route missing. Simulating duplication properties.", err);
    }

    if (!original) {
      addToast("Failed to locate original assignment parameters.", "error");
      return;
    }

    const rowsMap = original.questions.reduce((acc, q) => {
      const key = q.type || "MCQ";
      if (!acc[key]) {
        acc[key] = { count: 0, marks: q.marks || 2 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { count: number; marks: number }>);

    const questionRows = Object.entries(rowsMap).map(([type, data], idx) => ({
      id: (idx + 1).toString(),
      type,
      count: data.count,
      marksPerQuestion: data.marks
    }));

    setFormData({
      file: null, 
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      questionRows: questionRows.length > 0 ? questionRows : [{ id: "1", type: "MCQ", count: 5, marksPerQuestion: 2 }],
      voicePrompt: `Duplicated copy of: ${original.title}. Re-generate standard questions.`,
      subject: original.subject,
      grade: original.grade,
      schoolName: original.schoolName || "Veda International School",
      timeAllowed: original.timeAllowed || 60,
      difficulty: original.difficulty || { easy: 50, medium: 30, hard: 20 },
      includeAnswerKey: original.includeAnswerKey
    });

    setActiveStep(1);
    addToast("Form prefilled with duplicated assessment config. Review values.", "success");
    router.push("/assignments/create");
  };

  const getSubjectBadgeClasses = (subject: string) => {
    const classes = [
      "bg-amber-50/80 border-amber-200/50 text-amber-700",
      "bg-emerald-50/80 border-emerald-200/50 text-emerald-700",
      "bg-blue-50/80 border-blue-200/50 text-blue-700",
      "bg-purple-50/80 border-purple-200/50 text-purple-700",
      "bg-rose-50/80 border-rose-200/50 text-rose-700"
    ];
    const index = (subject?.charCodeAt(0) || 0) % 5;
    return classes[index];
  };

  const tabs = ["All", "MCQ", "Short Answer", "Essay", "Mixed"];

  // Offline-ready filtering logic combining Search and Tab filters
  const filteredLibraryItems = libraryItems.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    if (activeTab === "All") return true;

    const qTypes = item.questions?.map(q => q.type) || [];
    const uniqueTypes = Array.from(new Set(qTypes));

    if (activeTab === "Mixed") {
      return uniqueTypes.length >= 2 || (item.difficulty && (item.difficulty.easy > 0 && item.difficulty.medium > 0));
    }
    
    if (activeTab === "MCQ") {
      return qTypes.some(t => t.toLowerCase().includes("multiple") || t.toLowerCase().includes("mcq"));
    }
    
    if (activeTab === "Short Answer") {
      return qTypes.some(t => t.toLowerCase().includes("short"));
    }
    
    if (activeTab === "Essay") {
      return qTypes.some(t => t.toLowerCase().includes("essay") || t.toLowerCase().includes("long"));
    }

    return true;
  });

  if (loading && page === 1) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-brand-dark font-bricolage tracking-tight">Completed Curriculum Library</h2>
          <p className="text-sm text-brand-secondary font-medium">
            Review all completed assessments and clone layouts to quickly spin up new tests.
          </p>
        </div>

        {/* Search Bar - Elevated with beautiful translucent borders & focus rings */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Assignments or Subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-md border border-gray-200/80 rounded-full text-sm font-medium focus:outline-none focus:border-[#F15A22] focus:ring-4 focus:ring-orange-100/40 transition-all duration-300 shadow-sm"
          />
        </div>
      </div>

      {/* Dynamic filterable tabs - Elevated glass trays */}
      <div className="flex flex-wrap bg-white/60 border border-gray-150/50 p-1.5 rounded-2xl gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)] max-w-max">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all duration-300 active:scale-95 ${
              activeTab === tab 
                ? "bg-[#1A1A1A] text-white shadow-sm" 
                : "text-brand-secondary hover:bg-white hover:text-brand-dark"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid of assessments */}
      {filteredLibraryItems.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-150/60 p-16 text-center flex flex-col items-center justify-center space-y-5 shadow-sm">
          <div className="p-4 bg-orange-50/80 border border-orange-100 rounded-full text-[#F15A22] shadow-sm animate-pulseSlow">
            <BookOpen className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-lg font-black text-brand-dark font-bricolage">Library is Empty</h3>
            <p className="text-xs text-brand-secondary font-medium leading-relaxed">
              No matching completed assessments found. Generate assessments to automatically build your curriculum library.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredLibraryItems.map((item) => {
              const totalQs = item.questions?.length || 0;
              const totalMarks = item.questions?.reduce((sum, q) => sum + q.marks, 0) || 0;
              const badgeClass = getSubjectBadgeClasses(item.subject);

              return (
                <div
                  key={item.id}
                  className="bg-white/85 backdrop-blur-md rounded-2xl border border-gray-150/60 p-5 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_-6px_rgba(241,90,34,0.08)] hover:border-[#F15A22]/20 hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between space-y-4 font-sans"
                >
                  <div className="flex items-start justify-between">
                    <span 
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${badgeClass}`}
                    >
                      {item.subject}
                    </span>
                    <span className="font-bold text-brand-dark text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">v{item.version}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-brand-dark leading-snug line-clamp-2 font-sans tracking-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-brand-secondary font-semibold uppercase tracking-wide">
                      {item.grade} • {item.timeAllowed} mins limit
                    </p>
                  </div>

                  {/* Difficulty Distribution Mini Bar - Styled with subtle border gradients */}
                  <div className="space-y-1.5 bg-gray-50/50 border border-gray-100/50 p-2.5 rounded-xl shadow-inner">
                    <p className="text-[9px] uppercase font-extrabold text-brand-secondary tracking-wide">Difficulty balance</p>
                    <div className="h-2 rounded-full overflow-hidden flex border border-gray-200/40 w-full bg-gray-200/50 shadow-inner">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${item.difficulty?.easy || 40}%` }}
                        title={`Easy: ${item.difficulty?.easy || 40}%`}
                      />
                      <div 
                        className="bg-amber-500 h-full transition-all duration-500" 
                        style={{ width: `${item.difficulty?.medium || 40}%` }}
                        title={`Medium: ${item.difficulty?.medium || 40}%`}
                      />
                      <div 
                        className="bg-red-500 h-full transition-all duration-500" 
                        style={{ width: `${item.difficulty?.hard || 20}%` }}
                        title={`Hard: ${item.difficulty?.hard || 20}%`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold text-brand-dark bg-gray-50 border border-gray-100/80 p-2.5 rounded-xl">
                    <div className="flex items-center space-x-1.5 justify-center">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{totalQs} Questions</span>
                    </div>
                    <div className="flex items-center space-x-1.5 justify-center">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>{totalMarks} Marks Total</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[10px] text-brand-secondary font-bold">
                    <span className="flex items-center space-x-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Created: {item.assignedDate}</span>
                    </span>
                    <span className="flex items-center space-x-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Due: {item.dueDate}</span>
                    </span>
                  </div>

                  {/* Complete Action Row - Redesigned with outlines & active scales */}
                  <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100 text-xs">
                    <button 
                      onClick={() => router.push(`/assignments/${item.id}`)}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:border-[#F15A22] hover:text-[#F15A22] hover:bg-orange-50/30 text-brand-dark rounded-xl font-bold transition-all duration-200 text-center active:scale-95 shadow-sm"
                    >
                      👁 View
                    </button>
                    <button 
                      onClick={() => window.open(`${API_URL}/api/assignments/${item.id}/pdf`, '_blank')}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:border-[#F15A22] hover:text-[#F15A22] hover:bg-orange-50/30 text-brand-dark rounded-xl font-bold transition-all duration-200 text-center active:scale-95 shadow-sm"
                    >
                      ⬇ PDF
                    </button>
                    <button 
                      onClick={() => handleDuplicate(item.id)}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:border-[#F15A22] hover:text-[#F15A22] hover:bg-orange-50/30 text-brand-dark rounded-xl font-bold transition-all duration-200 text-center active:scale-95 shadow-sm"
                    >
                      🔄 Clone
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination Trigger */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-white border border-gray-250 hover:border-[#F15A22] hover:text-[#F15A22] text-brand-dark font-extrabold rounded-full text-xs transition-colors shadow-sm hover:shadow-md active:scale-95 transition-all"
              >
                Load More Assessments
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
