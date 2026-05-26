"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignmentStore, Assignment } from "../../store/useAssignmentStore";
import { 
  BookOpen, 
  Search, 
  Copy, 
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
      
      if (res.data && Array.isArray(res.data)) {
        if (append) {
          setLibraryItems(prev => [...prev, ...res.data]);
        } else {
          setLibraryItems(res.data);
        }
        setHasMore(res.data.length === 12);
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

  const getSubjectBadgeColor = (subject: string) => {
    const colors = ['#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FFE4E6'];
    const index = (subject?.charCodeAt(0) || 0) % 5;
    return colors[index];
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Completed Curriculum Library</h2>
          <p className="text-sm text-[#6B7280]">
            Review all completed assessments and clone layouts for new tests.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Assignment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Dynamic filterable tabs */}
      <div className="flex flex-wrap border-b border-gray-200 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab 
                ? "border-brand-orange text-brand-orange" 
                : "border-transparent text-brand-secondary hover:text-brand-dark"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid of assessments */}
      {filteredLibraryItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-orange-50 rounded-full text-brand-orange">
            <BookOpen className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-brand-dark">Library is Empty</h3>
            <p className="text-xs text-brand-secondary">
              No matching completed assessments found. Generate assessments to build your curriculum library.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredLibraryItems.map((item) => {
              const totalQs = item.questions?.length || 0;
              const totalMarks = item.questions?.reduce((sum, q) => sum + q.marks, 0) || 0;
              const badgeColor = getSubjectBadgeColor(item.subject);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between space-y-4 font-sans"
                >
                  <div className="flex items-start justify-between">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide text-brand-dark"
                      style={{ backgroundColor: badgeColor, borderColor: 'rgba(0,0,0,0.05)' }}
                    >
                      {item.subject}
                    </span>
                    <span className="font-semibold text-brand-dark text-xs">v{item.version}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-brand-dark line-clamp-2 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-brand-secondary mt-1">
                      Grade: {item.grade} • Time allowed: {item.timeAllowed} mins
                    </p>
                  </div>

                  {/* Difficulty Distribution Mini Bar */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase font-bold text-brand-secondary">Difficulty balance</p>
                    <div className="h-2 rounded-full overflow-hidden flex border border-gray-150 shadow-inner w-full bg-gray-100">
                      <div 
                        className="bg-green-500 h-full" 
                        style={{ width: `${item.difficulty?.easy || 40}%` }}
                        title={`Easy: ${item.difficulty?.easy || 40}%`}
                      />
                      <div 
                        className="bg-amber-500 h-full" 
                        style={{ width: `${item.difficulty?.medium || 40}%` }}
                        title={`Medium: ${item.difficulty?.medium || 40}%`}
                      />
                      <div 
                        className="bg-red-500 h-full" 
                        style={{ width: `${item.difficulty?.hard || 20}%` }}
                        title={`Hard: ${item.difficulty?.hard || 20}%`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-brand-dark bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{totalQs} questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>{totalMarks} marks total</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[10px] text-brand-secondary">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Created: {item.assignedDate}</span>
                    </span>
                  </div>

                  {/* Complete Action Row */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#E5E5E5] text-xs">
                    <button 
                      onClick={() => router.push(`/assignments/${item.id}`)}
                      className="flex-1 py-1.5 border border-gray-250 hover:border-brand-orange text-brand-dark hover:text-brand-orange rounded-lg font-bold transition-all text-center bg-white"
                    >
                      👁 View
                    </button>
                    <button 
                      onClick={() => window.open(`${API_URL}/api/results/${item.id}/pdf`, '_blank')}
                      className="flex-1 py-1.5 border border-gray-250 hover:border-brand-orange text-brand-dark hover:text-brand-orange rounded-lg font-bold transition-all text-center bg-white"
                    >
                      ⬇ PDF
                    </button>
                    <button 
                      onClick={() => handleDuplicate(item.id)}
                      className="flex-1 py-1.5 border border-gray-250 hover:border-brand-orange text-brand-dark hover:text-brand-orange rounded-lg font-bold transition-all text-center bg-white"
                    >
                      🔄 Duplicate
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
                className="px-6 py-2 border border-gray-250 hover:bg-gray-50 text-brand-dark font-semibold rounded-full text-xs transition-colors shadow-sm"
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
