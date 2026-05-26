"use client";

import React from "react";
import { BookOpen, FileText, Users, Download, Star, Lightbulb, BarChart2, Zap } from "lucide-react";
import Link from "next/link";

const resources = [
  {
    icon: BookOpen,
    title: "Bloom's Taxonomy Guide",
    description: "Understand cognitive levels from recall to synthesis. Align your questions to curriculum objectives.",
    color: "bg-orange-50 text-brand-orange border-orange-100",
    href: "/toolkit/blooms-guide"
  },
  {
    icon: FileText,
    title: "Question Types Reference",
    description: "Comprehensive guide to MCQ, short answer, essay, and true/false formats with examples.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    href: "/toolkit/question-types"
  },
  {
    icon: BarChart2,
    title: "Grading Rubrics",
    description: "Ready-to-use rubric templates for essays, projects, and practical assessments.",
    color: "bg-green-50 text-green-600 border-green-100",
    href: "/toolkit/rubrics"
  },
  {
    icon: Star,
    title: "Syllabus Templates",
    description: "Pre-built syllabus structures for CBSE, IB, and GCSE frameworks across subjects.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    href: "/toolkit/syllabus-templates"
  },
  {
    icon: Lightbulb,
    title: "Assessment Best Practices",
    description: "Evidence-based strategies for designing fair, effective, and engaging assessments.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    href: "/toolkit/best-practices"
  },
  {
    icon: Download,
    title: "PDF Export Guide",
    description: "Learn how to customize and export your assessments as print-ready PDF documents.",
    color: "bg-teal-50 text-teal-600 border-teal-100",
    href: "/toolkit/pdf-guide"
  },
  {
    icon: Users,
    title: "Group Management Tips",
    description: "Strategies for organizing student groups and tracking class progress effectively.",
    color: "bg-rose-50 text-rose-600 border-rose-100",
    href: "/toolkit/group-tips"
  },
  {
    icon: Zap,
    title: "AI Prompting Guide",
    description: "Get the best results from VedaAI with proven prompt structures and examples.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    href: "/toolkit/prompt-guide"
  }
];

export default function ToolkitPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">AI Teacher's Toolkit &amp; Resources</h2>
          <p className="text-sm text-brand-secondary">
            Interactive guides, templates, and reference tools to help you create better assessments.
          </p>
        </div>
        <div>
          <span className="bg-[#F15A22] text-white text-xs font-semibold px-3 py-1 rounded-full animate-pulse inline-block">
            Updates Daily
          </span>
        </div>
      </div>

      {/* Highlight Banner */}
      <div className="bg-gradient-to-r from-brand-dark to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden border border-gray-800 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 rounded-full bg-[#F15A22] opacity-10 blur-xl" />
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <p className="text-xs font-bold text-[#F15A22] uppercase tracking-wider">Resource Hub</p>
          <h3 className="text-xl font-extrabold tracking-tight">Everything you need to teach smarter</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Explore active guides, curated structures, and assessment generators built directly to elevate standard school assessment design.
          </p>
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <div
              key={resource.title}
              className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md hover:border-brand-orange/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${resource.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-brand-dark leading-tight group-hover:text-brand-orange transition-colors">
                    {resource.title}
                  </h4>
                  <p className="text-[11px] text-brand-secondary leading-relaxed">
                    {resource.description}
                  </p>
                </div>
              </div>

              <Link
                href={resource.href}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-brand-orange bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-lg transition-colors text-center"
              >
                Explore Guide
              </Link>
            </div>
          );
        })}
      </div>

      {/* Coming Soon Footer */}
      <div className="bg-white rounded-xl border border-gray-150 p-5 text-center shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm font-semibold text-brand-secondary">
          VedaAI is continuously expanding the Teacher Toolkit to build custom syllabus alignments.
        </p>
        <span className="bg-orange-50 text-brand-orange border border-orange-150 text-xs font-semibold px-3 py-1.5 rounded-full">
          💡 Suggest a tool
        </span>
      </div>
    </div>
  );
}
