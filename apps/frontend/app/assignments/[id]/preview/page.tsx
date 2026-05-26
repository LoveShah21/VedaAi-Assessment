"use client";

import React, { useEffect, useState } from "react";
import { useAssignmentStore, Assignment } from "../../../../store/useAssignmentStore";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PageProps {
  params: {
    id: string;
  };
}

export default function PrintPreviewPage({ params }: PageProps) {
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      // Check Zustand store first
      const local = assignments.find((a) => a.id === params.id);
      if (local) {
        setAssignment(local);
        setLoading(false);
        return;
      }

      // Query database fallback
      try {
        const res = await axios.get(`${API_URL}/api/assignments/${params.id}`);
        if (res.data) {
          setAssignment(res.data);
        }
      } catch (err) {
        console.error("Could not load preview assignment:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [params.id, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-sm text-brand-secondary">
        Preparing exam print layouts...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-screen text-sm text-red-500 font-bold">
        Assessment file not found.
      </div>
    );
  }

  const maxMarks = assignment.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

  return (
    <>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Print Preview - {assignment.title}</title>
      </head>

      {/* Floating Controller Panel (no-print) */}
      <div className="no-print bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button
          onClick={() => router.push(`/assignments/${assignment.id}`)}
          className="flex items-center space-x-1.5 px-3 py-1.5 border border-gray-250 hover:bg-gray-50 rounded-lg text-xs font-semibold text-brand-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assessment</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-brand-secondary font-medium">
            Page layout: A4 Portrait • Prints without headers & sidebars
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="bg-gray-100 min-h-screen py-8 px-4 no-print-bg">
        <div className="print-container max-w-[800px] mx-auto bg-white border border-gray-200 shadow-md p-10 md:p-14 font-serif text-[#1A1A1A]">
          
          {/* School Header Layout */}
          <div className="text-center space-y-2 border-b-2 border-black pb-4">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
              {assignment.schoolName || "Veda International School"}
            </h1>
            <h2 className="text-sm font-bold tracking-widest uppercase">
              {assignment.title}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-semibold pt-2 text-left">
              <div>Subject: <span className="underline">{assignment.subject}</span></div>
              <div>Grade Level: <span className="underline">{assignment.grade}</span></div>
              <div>Time Allowed: <span className="underline">{assignment.timeAllowed} minutes</span></div>
              <div>Max Marks: <span className="underline">{maxMarks} Marks</span></div>
            </div>
          </div>

          {/* Student details blanks */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs font-semibold border-b border-black mb-8">
            <div className="flex">
              <span>Student Name:</span>
              <div className="flex-1 border-b border-dashed border-black ml-2" />
            </div>
            <div className="flex">
              <span>Roll Number:</span>
              <div className="flex-1 border-b border-dashed border-black ml-2" />
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-8">
            {assignment.questions?.map((question, index) => (
              <div key={question.id} className="space-y-3 text-sm break-inside-avoid">
                <div className="flex justify-between items-start font-medium">
                  <div className="flex space-x-1.5">
                    <span className="font-bold">{index + 1}.</span>
                    <span className="whitespace-pre-wrap leading-relaxed">{question.questionText}</span>
                  </div>
                  <span className="font-bold pl-4 text-xs whitespace-nowrap">
                    [{question.marks} {question.marks === 1 ? "Mark" : "Marks"}]
                  </span>
                </div>

                {/* Question Type Options or Empty Lines */}
                {question.options && question.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    {question.options.map((option, optIdx) => {
                      const label = String.fromCharCode(65 + optIdx); // A, B, C, D
                      return (
                        <div key={optIdx} className="flex items-center space-x-2">
                          <span className="font-bold text-xs">({label})</span>
                          <span>{option}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty Lines for Short/Long Answer Questions */}
                {(!question.options || question.options.length === 0) && (
                  <div className="pl-6 space-y-2.5 pt-1.5">
                    {question.type === "Long Answer" ? (
                      [...Array(6)].map((_, i) => (
                        <div key={i} className="border-b border-dashed border-gray-300 h-5" />
                      ))
                    ) : (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="border-b border-dashed border-gray-300 h-5" />
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer of assessment */}
          <div className="text-center text-[10px] text-gray-400 mt-16 pt-4 border-t border-gray-100 uppercase tracking-widest break-inside-avoid">
            *** End of Assessment ***
          </div>

        </div>
      </div>
    </>
  );
}
