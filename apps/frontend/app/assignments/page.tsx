"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAssignmentStore, Assignment } from "../../store/useAssignmentStore";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Calendar, 
  Clock, 
  GraduationCap,
  Filter,
  FileText
} from "lucide-react";

export default function AssignmentsPage() {
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const deleteAssignment = useAssignmentStore((state) => state.deleteAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);
  
  // Dropdown menu state: stores ID of active dropdown
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssignments = assignments.filter((assignment) =>
    assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, title: string) => {
    try {
      await axios.delete(`${API_URL}/api/assignments/${id}`);
      deleteAssignment(id);
      addToast(`"${title}" deleted successfully.`, "info");
    } catch (err) {
      console.error("Failed to delete assignment on server:", err);
      // Fallback to local delete in offline mode
      deleteAssignment(id);
      addToast(`"${title}" deleted locally.`, "info");
    } finally {
      setActiveMenu(null);
    }
  };

  // Close menu on document click
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" onClick={() => setActiveMenu(null)}>
      {/* Top Banner Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
            Assignments
          </h2>
          <p className="text-sm text-brand-secondary">
            Manage your AI-generated curriculum exams and assignments.
          </p>
        </div>
        
        {assignments.length > 0 && (
          <Link href="/assignments/create">
            <button className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 transition-all text-white font-semibold rounded-lg text-sm shadow-sm shadow-orange-500/10">
              <Plus className="w-4.5 h-4.5" />
              <span>New Assessment</span>
            </button>
          </Link>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between pb-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Assignment"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-white shadow-sm"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-[#1A1A1A] rounded-full px-5 py-2 text-sm font-medium transition-colors shadow-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            <span>Filter By</span>
          </button>
        </div>
      )}

      {assignments.length === 0 ? (
        /* Empty State with Bounce & Twinkle Animation */
        <div className="bg-white rounded-2xl border border-gray-150 p-12 md:p-20 text-center flex flex-col items-center justify-center space-y-6">
          {/* Animated Illustration Container */}
          <div className="relative w-36 h-36 flex items-center justify-center bg-orange-50 rounded-full border border-orange-100">
            {/* Twinkling Star 1 */}
            <div className="absolute top-4 left-6 text-brand-orange animate-twinkle select-none" style={{ animationDelay: "0.2s" }}>
              ✦
            </div>
            {/* Twinkling Star 2 */}
            <div className="absolute bottom-6 right-6 text-amber-500 text-lg animate-twinkle select-none" style={{ animationDelay: "0.8s" }}>
              ✦
            </div>
            {/* Twinkling Star 3 */}
            <div className="absolute top-8 right-6 text-brand-orange text-xs animate-twinkle select-none" style={{ animationDelay: "1.4s" }}>
              ✦
            </div>

            {/* Bouncing File Icon with red cross overlay */}
            <div className="animate-bounceSlow relative animate-bounceSlow relative">
              <FileText className="w-16 h-16 text-brand-orange stroke-[1.5]" />
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-sm shadow-md border-2 border-white select-none">
                ×
              </span>
            </div>
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold text-brand-dark">No assignments yet</h3>
            <p className="text-sm text-brand-secondary leading-relaxed">
              Generate customizable, syllabus-aligned exams using VedaAI. Upload curriculum materials or specify parameters in minutes.
            </p>
          </div>

          <div>
            <Link href="/assignments/create">
              <button className="px-6 py-2.5 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 transition-all text-white font-semibold rounded-full text-sm shadow-md shadow-orange-500/10 flex items-center space-x-2 animate-pulseSlow">
                <Plus className="w-4 h-4" />
                <span>+ Create Your First Assignment</span>
              </button>
            </Link>
          </div>
        </div>
      ) : (
        /* Grid of Assessment Cards */
        <ErrorBoundary fallback={<div className="p-6 text-center text-red-600 font-bold border border-red-200 rounded-xl">Failed to load assignments.</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAssignments.map((assignment: Assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between space-y-4"
              >
                {/* Header inside Card */}
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-brand-orange border border-orange-100">
                    {assignment.subject}
                  </span>

                  {/* Options Menu Toggle */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleMenu(assignment.id, e)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown menu */}
                    {activeMenu === assignment.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-250 rounded-lg shadow-lg py-1 z-30 text-xs">
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Assignment</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(assignment.id, assignment.title)}
                          className="w-full text-left flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors border-t border-gray-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body: Title with bold underline */}
                <div>
                  <Link
                    href={`/assignments/${assignment.id}`}
                    className="group"
                  >
                    <h4 className="text-base font-bold text-brand-dark group-hover:text-brand-orange transition-colors line-clamp-2 underline decoration-transparent group-hover:decoration-brand-orange underline-offset-4 decoration-2">
                      {assignment.title}
                    </h4>
                  </Link>
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary mt-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{assignment.grade}</span>
                  </div>
                </div>

                {/* Footer: Date Information */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[11px] text-brand-secondary">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Assigned on : {assignment.assignedDate}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-brand-dark">Due: {assignment.dueDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ErrorBoundary>
      )}

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => router.push('/assignments/create')}
          className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity animate-pulseSlow"
        >
          + Create Assignment
        </button>
      </div>
    </div>
  );
}
