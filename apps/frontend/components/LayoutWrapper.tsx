"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ToastContainer from "./ToastContainer";
import { 
  Menu, 
  X, 
  Plus, 
  LayoutGrid, 
  FileText, 
  BookOpen, 
  Sparkles 
} from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Set up background Socket.IO listeners
  useWebSocket();

  useEffect(() => {
    const handleOpen = () => setSidebarOpen(true);
    window.addEventListener("open-sidebar", handleOpen);
    return () => window.removeEventListener("open-sidebar", handleOpen);
  }, []);

  const isMobileAssignments = pathname === "/assignments";
  const isCreatePage = pathname === "/assignments/create";

  const isPreviewPage = pathname.match(/^\/assignments\/[^\/]+\/preview$/);

  if (isPreviewPage) {
    return (
      <div className="min-h-screen bg-white text-[#1A1A1A] font-sans">
        {children}
        <ToastContainer />
      </div>
    );
  }

  const isHomeActive = pathname === "/";
  const isAssignmentsActive = pathname.startsWith("/assignments");
  const isLibraryActive = pathname.startsWith("/library");
  const isToolkitActive = pathname.startsWith("/toolkit");

  return (
    <div className="h-screen overflow-hidden text-[#1A1A1A] flex font-sans bg-gradient-to-b from-[#EEEEEE] to-[#DADADA]">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden lg:block w-[328px] flex-shrink-0 relative">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:hidden w-[260px] flex-shrink-0 bg-white shadow-xl`}
      >
        <div className="absolute top-3.5 right-4 z-50">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar />
      </div>

      {/* Main Container */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* Desktop Floating Header (hidden on mobile) — glassmorphism floating pill */}
        <div className="hidden lg:flex items-center absolute top-4 left-4 right-4 z-30 flex-shrink-0 pointer-events-none">
          <div
            className="flex-1 rounded-2xl border border-white/60 pointer-events-auto"
            style={{
              background: "linear-gradient(176.12deg, rgba(234,234,234,0.45) 3.17%, rgba(218,218,218,0.75) 81.22%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)"
            }}
          >
            <Header />
          </div>
        </div>

        {/* Premium Mobile Floating Header (visible on mobile, hidden on desktop) */}
        <div className="lg:hidden w-full max-w-md px-4 mt-3 z-30 flex justify-center mx-auto flex-shrink-0">
          <div className="w-full h-[64px] bg-white rounded-[24px] shadow-[0px_4px_16px_rgba(0,0,0,0.04)] border border-gray-150/40 px-4 flex flex-row items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-[30px] h-[30px] rounded-lg bg-[#303030] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <span className="font-sans font-black">V</span>
              </div>
              <span className="font-bricolage font-bold text-[18px] tracking-[-0.04em] text-[#303030]">VedaAI</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-[30px] h-[30px] rounded-full bg-gray-50 flex items-center justify-center text-gray-500 cursor-pointer">
                <span className="text-sm">🔔</span>
                <span className="absolute top-[2px] right-[2px] w-[7px] h-[7px] rounded-full bg-[#FF5623]" />
              </div>
              
              <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-gray-200 cursor-pointer">
                <img 
                  src="/Component 1-1.png" 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { 
                    e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"; 
                  }} 
                />
              </div>
              
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1 text-gray-700 hover:text-black active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Layout Output wrapper */}
        <main className="flex-grow overflow-y-auto lg:p-8 lg:pt-24 p-4 pb-32 lg:pb-8 flex flex-col">
          {children}
        </main>
      </div>

      {/* Premium Mobile Floating Bottom Navigation (visible on mobile, hidden on desktop) */}
      {!isCreatePage && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-35 pb-4 pt-4 bg-gradient-to-t from-[#DADADA] via-[#DADADA]/95 to-transparent flex flex-col items-center pointer-events-none">
          {/* Floating plus button '+' */}
          <div className="w-full max-w-md px-6 flex justify-end mb-3 pointer-events-auto">
            <Link href="/assignments/create">
              <button 
                className="w-[52px] h-[52px] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[#F15A22] border border-gray-150/40"
                aria-label="Create Assignment"
              >
                <Plus className="w-6 h-6 text-[#F15A22]" />
              </button>
            </Link>
          </div>

          {/* Floating Bottom Nav Bar */}
          <div className="w-[calc(100%-32px)] max-w-[361px] bg-[#181818] rounded-[28px] h-[64px] px-6 flex items-center justify-between shadow-xl border border-white/5 pointer-events-auto">
            {/* Home tab */}
            <Link 
              href="/"
              className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${isHomeActive ? "opacity-100 font-semibold" : "opacity-40 hover:opacity-100"}`}
            >
              <LayoutGrid className="w-5 h-5 text-white" />
              <span className="text-[11px] font-medium tracking-tight font-sans text-white">Home</span>
            </Link>
            
            {/* Assignments tab */}
            <Link 
              href="/assignments"
              className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${isAssignmentsActive ? "opacity-100 font-semibold" : "opacity-40 hover:opacity-100"}`}
            >
              <FileText className="w-5 h-5 text-white" />
              <span className="text-[11px] font-medium tracking-tight font-sans text-white">Assignments</span>
            </Link>
            
            {/* Library tab */}
            <Link 
              href="/library"
              className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${isLibraryActive ? "opacity-100 font-semibold" : "opacity-40 hover:opacity-100"}`}
            >
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-[11px] font-medium tracking-tight font-sans text-white">Library</span>
            </Link>
            
            {/* Toolkit tab */}
            <Link 
              href="/toolkit"
              className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${isToolkitActive ? "opacity-100 font-semibold" : "opacity-40 hover:opacity-100"}`}
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-[11px] font-medium tracking-tight font-sans text-white">AI Toolkit</span>
            </Link>
          </div>

          {/* Home Indicator bar */}
          <div className="w-full h-[12px] flex items-center justify-center mt-2">
            <div className="w-[135px] h-[5px] bg-[#7A7A7A]/60 rounded-full" />
          </div>
        </div>
      )}

      {/* Persistent Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
