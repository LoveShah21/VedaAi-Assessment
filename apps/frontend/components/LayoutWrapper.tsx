"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ToastContainer from "./ToastContainer";
import { Menu, X } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set up background Socket.IO listeners
  useWebSocket();

  return (
    <div className="min-h-screen bg-brand-bg text-[#1A1A1A] flex font-sans">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden lg:block w-[260px] flex-shrink-0">
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
      <div className="flex-grow flex flex-col min-w-0">
        {/* Responsive Header container */}
        <div className="flex items-center bg-white sticky top-0 z-20 border-b border-gray-150">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden ml-4 p-2 rounded-lg text-brand-dark hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          <div className="flex-1">
            <Header />
          </div>
        </div>

        {/* Scrollable Layout Output wrapper */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-brand-bg">
          {children}
        </main>
      </div>

      {/* Persistent Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
