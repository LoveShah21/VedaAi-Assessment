"use client";

import { useState } from "react";
import Link from "next/link";
import { useAssignmentStore, Assignment } from "../../store/useAssignmentStore";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Calendar, 
  Clock, 
  GraduationCap 
} from "lucide-react";

export default function AssignmentsPage() {
  const assignments = useAssignmentStore((state) => state.assignments);
  const deleteAssignment = useAssignmentStore((state) => state.deleteAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);
  
  // Dropdown menu state: stores ID of active dropdown
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleDelete = (id: string, title: string) => {
    deleteAssignment(id);
    addToast(`"${title}" deleted successfully.`, "info");
    setActiveMenu(null);
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
          <h2 className="text-2xl font-bold text-brand-dark">Active Assessments</h2>
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

            {/* Bouncing Magnifying Glass */}
            <div className="animate-bounceSlow">
              <Search className="w-16 h-16 text-brand-orange stroke-[1.5]" />
            </div>
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold text-brand-dark">No Assessments Created Yet</h3>
            <p className="text-sm text-brand-secondary leading-relaxed">
              Generate customizable, syllabus-aligned exams using VedaAI. Upload curriculum materials or specify parameters in minutes.
            </p>
          </div>

          <div>
            <Link href="/assignments/create">
              <button className="px-6 py-2.5 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 transition-all text-white font-semibold rounded-full text-sm shadow-md shadow-orange-500/10 flex items-center space-x-2 animate-pulseSlow">
                <Plus className="w-4 h-4" />
                <span>Create Your First Assessment</span>
              </button>
            </Link>
          </div>
        </div>
      ) : (
        /* Grid of Assessment Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment: Assignment) => (
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
                        <span>View Details</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(assignment.id, assignment.title)}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors border-t border-gray-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Exam</span>
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
                  <span>Created: {assignment.assignedDate}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-semibold text-brand-dark">Due: {assignment.dueDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
