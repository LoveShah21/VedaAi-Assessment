"use client";

import React, { useEffect, useState } from "react";
import { useAssignmentStore, Assignment } from "../../../../store/useAssignmentStore";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PageProps {
  params: {
    id: string;
  };
}

const printStyles = `
  @media print {
    @page {
      margin: 0;
      size: A4 portrait;
    }
    body {
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print { display: none !important; }
    .no-print-bg { background: white !important; padding: 0 !important; }
    .print-container {
      padding: 22mm 18mm !important;
      box-shadow: none !important;
      border: none !important;
    }
  }
`;

export default function PrintPreviewPage({ params }: PageProps) {
  const router = useRouter();
  const assignments = useAssignmentStore((state) => state.assignments);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      const local = assignments.find((a) => a.id === params.id);
      let loadedAss = local || null;

      try {
        if (!loadedAss) {
          const res = await axios.get(`${API_URL}/api/assignments/${params.id}`);
          if (res.data && res.data.assignment) {
            const backendAss = res.data.assignment;
            loadedAss = {
              id: backendAss._id,
              title: backendAss.title,
              subject: backendAss.subject,
              grade: backendAss.className,
              dueDate: new Date(backendAss.dueDate).toISOString().split("T")[0],
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
              versionHistory: backendAss.versionHistory || [],
            };
          }
        }

        if (loadedAss) {
          setAssignment(loadedAss);

          const urlParams = new URLSearchParams(window.location.search);
          const versionParam = urlParams.get("version") || loadedAss.version || 1;
          const includeAnswerKeyParam =
            urlParams.get("includeAnswerKey") === "true" ||
            urlParams.get("showAnswerKeys") === "true" ||
            loadedAss.includeAnswerKey;

          setShowAnswerKeys(includeAnswerKeyParam);

          const resRes = await axios.get(
            `${API_URL}/api/assignments/${params.id}/results?version=${versionParam}`
          );
          if (resRes.data) {
            if (resRes.data.result) {
              setResult(resRes.data.result);
            } else {
              setResult(resRes.data);
            }
          }
        }
      } catch (err) {
        console.error("Could not load preview assignment or result:", err);
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

  if (!assignment || !result) {
    return (
      <div className="p-8 text-center bg-gray-55 min-h-screen text-sm text-red-505 font-bold flex flex-col justify-center items-center space-y-4">
        <span className="text-red-500 text-3xl">⚠️</span>
        <p className="text-brand-dark">Assessment or questions file not found or still generating.</p>
        <button
          onClick={() => router.push(`/assignments`)}
          className="px-4 py-2 bg-brand-orange text-white rounded-lg text-xs font-semibold"
        >
          Back to Assignments
        </button>
      </div>
    );
  }

  const maxMarks = result.totalMarks || 0;

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = " ";
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  };

  return (
    <>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Print Preview - {assignment.title}</title>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
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
          <label className="flex items-center space-x-1.5 text-xs font-semibold text-brand-dark cursor-pointer">
            <input
              type="checkbox"
              checked={showAnswerKeys}
              onChange={(e) => setShowAnswerKeys(e.target.checked)}
              className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>Print Answer Key</span>
          </label>
          <span className="text-xs text-brand-secondary font-medium border-l pl-3 border-gray-200">
            A4 Portrait · No headers/footers
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="bg-gray-100 min-h-screen py-8 px-4 no-print-bg">
        <div className="print-container max-w-[800px] mx-auto bg-white shadow-md p-10 md:p-14 font-serif text-[#1A1A1A]">

          {/* ===== PAPER HEADER — centered school info (matches reference) ===== */}
          <div className="text-center mb-4">
            <h1 className="text-xl md:text-2xl font-extrabold uppercase">
              {assignment.schoolName || "Veda International School"}
            </h1>
            <p className="text-sm font-bold uppercase mt-1">
              {assignment.title}
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {assignment.grade} &nbsp;|&nbsp; {assignment.subject}
            </p>
          </div>

          <hr className="border-t border-[#1A1A1A] mb-0" />

          {/* ===== EXAM METADATA ROW ===== */}
          <div className="flex justify-between items-center text-sm font-bold text-[#1A1A1A] py-2">
            <span>Time Allowed: {assignment.timeAllowed} Minutes</span>
            <span>Maximum Marks: {maxMarks} Marks</span>
          </div>

          <hr className="border-t border-[#1A1A1A] mb-3" />

          {/* ===== GENERAL INSTRUCTIONS ===== */}
          <p className="text-xs italic text-[#374151] mb-4">
            General Instructions: Read all questions carefully. All questions are compulsory unless stated otherwise.
          </p>

          {/* ===== STUDENT DETAILS — plain text lines (matches reference) ===== */}
          <div className="text-sm font-semibold text-[#1A1A1A] space-y-2 mb-8">
            <div className="flex items-center gap-1">
              <span>Student Name:</span>
              <span className="inline-block flex-1 border-b border-black ml-1 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span>Roll Number:</span>
              <span className="inline-block w-40 border-b border-black ml-1 h-4" />
            </div>
          </div>

          {/* ===== QUESTION SECTIONS ===== */}
          <div className="space-y-10">
            {result.sections?.map((section: any, sIdx: number) => (
              <div key={sIdx} className="break-inside-avoid">

                {/* Section heading: bold, left-aligned with underline (matches reference) */}
                <div className="border-b border-[#1A1A1A] pb-1 mb-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide">
                    {section.title} — {section.questionType}
                  </h2>
                </div>

                {/* Italic instruction line */}
                <p className="text-xs italic text-[#1A1A1A] mb-4">
                  {section.instruction}
                </p>

                {/* Questions — matches reference: "1. Write an essay... (MODERATE) [10 Marks]" */}
                <div className="space-y-3">
                  {section.questions?.map((q: any) => (
                    <div key={q.number} className="flex items-start gap-2 text-sm leading-relaxed">
                      <span className="font-bold flex-shrink-0 w-7 text-right">{q.number}.</span>
                      <div className="flex-grow flex items-start justify-between gap-3">
                        <span>
                          {q.text}
                          {" "}
                          <span className="text-[11px] font-semibold uppercase text-[#6B7280]">
                            ({q.difficulty})
                          </span>
                        </span>
                        <span className="flex-shrink-0 font-bold border border-[#1A1A1A] rounded px-2 py-0.5 text-xs whitespace-nowrap">
                          [{q.marks} {q.marks === 1 ? "Mark" : "Marks"}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ===== END OF PAPER ===== */}
          <p className="text-center font-bold text-xs mt-16 pt-4 text-[#6B7280] uppercase tracking-widest">
            *** End of Assessment ***
          </p>

          {/* ===== ANSWER KEY (when enabled) ===== */}
          {showAnswerKeys && result.sections && (
            <div className="mt-12 pt-6 border-t-2 border-dashed border-black font-sans break-before-page">
              <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">
                Answer Key:
              </h3>
              <div className="space-y-6">
                {result.sections.map((section: any) => (
                  <div key={section.title}>
                    <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                      {section.title}
                    </h4>
                    <ol className="list-decimal list-outside pl-5 space-y-3 text-sm">
                      {section.questions?.map((q: any) => (
                        <li key={q.number} className="leading-relaxed text-[#1A1A1A]">
                          {q.answer || "No answer key provided."}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
