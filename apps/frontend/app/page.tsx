"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAssignmentStore, Assignment } from "../store/useAssignmentStore";
import { 
  Sparkles, 
  Layers, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  Settings,
  FileText,
  Activity as ActivityIcon
} from "lucide-react";
import axios from "axios";
import { DashboardSkeleton } from "../components/Skeletons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ActivityLog {
  _id: string;
  type: string;
  message: string;
  timestamp: string;
}

export default function DashboardPage() {
  const assignments = useAssignmentStore((state) => state.assignments);
  const [loading, setLoading] = useState(true);
  const [groupsCount, setGroupsCount] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [apiStats, setApiStats] = useState<{totalAssignments: number; totalQuestionsGenerated: number; completedCount: number} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch groups count
        const groupsRes = await axios.get(`${API_URL}/api/groups`);
        if (groupsRes.data && Array.isArray(groupsRes.data)) {
          setGroupsCount(groupsRes.data.length);
        } else if (groupsRes.data && typeof groupsRes.data.count === 'number') {
          setGroupsCount(groupsRes.data.count);
        }
      } catch (err) {
        console.warn("API offline. Falling back to default groups count.", err);
        setGroupsCount(3);
      }

      try {
        // Fetch activity logs
        const activityRes = await axios.get(`${API_URL}/api/activity`);
        if (activityRes.data && Array.isArray(activityRes.data)) {
          setActivities(activityRes.data);
        }
      } catch (err) {
        console.warn("API offline. Falling back to default activity logs.", err);
        setActivities([
          {
            _id: "act1",
            type: "generation",
            message: "Generated 'Cell Division Term Exam' with 5 questions.",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
          },
          {
            _id: "act2",
            type: "group",
            message: "Group 'Grade 9 Biology' created with 18 students.",
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hrs ago
          },
          {
            _id: "act3",
            type: "duplication",
            message: "Duplicated and modified 'Alkanes & Alkynes Quiz' (v2).",
            timestamp: new Date(Date.now() - 1000 * 3600 * 24).toISOString(), // 1 day ago
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch stats from API
    const fetchStats = async () => {
      try {
        const statsRes = await axios.get(`${API_URL}/api/assignments/stats/summary`);
        if (statsRes.data) {
          setApiStats({
            totalAssignments: statsRes.data.totalAssignments ?? 0,
            totalQuestionsGenerated: statsRes.data.totalQuestionsGenerated ?? 0,
            completedCount: statsRes.data.completedCount ?? 0,
          });
        }
      } catch (err) {
        console.warn("Stats API offline. Falling back to local computation.", err);
      }
    };

    fetchData();
    fetchStats();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Aggregate stats
  const totalAssignments = assignments.length;
  const totalQuestions = assignments.reduce((sum, item) => sum + (item.questions?.length || 0), 0);
  const totalMarks = assignments.reduce((sum, item) => {
    const qSum = item.questions?.reduce((s, q) => s + (q.marks || 0), 0) || 0;
    return sum + qSum;
  }, 0);
  
  // Use API stats as primary, fall back to local computation
  const displayTotalAssignments = apiStats?.totalAssignments ?? totalAssignments;
  const displayTotalQuestions = apiStats?.totalQuestionsGenerated ?? totalQuestions;

  // Get top 3 recent assignments
  const recentAssignments = [...assignments]
    .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Welcome Banner - Redesigned with a beautiful glowing gradient border & premium styling */}
      <div className="relative bg-gradient-to-br from-[#1A1A1A] via-[#2D2D2D] to-black rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.15)] border border-white/10 group">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-[#F15A22] opacity-[0.12] blur-3xl group-hover:scale-110 transition-transform duration-700 ease-in-out" />
        <div className="absolute left-1/4 bottom-0 translate-y-16 w-48 h-48 rounded-full bg-emerald-500 opacity-[0.06] blur-2xl" />
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#F15A22]/20 to-[#FF8C00]/20 border border-[#F15A22]/30 px-3.5 py-1.5 rounded-full text-[#F15A22] text-xs font-bold tracking-wide animate-pulseSlow">
            <Sparkles className="w-3.5 h-3.5 animate-twinkle" />
            <span>VedaAI Generation Engine Active</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight font-bricolage leading-[1.15]">
            Create high-integrity, syllabus-aligned assessments in seconds
          </h2>
          <p className="text-xs md:text-sm text-gray-300 leading-relaxed max-w-2xl font-medium">
            Specify exam parameters, upload class materials, and let VedaAI construct your assessments. View generated sheets, version histories, and download print-ready PDFs.
          </p>
        </div>
      </div>

      {/* Stats KPI Row - Redesigned with premium HSL tinted glass cards, shadows, and hover animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Assessments */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-150/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(241,90,34,0.12)] hover:border-[#F15A22]/30 hover:-translate-y-1 transition-all duration-300 flex items-center space-x-4 group cursor-pointer">
          <div className="p-3.5 rounded-xl bg-orange-50 text-[#F15A22] border border-orange-100 group-hover:bg-[#F15A22] group-hover:text-white transition-all duration-300 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-brand-dark font-bricolage">{displayTotalAssignments}</p>
            <p className="text-xs font-bold text-brand-secondary tracking-wide uppercase mt-0.5">Assessments</p>
          </div>
        </div>

        {/* Questions Generated */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-150/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(59,130,246,0.12)] hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center space-x-4 group cursor-pointer">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-brand-dark font-bricolage">{displayTotalQuestions}</p>
            <p className="text-xs font-bold text-brand-secondary tracking-wide uppercase mt-0.5">Questions</p>
          </div>
        </div>

        {/* Total Marks */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-150/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(34,197,94,0.12)] hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center space-x-4 group cursor-pointer">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-brand-dark font-bricolage">{totalMarks} <span className="text-sm font-semibold text-brand-secondary">Pts</span></p>
            <p className="text-xs font-bold text-brand-secondary tracking-wide uppercase mt-0.5">Allocated Marks</p>
          </div>
        </div>

        {/* Groups Managed */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-150/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(168,85,247,0.12)] hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center space-x-4 group cursor-pointer">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-brand-dark font-bricolage">{groupsCount}</p>
            <p className="text-xs font-bold text-brand-secondary tracking-wide uppercase mt-0.5">Active Groups</p>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recent Assessments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-brand-dark font-bricolage">Recent Assessments</h3>
            <Link href="/assignments" className="text-xs font-bold text-[#F15A22] hover:underline flex items-center space-x-1 transition-colors group">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {recentAssignments.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150/60 p-10 text-center shadow-sm space-y-4 flex flex-col items-center justify-center">
              <div className="p-4 bg-orange-50 rounded-full text-[#F15A22] border border-orange-100/60">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-brand-dark">No assessments found</h4>
                <p className="text-xs text-brand-secondary max-w-xs">You haven't generated any assessments yet. Get started by creating your first exam outline.</p>
              </div>
              <Link href="/assignments/create">
                <button className="px-5 py-2 bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-full text-xs shadow-md border border-white/10 active:scale-95 transition-all">
                  Create Assessment
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((assignment: Assignment) => (
                <div 
                  key={assignment.id} 
                  className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150/60 p-4 shadow-sm flex items-center justify-between hover:border-[#F15A22]/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="space-y-1.5 pr-4 min-w-0">
                    <Link href={`/assignments/${assignment.id}`} className="group block">
                      <h4 className="text-sm font-extrabold text-brand-dark group-hover:text-[#F15A22] truncate transition-colors leading-tight font-sans">
                        {assignment.title}
                      </h4>
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                      <span className="bg-gray-100 text-brand-dark px-2 py-0.5 rounded-md border border-gray-200/55">{assignment.grade}</span>
                      <span>•</span>
                      <span className="bg-orange-50/50 text-[#F15A22] px-2 py-0.5 rounded-md border border-orange-100/40">{assignment.subject}</span>
                      <span>•</span>
                      <span className="text-brand-secondary">{assignment.questions.length} questions</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-brand-secondary bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl whitespace-nowrap font-medium shadow-inner">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Due: {assignment.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Actions & Scrollable Activity Feed */}
        <div className="space-y-6">
          {/* Quick Actions Grid - Redesigned with glass blocks and smooth animations */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-dark font-bricolage px-1">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/assignments/create" className="p-4 bg-white/80 backdrop-blur-md hover:bg-gradient-to-br hover:from-white hover:to-orange-50/10 border border-gray-150/60 hover:border-[#F15A22]/40 rounded-2xl text-center space-y-2.5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F15A22] border border-orange-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-dark block font-bricolage tracking-wide">New Exam</span>
              </Link>
              
              <Link href="/groups" className="p-4 bg-white/80 backdrop-blur-md hover:bg-gradient-to-br hover:from-white hover:to-orange-50/10 border border-gray-150/60 hover:border-[#F15A22]/40 rounded-2xl text-center space-y-2.5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-dark block font-bricolage tracking-wide">Groups</span>
              </Link>

              <Link href="/library" className="p-4 bg-white/80 backdrop-blur-md hover:bg-gradient-to-br hover:from-white hover:to-orange-50/10 border border-gray-150/60 hover:border-[#F15A22]/40 rounded-2xl text-center space-y-2.5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-dark block font-bricolage tracking-wide">My Library</span>
              </Link>

              <Link href="/settings" className="p-4 bg-white/80 backdrop-blur-md hover:bg-gradient-to-br hover:from-white hover:to-orange-50/10 border border-gray-150/60 hover:border-[#F15A22]/40 rounded-2xl text-center space-y-2.5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 border border-gray-250/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-dark block font-bricolage tracking-wide">Defaults</span>
              </Link>
            </div>
          </div>

          {/* Activity Feed - Redesigned as a vertical timeline flow with connectors */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-dark font-bricolage px-1">Activity Feed</h3>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150/60 p-5 shadow-sm space-y-4 max-h-[300px] overflow-y-auto relative">
              {activities.length === 0 ? (
                <p className="text-xs text-brand-secondary text-center py-6 font-semibold">No recent activity detected.</p>
              ) : (
                <div className="relative pl-1 space-y-5">
                  {/* Timeline guide line */}
                  <div className="absolute left-[17px] top-2.5 bottom-2.5 w-0.5 bg-dashed border-l border-gray-200/90 z-0" />
                  
                  {activities.map((log) => (
                    <div key={log._id} className="relative flex items-start space-x-3.5 text-xs leading-relaxed z-10">
                      <div className="p-1.5 rounded-full bg-white text-[#F15A22] border-2 border-orange-100 flex-shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform">
                        <ActivityIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50/50 border border-gray-100/50 rounded-xl p-3 shadow-inner">
                        <p className="text-brand-dark font-bold text-xs leading-normal">{log.message}</p>
                        <p className="text-[10px] text-brand-secondary font-semibold mt-1 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
