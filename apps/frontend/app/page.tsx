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
  HelpCircle,
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
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-dark to-gray-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-gray-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 rounded-full bg-brand-orange opacity-10 blur-xl" />
        <div className="absolute left-1/3 bottom-0 translate-y-10 w-32 h-32 rounded-full bg-brand-orange opacity-5 blur-lg" />
        
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-brand-orange/20 border border-brand-orange/30 px-3 py-1 rounded-full text-brand-orange text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VedaAI Generation Engine Active</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Create high-integrity, syllabus-aligned assessments in seconds
          </h2>
          <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
            Specify exam parameters, upload class materials, and let VedaAI construct your assessments. View generated sheets, version histories, and download printable PDFs.
          </p>
        </div>
      </div>

      {/* Stats KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assessments */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-orange-50 text-brand-orange">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-brand-dark">{displayTotalAssignments}</p>
            <p className="text-xs font-semibold text-brand-secondary">Assessments Created</p>
          </div>
        </div>

        {/* Questions Generated */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-brand-dark">{displayTotalQuestions}</p>
            <p className="text-xs font-semibold text-brand-secondary">Questions Formulated</p>
          </div>
        </div>

        {/* Total Marks */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-green-50 text-brand-green">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-brand-dark">{totalMarks} Pts</p>
            <p className="text-xs font-semibold text-brand-secondary">Total Allocated Marks</p>
          </div>
        </div>

        {/* Groups Managed */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-brand-dark">{groupsCount}</p>
            <p className="text-xs font-semibold text-brand-secondary">Active Student Groups</p>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recent Assessments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-dark">Recent Assessments</h3>
            <Link href="/assignments" className="text-xs font-bold text-brand-orange hover:underline flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentAssignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-150 p-8 text-center text-sm text-brand-secondary space-y-3">
              <p>You haven't generated any assessments yet.</p>
              <Link href="/assignments/create">
                <button className="px-4 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] text-white font-semibold rounded-full text-xs hover:brightness-105 active:scale-95 transition-all">
                  Create Assessment
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((assignment: Assignment) => (
                <div key={assignment.id} className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm flex items-center justify-between hover:border-brand-orange/40 transition-colors">
                  <div className="space-y-1 pr-4 min-w-0">
                    <Link href={`/assignments/${assignment.id}`} className="group block">
                      <h4 className="text-sm font-bold text-brand-dark group-hover:text-brand-orange truncate transition-colors underline decoration-transparent group-hover:decoration-brand-orange underline-offset-2">
                        {assignment.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-brand-secondary">
                      {assignment.grade} • {assignment.subject} • {assignment.questions.length} questions
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary whitespace-nowrap">
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
          {/* Quick Actions Grid */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-brand-dark">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/assignments/create" className="p-3 bg-white hover:bg-orange-50/20 border border-gray-150 hover:border-brand-orange rounded-xl text-center space-y-1.5 transition-all group">
                <PlusCircle className="w-5 h-5 text-brand-orange mx-auto group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-brand-dark block">New Exam</span>
              </Link>
              
              <Link href="/groups" className="p-3 bg-white hover:bg-orange-50/20 border border-gray-150 hover:border-brand-orange rounded-xl text-center space-y-1.5 transition-all group">
                <Users className="w-5 h-5 text-brand-orange mx-auto group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-brand-dark block">Manage Groups</span>
              </Link>

              <Link href="/library" className="p-3 bg-white hover:bg-orange-50/20 border border-gray-150 hover:border-brand-orange rounded-xl text-center space-y-1.5 transition-all group">
                <BookOpen className="w-5 h-5 text-brand-orange mx-auto group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-brand-dark block">My Library</span>
              </Link>

              <Link href="/settings" className="p-3 bg-white hover:bg-orange-50/20 border border-gray-150 hover:border-brand-orange rounded-xl text-center space-y-1.5 transition-all group">
                <Settings className="w-5 h-5 text-brand-orange mx-auto group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-brand-dark block">Exam Defaults</span>
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-brand-dark">Activity Feed</h3>
            <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-4 max-h-[280px] overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-xs text-brand-secondary text-center py-4">No recent activity detected.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((log) => (
                    <div key={log._id} className="flex items-start space-x-3 text-xs leading-relaxed">
                      <div className="p-1.5 rounded-lg bg-gray-50 text-brand-orange border border-gray-100 flex-shrink-0 mt-0.5">
                        <ActivityIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-brand-dark font-medium">{log.message}</p>
                        <p className="text-[10px] text-brand-secondary">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
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
