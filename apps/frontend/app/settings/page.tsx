"use client";

import React, { useEffect, useState } from "react";
import { useAssignmentStore } from "../../store/useAssignmentStore";
import { 
  School, 
  Trash2, 
  Save, 
  Sliders as SlidersIcon, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import axios from "axios";
import { SettingsSkeleton } from "../../components/Skeletons";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SettingsData {
  teacherName: string;
  schoolName: string;
  city: string;
  board: string;
  defaultTimeAllowed: number;
  defaultDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeAnswerKeyDefault: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const addToast = useAssignmentStore((state) => state.addToast);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "exam" | "danger">("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // State properties matching the backend Settings schema
  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [defaultTimeAllowed, setDefaultTimeAllowed] = useState(60);
  const [defaultDifficulty, setDefaultDifficulty] = useState<{
    easy: number;
    medium: number;
    hard: number;
  }>({ easy: 40, medium: 40, hard: 20 });
  const [includeAnswerKeyDefault, setIncludeAnswerKeyDefault] = useState(true);

  // Fetch settings from API with fallback to localStorage
  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings`);
      if (res.data && res.data.teacherName !== undefined) {
        setTeacherName(res.data.teacherName || "");
        setSchoolName(res.data.schoolName || "");
        setCity(res.data.city || "");
        setBoard(res.data.board || "CBSE");
        setDefaultTimeAllowed(res.data.defaultTimeAllowed || 60);
        setDefaultDifficulty(res.data.defaultDifficulty || { easy: 40, medium: 40, hard: 20 });
        setIncludeAnswerKeyDefault(res.data.includeAnswerKeyDefault !== false);
      } else {
        throw new Error("No remote settings found");
      }
    } catch (err) {
      console.warn("API settings offline. Loading defaults from cache.", err);
      // Fallback
      const cached = localStorage.getItem("veda_settings");
      if (cached) {
        const parsed: SettingsData = JSON.parse(cached);
        setTeacherName(parsed.teacherName || "John Doe");
        setSchoolName(parsed.schoolName || "Veda International School");
        setCity(parsed.city || "New Delhi");
        setBoard(parsed.board || "CBSE");
        setDefaultTimeAllowed(parsed.defaultTimeAllowed || 60);
        setDefaultDifficulty(parsed.defaultDifficulty || { easy: 40, medium: 40, hard: 20 });
        setIncludeAnswerKeyDefault(parsed.includeAnswerKeyDefault !== false);
      } else {
        // Initial setup defaults
        setTeacherName("John Doe");
        setSchoolName("Veda International School");
        setCity("New Delhi");
        setBoard("CBSE");
        setDefaultTimeAllowed(60);
        setDefaultDifficulty({ easy: 40, medium: 40, hard: 20 });
        setIncludeAnswerKeyDefault(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: SettingsData = {
      teacherName,
      schoolName,
      city,
      board,
      defaultTimeAllowed,
      defaultDifficulty,
      includeAnswerKeyDefault
    };

    try {
      await axios.put(`${API_URL}/api/settings`, payload);
      addToast("Settings synchronized successfully!", "success");
    } catch (err) {
      console.warn("API settings save offline. Persisting locally.", err);
      localStorage.setItem("veda_settings", JSON.stringify(payload));
      addToast("Settings cached locally (Offline Mode).", "success");
    } finally {
      setSaving(false);
    }
  };

  // Auto-balancing Sliders Logic
  const handleDifficultyChange = (key: "easy" | "medium" | "hard", val: number) => {
    const otherKeys = (["easy", "medium", "hard"] as const).filter(k => k !== key);
    const diff = 100 - val;
    const otherSum = defaultDifficulty[otherKeys[0]] + defaultDifficulty[otherKeys[1]];
    
    const newVals = { ...defaultDifficulty, [key]: val };
    
    if (otherSum === 0) {
      newVals[otherKeys[0]] = Math.round(diff / 2);
      newVals[otherKeys[1]] = diff - newVals[otherKeys[0]];
    } else {
      newVals[otherKeys[0]] = Math.round((defaultDifficulty[otherKeys[0]] / otherSum) * diff);
      newVals[otherKeys[1]] = diff - newVals[otherKeys[0]];
    }
    
    setDefaultDifficulty(newVals);
  };

  // Danger zone wipes
  const handleClearDatabase = async () => {
    try {
      await axios.delete(`${API_URL}/api/assignments/all`);
      addToast("All assessments and groups deleted from server.", "success");
      router.push('/assignments');
    } catch (err) {
      console.warn("API database wipe offline. Wiping local/cached states.", err);
      localStorage.removeItem("veda_assignments");
      localStorage.removeItem("veda_groups");
      localStorage.removeItem("veda_settings");
      addToast("Local caches cleared. State reset.", "info");
      setTimeout(() => {
        router.push('/assignments');
      }, 1000);
    } finally {
      setShowDeleteConfirm(false);
      setConfirmText("");
    }
  };

  const handleClearCache = async () => {
    try {
      await axios.post(`${API_URL}/api/cache/clear`);
      addToast("Backend server queues and cache cleared.", "success");
    } catch (err) {
      console.warn("API cache clear offline.", err);
      addToast("Local temporary caches flushed.", "info");
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans relative">
      <div>
        <h2 className="text-2xl font-bold text-brand-dark">Exam & Profile Settings</h2>
        <p className="text-sm text-brand-secondary">
          Configure default metadata parameters and school configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Tabs */}
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => setActiveSection("profile")}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
              activeSection === "profile" 
                ? "bg-white border-l-4 border-brand-orange text-brand-dark shadow-sm" 
                : "text-brand-secondary hover:bg-white hover:text-brand-dark"
            }`}
          >
            <School className="w-4 h-4" />
            <span>School Profile</span>
          </button>
          
          <button
            onClick={() => setActiveSection("exam")}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
              activeSection === "exam" 
                ? "bg-white border-l-4 border-brand-orange text-brand-dark shadow-sm" 
                : "text-brand-secondary hover:bg-white hover:text-brand-dark"
            }`}
          >
            <SlidersIcon className="w-4 h-4" />
            <span>Exam Defaults</span>
          </button>

          <button
            onClick={() => setActiveSection("danger")}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
              activeSection === "danger" 
                ? "bg-white border-l-4 border-red-500 text-red-600 shadow-sm" 
                : "text-red-500 hover:bg-red-50/50"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Danger Zone</span>
          </button>
        </div>

        {/* Right Side: Tab Form Panel */}
        <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
          {activeSection === "profile" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-brand-dark border-b border-gray-100 pb-2">
                Teacher & School Profile
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-dark uppercase">Teacher Name</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-dark uppercase">Email Address (Read-only)</label>
                <input 
                  type="email"
                  value="teacher@school.edu" 
                  disabled 
                  className="opacity-60 cursor-not-allowed w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-dark uppercase">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-dark uppercase">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-dark uppercase">Education Board</label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-medium"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB">IB</option>
                    <option value="Cambridge">Cambridge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#1A1A1A] hover:opacity-90 active:scale-95 text-white font-bold rounded-full text-sm flex items-center space-x-1.5 transition-all shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          )}

          {activeSection === "exam" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-brand-dark border-b border-gray-100 pb-2">
                Exam Generation Defaults
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-dark uppercase">Default Time Allowed (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={defaultTimeAllowed}
                  onChange={(e) => setDefaultTimeAllowed(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 font-semibold"
                  required
                />
              </div>

              {/* Difficulty Sliders Auto-Balancing */}
              <div className="space-y-4 p-4 border border-gray-150 rounded-xl bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                    Default Difficulty Profile
                  </label>
                  <div className="text-xs font-semibold text-brand-orange bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                    Sum: {defaultDifficulty.easy + defaultDifficulty.medium + defaultDifficulty.hard}%
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Easy Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-green-600">Easy Questions</span>
                      <span className="font-bold text-brand-dark">{defaultDifficulty.easy}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={defaultDifficulty.easy}
                      onChange={(e) => handleDifficultyChange("easy", parseInt(e.target.value))}
                      className="w-full accent-green-500"
                    />
                  </div>

                  {/* Medium Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-amber-500">Medium Questions</span>
                      <span className="font-bold text-brand-dark">{defaultDifficulty.medium}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={defaultDifficulty.medium}
                      onChange={(e) => handleDifficultyChange("medium", parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Hard Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-red-500">Hard Questions</span>
                      <span className="font-bold text-brand-dark">{defaultDifficulty.hard}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={defaultDifficulty.hard}
                      onChange={(e) => handleDifficultyChange("hard", parseInt(e.target.value))}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnswerKeyDefault}
                    onChange={(e) => setIncludeAnswerKeyDefault(e.target.checked)}
                    className="w-4.5 h-4.5 text-brand-orange border-gray-300 rounded focus:ring-brand-orange"
                  />
                  <span className="text-xs font-bold text-brand-dark">Include answer key in assessments by default</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#1A1A1A] hover:opacity-90 active:scale-95 text-white font-bold rounded-full text-sm flex items-center space-x-1.5 transition-all shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          )}

          {activeSection === "danger" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-red-600 border-b border-gray-100 pb-2 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Danger Zone Actions</span>
                </h3>
                <p className="text-xs text-brand-secondary mt-1">
                  Actions below are dangerous and will immediately wipe stored content or invalidate queues.
                </p>
              </div>

              <div className="p-4 border border-red-200 bg-red-50/50 rounded-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-dark">Flush Assessment Database</p>
                    <p className="text-xs text-brand-secondary">
                      Deletes all assessments, question caches, rosters, and groups forever.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border border-red-600 text-red-600 rounded-full px-4 py-2 bg-transparent hover:bg-red-50 font-bold text-xs transition-all flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear DB</span>
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-red-100">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-dark">Purge Queue & Memory Cache</p>
                    <p className="text-xs text-brand-secondary">
                      Purges active socket queues, jobs, and temporary generation workers.
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="border border-red-600 text-red-600 rounded-full px-4 py-2 bg-transparent hover:bg-red-50 font-bold text-xs transition-all flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Clear Cache</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-brand-dark">Delete All Data?</h3>
            </div>
            <p className="text-sm text-brand-secondary leading-relaxed">
              This will permanently delete <strong className="text-brand-dark">all assessments, groups, and cached data</strong>. This action is irreversible and cannot be undone.
            </p>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-dark uppercase">Type DELETE to confirm</label>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-medium"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-brand-dark font-semibold rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmText !== 'DELETE'}
                onClick={handleClearDatabase}
                className={`bg-red-600 text-white rounded-full px-4 py-2 ${
                  confirmText !== 'DELETE' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-700'
                } text-white font-bold rounded-lg text-sm transition-colors flex items-center space-x-1.5`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
