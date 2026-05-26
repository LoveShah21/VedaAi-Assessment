"use client";

import React, { useEffect, useState } from "react";
import { Plus, X, Users, GraduationCap, BookOpen } from "lucide-react";
import { useAssignmentStore } from "../../store/useAssignmentStore";
import axios from "axios";
import { GroupsSkeleton } from "../../components/Skeletons";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface GroupData {
  _id: string;
  name: string;
  className: string;
  subject: string;
  studentCount: number;
  createdAt?: string;
}

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  className: z.string().min(1, 'Class/Grade is required'),
  subject: z.string().min(1, 'Subject is required'),
  studentCount: z.number().min(1, 'Minimum 1 student').max(200, 'Maximum 200 students'),
});

export default function GroupsPage() {
  const addToast = useAssignmentStore((state) => state.addToast);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [studentCount, setStudentCount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/groups`);
      if (res.data && Array.isArray(res.data)) {
        setGroups(res.data);
      }
    } catch (err) {
      console.warn("API offline. Falling back to local/mock storage.", err);
      const cached = localStorage.getItem("veda_groups");
      if (cached) {
        setGroups(JSON.parse(cached));
      } else {
        const defaultGroups: GroupData[] = [
          { _id: "g1", name: "Biology Advanced", className: "Grade 9", subject: "Science", studentCount: 22 },
          { _id: "g2", name: "Algebra I", className: "Class 8", subject: "Mathematics", studentCount: 18 },
          { _id: "g3", name: "Shakespeare Literature", className: "Grade 11", subject: "English", studentCount: 25 }
        ];
        setGroups(defaultGroups);
        localStorage.setItem("veda_groups", JSON.stringify(defaultGroups));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = groupSchema.safeParse({ name, className, subject, studentCount });
    if (!parsed.success) {
      addToast(parsed.error.errors[0].message, "error");
      return;
    }

    setSubmitting(true);
    const newGroupPayload = { name, className, subject, studentCount };

    try {
      const res = await axios.post(`${API_URL}/api/groups`, newGroupPayload);
      if (res.data) {
        addToast(`Group "${name}" created successfully!`, "success");
        fetchGroups();
        setIsSlideOverOpen(false);
        resetForm();
      }
    } catch (err) {
      console.warn("API offline. Creating group in offline mode.", err);
      const offlineGroup: GroupData = {
        _id: `g_off_${Date.now()}`,
        ...newGroupPayload
      };
      const updated = [...groups, offlineGroup];
      setGroups(updated);
      localStorage.setItem("veda_groups", JSON.stringify(updated));
      addToast(`Group "${name}" created (Offline Mode).`, "success");
      setIsSlideOverOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string, groupName: string) => {
    try {
      await axios.delete(`${API_URL}/api/groups/${id}`);
      addToast(`Group "${groupName}" deleted successfully.`, "info");
      fetchGroups();
    } catch (err) {
      console.warn("API offline. Deleting group in offline mode.", err);
      const updated = groups.filter(g => g._id !== id);
      setGroups(updated);
      localStorage.setItem("veda_groups", JSON.stringify(updated));
      addToast(`Group "${groupName}" deleted (Offline Mode).`, "info");
    }
  };

  const resetForm = () => {
    setName("");
    setClassName("");
    setSubject("");
    setStudentCount(0);
  };

  const getAvatarStyles = (groupName: string) => {
    const charCode = groupName.charCodeAt(0) || 0;
    const colorIndex = charCode % 5;
    const colors = [
      "#F15A22", // orange
      "#22C55E", // green
      "#3B82F6", // blue
      "#A855F7", // purple
      "#EAB308"  // yellow
    ];
    return {
      bgColor: colors[colorIndex],
      initial: groupName.substring(0, 1).toUpperCase()
    };
  };

  if (loading) {
    return <GroupsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans relative min-h-[80vh]" onClick={() => setMenuOpen(null)}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Active Student Groups</h2>
          <p className="text-sm text-brand-secondary">
            Organize student rosters and assign syllabus goals.
          </p>
        </div>

        <button
          onClick={() => setIsSlideOverOpen(true)}
          className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#1A1A1A] hover:opacity-90 active:scale-95 transition-all text-white font-semibold rounded-full text-sm shadow-md"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add Group</span>
        </button>
      </div>

      {/* Grid of groups */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-orange-50 rounded-full text-brand-orange">
            <Users className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-brand-dark">No Groups Found</h3>
            <p className="text-xs text-brand-secondary">
              Create student groups to organize class progress and dispatch customized assessments.
            </p>
          </div>
          <button
            onClick={() => setIsSlideOverOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] text-white font-semibold rounded-lg text-xs"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => {
            const avatar = getAvatarStyles(group.name);
            return (
              <div
                key={group._id}
                className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between space-y-4 font-sans"
              >
                {/* Card Header & Avatar */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    {/* Circle Avatar */}
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white"
                      style={{ backgroundColor: avatar.bgColor }}
                    >
                      {avatar.initial}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-dark leading-tight">{group.name}</h4>
                      <span className="text-[10px] text-brand-secondary">{group.subject}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className="text-[10px] font-bold text-white px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: avatar.bgColor }}
                    >
                      {group.studentCount} Students
                    </span>
                    
                    {/* Options Menu Toggle */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setMenuOpen(menuOpen === group._id ? null : group._id)} 
                        className="text-gray-400 hover:text-gray-600 font-bold text-lg w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors"
                      >
                        ⋮
                      </button>
                      
                      {menuOpen === group._id && (
                        <div className="absolute right-0 top-7 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-10 min-w-[120px] py-1 text-xs">
                          <button 
                            className="block w-full text-left px-4 py-2 hover:bg-gray-50 font-medium text-brand-dark transition-colors"
                            onClick={() => addToast("Edit feature is coming soon!", "info")}
                          >
                            Edit
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-red-650 hover:bg-red-50 font-semibold transition-colors border-t border-gray-100" 
                            onClick={() => { handleDeleteGroup(group._id, group.name); setMenuOpen(null); }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-brand-dark pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1.5 p-2 bg-gray-50 rounded-lg">
                    <GraduationCap className="w-4 h-4 text-brand-orange" />
                    <span>{group.className}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 p-2 bg-gray-50 rounded-lg">
                    <Users className="w-4 h-4 text-brand-orange" />
                    <span>{group.studentCount} students</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over creation panel overlay */}
      {isSlideOverOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity" 
          onClick={() => setIsSlideOverOpen(false)}
        />
      )}

      {/* Slide-over panel content */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${
        isSlideOverOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-150 pb-4">
            <div>
              <h3 className="text-lg font-bold text-brand-dark">Create Student Group</h3>
              <p className="text-xs text-brand-secondary">Define group targets and class size.</p>
            </div>
            <button
              onClick={() => setIsSlideOverOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Advanced Chemistry B"
                className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Class / Grade Level
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                required
              >
                <option value="">-- Choose Grade --</option>
                <option value="Class 8">Class 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                required
              >
                <option value="">-- Choose Subject --</option>
                <option value="Science">Science (Biology/Physics)</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English Literature</option>
                <option value="History">History & Social Studies</option>
                <option value="Geography">Geography</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                Student Count
              </label>
              <input
                type="number"
                min="1"
                value={studentCount === 0 ? "" : studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                placeholder="20"
                className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium font-semibold"
                required
              />
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsSlideOverOpen(false)}
                className="px-4 py-2 border border-gray-250 hover:bg-gray-50 text-brand-dark font-semibold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-sm flex items-center space-x-1.5 transition-all shadow-md shadow-orange-500/10"
              >
                <span>{submitting ? "Creating..." : "Save Group"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
