"use client";

import React from "react";
import { BookOpen, FileText, Users, Download, Star, Lightbulb, BarChart2, Zap } from "lucide-react";
import Link from "next/link";

const resources = [
  {
    icon: BookOpen,
    title: "Bloom's Taxonomy Guide",
    description: "Understand cognitive levels from recall to synthesis. Align your questions directly to curriculum objectives.",
    color: "bg-orange-50 text-[#F15A22] border-orange-100 group-hover:bg-[#F15A22] group-hover:text-white",
    href: "/toolkit/blooms-guide"
  },
  {
    icon: FileText,
    title: "Question Types Reference",
    description: "Comprehensive guide to MCQ, short answer, essay, and true/false formats with standard examples.",
    color: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white",
    href: "/toolkit/question-types"
  },
  {
    icon: BarChart2,
    title: "Grading Rubrics",
    description: "Ready-to-use rubric templates for essays, projects, and practical assessments.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    href: "/toolkit/rubrics"
  },
  {
    icon: Star,
    title: "Syllabus Templates",
    description: "Pre-built syllabus structures for CBSE, IB, and GCSE frameworks across subjects.",
    color: "bg-purple-50 text-purple-650 border-purple-100 group-hover:bg-purple-650 group-hover:text-white",
    href: "/toolkit/syllabus-templates"
  },
  {
    icon: Lightbulb,
    title: "Assessment Best Practices",
    description: "Evidence-based strategies for designing fair, effective, and engaging classroom assessments.",
    color: "bg-amber-50 text-amber-650 border-amber-100 group-hover:bg-amber-650 group-hover:text-white",
    href: "/toolkit/best-practices"
  },
  {
    icon: Download,
    title: "PDF Export Guide",
    description: "Learn how to customize and export your assessments as print-ready PDF documents.",
    color: "bg-teal-50 text-teal-650 border-teal-100 group-hover:bg-teal-650 group-hover:text-white",
    href: "/toolkit/pdf-guide"
  },
  {
    icon: Users,
    title: "Group Roster Tips",
    description: "Strategies for organizing student groups and tracking class progress effectively.",
    color: "bg-rose-50 text-rose-650 border-rose-100 group-hover:bg-rose-650 group-hover:text-white",
    href: "/toolkit/group-tips"
  },
  {
    icon: Zap,
    title: "AI Prompting Guide",
    description: "Get the best results from VedaAI with proven prompt structures and classroom examples.",
    color: "bg-indigo-50 text-indigo-650 border-indigo-100 group-hover:bg-indigo-650 group-hover:text-white",
    href: "/toolkit/prompt-guide"
  }
];

export default function ToolkitPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans px-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] font-bricolage tracking-tight">AI Teacher's Toolkit &amp; Resources</h2>
          <p className="text-sm text-brand-secondary font-medium">
            Interactive guides, templates, and reference tools to help you design better curriculum assessments.
          </p>
        </div>
        <div>
          <span className="bg-gradient-to-r from-[#F15A22] to-[#FF8C00] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-md animate-pulseSlow inline-block">
            Updates Daily
          </span>
        </div>
      </div>

      {/* Highlight Banner - Redesigned with premium background & borders */}
      <div className="relative bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-black rounded-3xl p-6 text-white overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 rounded-full bg-[#F15A22] opacity-[0.12] blur-2xl" />
        <div className="relative z-10 space-y-2 max-w-3xl">
          <p className="text-[10px] font-black text-[#F15A22] uppercase tracking-wider">Active Resource Hub</p>
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight font-bricolage leading-tight">Everything you need to teach and assess smarter</h3>
          <p className="text-xs text-gray-300 leading-relaxed max-w-2xl font-medium">
            Explore active guides, curated structures, and syllabus generators built directly to elevate standard school assessment design. Choose any reference card below.
          </p>
        </div>
      </div>

      {/* Resource Cards Grid - Redesigned with HSL glass card items and dynamic hover fills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <div
              key={resource.title}
              className="bg-white/85 backdrop-blur-md rounded-2xl border border-gray-150/60 p-5 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-6px_rgba(241,90,34,0.08)] hover:border-[#F15A22]/20 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group cursor-pointer"
            >
              <div className="space-y-3.5">
                {/* Colored icon box that fills with color on card hover */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border border-gray-200/40 shadow-sm transition-all duration-300 ${resource.color}`}>
                  <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-brand-dark leading-tight group-hover:text-[#F15A22] transition-colors font-sans tracking-tight">
                    {resource.title}
                  </h4>
                  <p className="text-[11px] text-brand-secondary font-medium leading-relaxed">
                    {resource.description}
                  </p>
                </div>
              </div>

              <Link
                href={resource.href}
                className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold text-brand-dark hover:text-white hover:bg-[#1A1A1A] border border-gray-200/80 rounded-xl transition-all duration-200 text-center active:scale-95 shadow-sm"
              >
                Explore Guide
              </Link>
            </div>
          );
        })}
      </div>

      {/* Suggest a Tool Footer - Elevated style */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-150/60 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs md:text-sm font-bold text-brand-secondary">
          💡 VedaAI is continuously expanding the Teacher Toolkit. Have a specific syllabus target?
        </p>
        <span 
          onClick={() => alert("Suggestion feature is coming soon!")}
          className="bg-orange-50 hover:bg-[#F15A22]/10 text-[#F15A22] border border-orange-150 text-xs font-extrabold px-5 py-2 rounded-full cursor-pointer transition-colors active:scale-95 select-none"
        >
          Suggest a tool
        </span>
      </div>
    </div>
  );
}
