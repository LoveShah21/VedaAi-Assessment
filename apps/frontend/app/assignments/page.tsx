"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAssignmentStore, Assignment } from "../../store/useAssignmentStore";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import { LibrarySkeleton } from "../../components/Skeletons";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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
  FileText,
  ArrowLeft,
  LayoutGrid,
  BookOpen,
  Sparkles
} from "lucide-react";

export default function AssignmentsPage() {
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const setAssignments = useAssignmentStore((state) => state.setAssignments);
  const deleteAssignment = useAssignmentStore((state) => state.deleteAssignment);
  const addToast = useAssignmentStore((state) => state.addToast);
  
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/assignments`);
        if (res.data && res.data.assignments) {
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
            questions: [],
            includeAnswerKey: backendAss.includeAnswerKey,
            version: backendAss.version || 1,
            status: backendAss.status,
            versionHistory: backendAss.versionHistory
          }));
          setAssignments(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch assignments from server:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [setAssignments]);

  if (loading) {
    return <LibrarySkeleton />;
  }

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
    <div className="w-full relative" onClick={() => setActiveMenu(null)}>
      {assignments.length === 0 ? (
        <>
          {/* Desktop Empty State Layout */}
          <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-[1100px] h-[calc(100vh-160px)] mx-auto p-0 relative font-bricolage bg-gradient-to-b from-[#EEEEEE] to-[#DADADA] rounded-3xl border border-gray-200/50 shadow-inner overflow-hidden">
            <div className="flex flex-col justify-center items-center gap-[32px] w-[486px] h-full mx-auto py-6">
              {/* Illustrations */}
              <div className="relative w-[300px] h-[300px] flex-shrink-0 select-none">
                {/* Circular Background */}
                <div 
                  className="absolute w-[240px] h-[240px] rounded-full" 
                  style={{
                    left: "calc(50% - 240px/2)",
                    top: "calc(50% - 240px/2 - 1px)",
                    background: "linear-gradient(179.67deg, #F2F2F2 -15.9%, #EFEFEF 158.68%)"
                  }}
                />
                
                {/* Left Swirly Doodle */}
                <div 
                  className="absolute w-[82px] h-[73.67px] animate-pulseSlow" 
                  style={{
                    left: "calc(50% - 82px/2 - 102px)",
                    top: "calc(50% - 73.67px/2 - 52.59px)"
                  }}
                >
                  <svg viewBox="0 0 82 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 45C10 25 30 10 50 15C70 20 80 40 60 55C40 70 20 50 25 35C30 20 50 25 55 35" stroke="#011625" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>

                {/* Sparkle Diamond */}
                <div 
                  className="absolute w-[22.89px] h-[25px] animate-twinkle" 
                  style={{
                    left: "calc(50% - 22.89px/2 - 82.95px)",
                    top: "calc(50% - 25px/2 + 76.72px)"
                  }}
                >
                  <svg viewBox="0 0 23 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.5 0L14.5 9.5L23 12.5L14.5 15.5L11.5 25L8.5 15.5L0 12.5L8.5 9.5L11.5 0Z" fill="#417BA4"/>
                  </svg>
                </div>

                {/* Blue Ellipse Circle */}
                <div 
                  className="absolute w-[12px] h-[12px] rounded-full bg-[#417BA4] animate-twinkle" 
                  style={{
                    left: "calc(50% - 12px/2 + 135px)",
                    top: "calc(50% - 12px/2 + 34px)"
                  }}
                />

                {/* Page (Document) */}
                <div 
                  className="absolute w-[124.54px] h-[155.03px] bg-white rounded-[16px] shadow-[0px_20px_30px_rgba(146,146,146,0.19)] flex items-center justify-center animate-bounceSlow" 
                  style={{
                    left: "calc(50% - 124.54px/2 + 1.27px)",
                    top: "calc(50% - 155.03px/2 - 8.93px)"
                  }}
                >
                  <div className="flex flex-col items-start gap-[18px] w-[100px] h-[121px] rounded-[16px]">
                    {/* Title */}
                    <div className="w-[50px] h-[9.8px] bg-[#011625] rounded-full flex-shrink-0" />
                    {/* Text lines */}
                    <div className="w-[100px] h-[9.8px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[100px] h-[9.8px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[100px] h-[9.8px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[100px] h-[9.8px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                  </div>
                </div>

                {/* Cloud vector card */}
                <div 
                  className="absolute w-[70.22px] h-[40.39px] bg-white rounded-xl shadow-[6px_4px_13px_rgba(27,119,139,0.09)] flex items-center justify-center gap-1 px-1.5 animate-bounceSlow"
                  style={{
                    left: "calc(50% - 70.22px/2 + 108.11px)",
                    top: "calc(50% - 40.39px/2 - 83.38px)",
                    animationDelay: "0.5s"
                  }}
                >
                  <div className="w-[12px] h-[12px] bg-[#CCC6D9] rounded-[2px] flex-shrink-0" />
                  <div className="w-[32px] h-[12px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                </div>

                {/* Lens Overlay Group */}
                <div 
                  className="absolute w-[163.11px] h-[163.17px] animate-bounceSlow"
                  style={{
                    left: "122.61px",
                    top: "100.56px",
                    animationDelay: "0.2s"
                  }}
                >
                  {/* Handle */}
                  <div 
                    className="absolute w-[22.61px] h-[57.52px] bg-[#E1DCEB] origin-center rounded-full"
                    style={{
                      left: "calc(50% - 22.61px/2 + 80.3px)",
                      top: "calc(50% - 57.52px/2 + 75.76px)",
                      transform: "matrix(0.65, -0.76, 0.72, 0.69, 0, 0)"
                    }}
                  />
                  
                  {/* Outer Rim Ring */}
                  <div 
                    className="absolute w-[125px] h-[125px] rounded-full border-[8px] border-[#E1DCEB]"
                    style={{
                      left: "calc(50% - 125px/2 + 35.11px)",
                      top: "calc(50% - 125px/2 + 13.06px)"
                    }}
                  />

                  {/* Inner Lens Glass Circle */}
                  <div 
                    className="absolute w-[105.83px] h-[105.83px] rounded-full"
                    style={{
                      left: "calc(50% - 105.83px/2 + 35.51px)",
                      top: "calc(50% - 105.83px/2 + 13.06px)",
                      background: "linear-gradient(158.92deg, #FFFFFF 13.91%, #FFADAD 122.3%)"
                    }}
                  />

                  {/* Gloss/Blur overlay */}
                  <div 
                    className="absolute w-[109px] h-[108px] rounded-full bg-white/30 backdrop-blur-[4px]"
                    style={{
                      left: "calc(50% - 109px/2 + 35.5px)",
                      top: "calc(50% - 108px/2 + 13px)"
                    }}
                  />

                  {/* Close Icon Circular Badge */}
                  <div 
                    className="absolute w-[50px] h-[50px] rounded-full bg-[#FF4040] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                    style={{
                      left: "calc(50% - 50px/2 + 35px)",
                      top: "calc(50% - 50px/2 + 13px)"
                    }}
                  >
                    <span className="text-white text-3xl font-extrabold font-sans">×</span>
                  </div>
                </div>
              </div>

              {/* Text Frame */}
              <div className="flex flex-col justify-center items-center gap-[12px] w-[486px] h-[96px] text-center select-none">
                <h3 className="w-[181px] h-[28px] font-bricolage font-bold text-[20px] leading-[140%] tracking-[-0.04em] text-[#303030] flex items-center justify-center">
                  No assignments yet
                </h3>
                <p className="w-[486px] h-[66px] font-bricolage font-normal text-[16px] leading-[140%] tracking-[-0.04em] text-[rgba(94,94,94,0.8)] flex items-center justify-center">
                  Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
                </p>
              </div>

              {/* Button */}
              <Link href="/assignments/create">
                <button className="box-border flex flex-row items-center justify-center px-[24px] py-[12px] gap-[4px] w-[277px] h-[46px] bg-[#181818] hover:bg-black rounded-[48px] transition-all hover:scale-[1.02] active:scale-95 text-white font-bricolage font-medium text-[16px] tracking-[-0.04em] cursor-pointer shadow-lg shadow-black/10">
                  <Plus className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="w-[205px] h-[22px] font-bricolage font-medium text-[16px] leading-[140%] tracking-[-0.04em] text-white flex items-center justify-center">Create Your First Assignment</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Mobile Empty State Layout (No assignments - clean wrapper content flowing in LayoutWrapper) */}
          <div className="lg:hidden w-full flex flex-col justify-center items-center py-6 font-bricolage select-none">
            <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center gap-[32px]">
              {/* Illustrations */}
              <div className="relative w-[220px] h-[220px] select-none flex-shrink-0">
                {/* Circular Background */}
                <div 
                  className="absolute w-[176px] h-[176px] rounded-full" 
                  style={{
                    left: "calc(50% - 176px/2)",
                    top: "calc(50% - 176px/2 - 0.73px)",
                    background: "linear-gradient(179.67deg, #F2F2F2 -15.9%, #EFEFEF 158.68%)"
                  }}
                />
                
                {/* Left Swirly Doodle */}
                <div 
                  className="absolute w-[60.13px] h-[54.02px] animate-pulseSlow" 
                  style={{
                    left: "calc(50% - 60.13px/2 - 74.8px)",
                    top: "calc(50% - 54.02px/2 - 38.57px)"
                  }}
                >
                  <svg viewBox="0 0 60 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 33C8 18 22 7 36 11C51 15 58 29 44 40C30 51 15 36 18 25C22 15 36 18 40 25" stroke="#011625" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>

                {/* Sparkle Diamond */}
                <div 
                  className="absolute w-[16.78px] h-[18.34px] animate-twinkle" 
                  style={{
                    left: "calc(50% - 16.78px/2 - 60.83px)",
                    top: "calc(50% - 18.34px/2 + 56.26px)"
                  }}
                >
                  <svg viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.5 0L10.7 7L17 9L10.7 11L8.5 18L6.3 11L0 9L6.3 7L8.5 0Z" fill="#417BA4"/>
                  </svg>
                </div>

                {/* Blue Ellipse Circle */}
                <div 
                  className="absolute w-[8.8px] h-[8.8px] rounded-full bg-[#417BA4] animate-twinkle" 
                  style={{
                    left: "calc(50% - 8.8px/2 + 99px)",
                    top: "calc(50% - 8.8px/2 + 24.93px)"
                  }}
                />

                {/* Page (Document) */}
                <div 
                  className="absolute w-[91.33px] h-[113.69px] bg-white rounded-[11.73px] shadow-[0px_14.67px_22px_rgba(146,146,146,0.19)] flex items-center justify-center animate-bounceSlow" 
                  style={{
                    left: "calc(50% - 91.33px/2 + 0.93px)",
                    top: "calc(50% - 113.69px/2 - 6.55px)"
                  }}
                >
                  <div className="flex flex-col items-start gap-[13.2px] w-[73.33px] h-[88.73px] rounded-[11.73px]">
                    <div className="w-[36.67px] h-[7.19px] bg-[#011625] rounded-full flex-shrink-0" />
                    <div className="w-[73.33px] h-[7.19px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[73.33px] h-[7.19px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[73.33px] h-[7.19px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                    <div className="w-[73.33px] h-[7.19px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                  </div>
                </div>

                {/* Cloud vector card */}
                <div 
                  className="absolute w-[51.49px] h-[29.62px] bg-white rounded-lg shadow-[4.4px_2.93px_9.53px_rgba(27,119,139,0.09)] flex items-center justify-center gap-1 px-1 animate-bounceSlow"
                  style={{
                    left: "calc(50% - 51.49px/2 + 79.28px)",
                    top: "calc(50% - 29.62px/2 - 61.15px)",
                    animationDelay: "0.5s"
                  }}
                >
                  <div className="w-[8.8px] h-[8.8px] bg-[#CCC6D9] rounded-[1.5px] flex-shrink-0" />
                  <div className="w-[23.47px] h-[8.8px] bg-[#D5D5D5] rounded-full flex-shrink-0" />
                </div>

                {/* Lens Overlay Group */}
                <div 
                  className="absolute w-[119.61px] h-[119.65px] animate-bounceSlow"
                  style={{
                    left: "89.91px",
                    top: "73.75px",
                    animationDelay: "0.2s"
                  }}
                >
                  <div 
                    className="absolute w-[16.58px] h-[42.18px] bg-[#E1DCEB] origin-center rounded-full"
                    style={{
                      left: "calc(50% - 16.58px/2 + 58.89px)",
                      top: "calc(50% - 42.18px/2 + 55.56px)",
                      transform: "matrix(0.65, -0.76, 0.72, 0.69, 0, 0)"
                    }}
                  />
                  
                  <div 
                    className="absolute w-[91.67px] h-[91.67px] rounded-full border-[6px] border-[#E1DCEB]"
                    style={{
                      left: "calc(50% - 91.67px/2 + 25.75px)",
                      top: "calc(50% - 91.67px/2 + 9.58px)"
                    }}
                  />

                  <div 
                    className="absolute w-[77.61px] h-[77.61px] rounded-full"
                    style={{
                      left: "calc(50% - 77.61px/2 + 26.04px)",
                      top: "calc(50% - 77.61px/2 + 9.58px)",
                      background: "linear-gradient(158.92deg, #FFFFFF 13.91%, #FFADAD 122.3%)"
                    }}
                  />

                  <div 
                    className="absolute w-[79.93px] h-[79.2px] rounded-full bg-white/30 backdrop-blur-[3px]"
                    style={{
                      left: "calc(50% - 79.93px/2 + 26.03px)",
                      top: "calc(50% - 79.2px/2 + 9.53px)"
                    }}
                  />

                  <div 
                    className="absolute w-[36.67px] h-[36.67px] rounded-full bg-[#FF4040] flex items-center justify-center shadow-md"
                    style={{
                      left: "calc(50% - 36.67px/2 + 25.67px)",
                      top: "calc(50% - 36.67px/2 + 9.53px)"
                    }}
                  >
                    <span className="text-white text-2xl font-bold font-sans">×</span>
                  </div>
                </div>
              </div>

              {/* Text Frame */}
              <div className="flex flex-col justify-center items-center gap-[12px] text-center w-full select-none flex-shrink-0">
                <h3 className="font-bricolage font-bold text-[20px] leading-[140%] tracking-[-0.04em] text-[#303030]">
                  No assignments yet
                </h3>
                <p className="font-bricolage font-normal text-[15px] leading-[140%] tracking-[-0.04em] text-[rgba(94,94,94,0.75)] px-4 max-w-sm">
                  Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
                </p>
              </div>

              {/* Primary Button */}
              <Link href="/assignments/create" className="flex-shrink-0">
                <button className="box-border flex flex-row items-center justify-center px-[24px] py-[12px] gap-[4px] w-[277px] h-[46px] bg-[#181818] hover:bg-black rounded-[48px] text-white font-bricolage font-medium text-[16px] tracking-[-0.04em] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-black/20">
                  <Plus className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="w-[205px] h-[22px] font-bricolage font-medium text-[16px] leading-[140%] tracking-[-0.04em] text-white flex items-center justify-center">Create Your First Assignment</span>
                </button>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Filled State Layout (Dynamically Resizable & Scrollable Container) */}
          <div className="hidden lg:flex flex-col w-full max-w-[1100px] h-[calc(100vh-160px)] mx-auto p-0 relative font-bricolage bg-gradient-to-b from-[#EEEEEE] to-[#DADADA] rounded-[24px] border border-gray-200/50 shadow-inner overflow-hidden select-none">
            {/* Background Blur Ellipse 16 */}
            <div 
              className="absolute w-[1113px] h-[428px] bg-[#4C4C4C]/40 blur-[200px] pointer-events-none rounded-full"
              style={{
                left: "calc(50% - 1113px/2 + 163.5px)",
                top: "560px"
              }}
            />
            
            {/* Main Content Area (Frame 1984077326) */}
            <div className="relative z-10 w-full px-8 py-6 flex flex-col items-start h-full overflow-hidden">
              
              {/* Header Row (Frame 1984077332) */}
              <div className="flex flex-row items-center gap-[16px] w-full h-[50px] flex-shrink-0">
                {/* Status Dot Ellipse 10 */}
                <div 
                  className="w-[12px] h-[12px] rounded-full bg-[#4BC26D] border-[4px] border-[#4BC26D]/40 shadow-xl flex-shrink-0"
                  style={{
                    boxShadow: "0px 16px 48px rgba(0, 0, 0, 0.12), 0px 32px 48px rgba(0, 0, 0, 0.2)"
                  }}
                />
                
                {/* Title & Subtitle (Frame 1984077347) */}
                <div className="flex flex-col justify-center items-start gap-[2px] w-[301px] h-[50px] flex-shrink-0">
                  <h2 className="w-[121px] h-[28px] font-bricolage font-bold text-[20px] leading-[140%] tracking-[-0.04em] text-[#303030]">
                    Assignments
                  </h2>
                  <p className="w-[301px] h-[20px] font-bricolage font-normal text-[14px] leading-[140%] tracking-[-0.04em] text-[rgba(94,94,94,0.55)]">
                    Manage and create assignments for your classes.
                  </p>
                </div>
              </div>

              {/* Filter & Search Bar Row (Default) */}
              <div className="flex flex-row justify-between items-center px-[16px] w-full h-[64px] bg-white rounded-[20px] shadow-sm flex-shrink-0 mt-4">
                {/* Filter By Button */}
                <div className="flex flex-row items-center gap-[4px] w-[90px] h-[20px] select-none cursor-pointer">
                  <Filter className="w-[20px] h-[20px] text-[#A9A9A9]" />
                  <span className="font-bricolage font-bold text-[14px] leading-[140%] tracking-[-0.04em] text-[#A9A9A9]">
                    Filter By
                  </span>
                </div>

                {/* Search Box */}
                <div className="box-border flex flex-row items-center px-[16px] py-[11px] gap-[10px] w-[380px] h-[44px] border border-black/20 rounded-[100px] bg-white">
                  <Search className="w-[20px] h-[20px] text-[#A9A9A9]" />
                  <input
                    type="text"
                    placeholder="Search Assignment"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent font-bricolage font-bold text-[14px] leading-[140%] tracking-[-0.04em] text-[#A9A9A9] focus:outline-none placeholder-[#A9A9A9]"
                  />
                </div>
              </div>

              {/* Cards Grid (Scrollable Container in Desktop View) */}
              <ErrorBoundary fallback={<div className="p-6 text-center text-red-600 font-bold border border-red-200 rounded-xl">Failed to load assignments.</div>}>
                <div className="w-full flex-grow overflow-y-auto pr-1 pb-[100px] mt-6 select-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {filteredAssignments.map((assignment: Assignment) => (
                      <div
                        key={assignment.id}
                        className="bg-white rounded-[24px] p-6 w-full max-w-[542px] h-[162px] flex flex-col justify-between items-start shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative"
                      >
                        {/* Top Row: Title & Action */}
                        <div className="flex flex-row justify-between items-center w-full">
                          <Link href={`/assignments/${assignment.id}`} className="group max-w-[418px]">
                            <h4 className="font-bricolage font-extrabold text-[24px] leading-[120%] tracking-[-0.04em] text-[#303030] group-hover:text-[#F15A22] transition-colors line-clamp-1">
                              {assignment.title}
                            </h4>
                          </Link>

                          {/* Options Menu Toggle */}
                          <div className="relative">
                            <button
                              onClick={(e) => toggleMenu(assignment.id, e)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-55 transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-[#A9A9A9]" />
                            </button>

                            {/* Dropdown menu */}
                            {activeMenu === assignment.id && (
                              <div className="absolute right-0 mt-1.5 w-[160px] bg-white rounded-xl shadow-[0px_16px_48px_rgba(0,0,0,0.15),0px_4px_12px_rgba(0,0,0,0.05)] border border-gray-150/45 p-1.5 z-30 text-xs flex flex-col gap-0.5 animate-fadeIn">
                                <Link
                                  href={`/assignments/${assignment.id}`}
                                  className="block px-2.5 py-1.5 rounded-lg text-xs text-[#303030] font-bricolage font-semibold hover:bg-[#F6F6F6] transition-colors"
                                >
                                  View Assignment
                                </Link>
                                <button
                                  onClick={() => handleDelete(assignment.id, assignment.title)}
                                  className="w-full text-left block px-2.5 py-1.5 rounded-lg text-xs text-[#C53535] font-bricolage font-semibold hover:bg-red-50 transition-colors border-t border-gray-100 mt-0.5"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Dates */}
                        <div className="flex flex-row justify-between items-center w-full text-sm select-none">
                          <div className="font-bricolage font-extrabold text-[16px] leading-[120%] tracking-[-0.04em] text-[#303030]">
                            Assigned on : {assignment.assignedDate}
                          </div>
                          <div className="font-bricolage font-extrabold text-[16px] leading-[120%] tracking-[-0.04em] text-[#303030]">
                            Due : {assignment.dueDate}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ErrorBoundary>
            </div>

            {/* Desktop Floating Action Bar (Frame 1618872447 - Stay Floating at Bottom of Container) */}
            <div 
              className="absolute bottom-0 left-0 w-full h-[73px] flex flex-col justify-center items-center py-[10px] px-0 z-20 rounded-b-[24px] pointer-events-none"
              style={{
                background: "linear-gradient(176.12deg, rgba(234, 234, 234, 0) 3.17%, rgba(218, 218, 218, 0.35) 81.22%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)"
              }}
            >
              <Link href="/assignments/create" className="pointer-events-auto">
                <button className="flex flex-row items-center justify-center px-[24px] py-[12px] gap-[4px] h-[46px] bg-[#181818] hover:bg-black rounded-[48px] text-white font-bricolage font-medium text-[16px] tracking-[-0.04em] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-black/10">
                  <Plus className="w-5 h-5 text-white" />
                  <span className="font-bricolage font-medium text-[16px] leading-[140%] tracking-[-0.04em] text-white">Create Assignment</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Mobile Filled State Layout (Content flows beautifully within LayoutWrapper) */}
          <div className="lg:hidden w-full flex flex-col py-6 select-none font-bricolage">
            <div className="w-full max-w-md mx-auto flex flex-col p-0 gap-[24px] px-4">
              {/* Back Arrow & Title Row */}
              <div className="flex items-center space-x-3 select-none w-full px-2 flex-shrink-0">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white hover:bg-gray-150 transition-colors flex items-center justify-center text-gray-700 shadow-sm border border-gray-150/30">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-bricolage font-bold text-[20px] text-[#303030]">
                  Assignments
                </h3>
              </div>

              {/* Filter and Search Card */}
              <div className="bg-white rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm select-none border border-gray-150/30 w-full flex-shrink-0">
                <span className="text-sm font-semibold text-gray-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </span>
                <input
                  type="text"
                  placeholder="Search Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 pr-2 py-1.5 border border-gray-200 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-[#F15A22] bg-white shadow-sm font-medium w-40"
                />
              </div>

              {/* Vertical Stack of Cards */}
              <div className="w-full flex flex-col space-y-4">
                {filteredAssignments.map((assignment: Assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-white rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative w-full animate-fadeIn"
                  >
                    <div className="flex justify-between items-start">
                      <Link href={`/assignments/${assignment.id}`} className="group flex-1 mr-4">
                        <h4 className="font-bricolage font-bold text-lg text-[#303030] group-hover:text-[#F15A22] transition-colors">
                          {assignment.title}
                        </h4>
                      </Link>

                      <div className="relative">
                        <button
                          onClick={(e) => toggleMenu(assignment.id, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenu === assignment.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg p-1.5 z-30 text-xs flex flex-col gap-1 border border-gray-100">
                            <Link href={`/assignments/${assignment.id}`} className="px-2.5 py-1.5 text-gray-700 hover:bg-gray-55 rounded font-bricolage font-medium">
                              View
                            </Link>
                            <button onClick={() => handleDelete(assignment.id, assignment.title)} className="w-full text-left px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded border-t border-gray-50 font-bricolage font-medium">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-[13px] font-bricolage font-bold text-[#303030]">
                      <div>
                        Assigned on : {assignment.assignedDate}
                      </div>
                      <div>
                        Due : {assignment.dueDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
