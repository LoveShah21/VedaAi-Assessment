'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAssignmentStore } from '../../store/useAssignmentStore';

interface Props {
  countdown: number;
}

export const GenerationProgress: React.FC<Props> = ({ countdown }) => {
  const currentJob = useAssignmentStore((state) => state.currentJob);

  if (!currentJob) return null;

  // Determine active checkpoint based on progress
  const getCheckpointClass = (minProgress: number) => {
    if (currentJob.progress >= minProgress) return "text-brand-orange border-brand-orange bg-orange-50 font-bold";
    return "text-gray-400 border-gray-200 bg-white";
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-150 p-8 md:p-12 shadow-sm font-sans flex flex-col items-center justify-center space-y-8 my-10 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3.5 bg-orange-50 rounded-full text-brand-orange border border-orange-100 animate-pulseSlow">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-brand-dark">Generating Assessment</h3>
        <p className="text-sm text-brand-secondary">
          VedaAI is building a syllabus-aligned exam. This might take a minute.
        </p>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-brand-dark">
          <span>Progress Status</span>
          <span>{currentJob.progress}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-brand-orange to-[#ff7d4d] transition-all duration-500 ease-out" 
            style={{ width: `${currentJob.progress}%` }}
          />
        </div>
      </div>

      {/* Step checkpoints tracker */}
      <div className="w-full grid grid-cols-3 gap-2 text-center text-xs">
        <div className="flex flex-col items-center space-y-1.5">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(15)}`}>
            1
          </div>
          <span className="font-medium text-brand-dark">Reading File</span>
        </div>
        <div className="flex flex-col items-center space-y-1.5">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(55)}`}>
            2
          </div>
          <span className="font-medium text-brand-dark">Drafting Qs</span>
        </div>
        <div className="flex flex-col items-center space-y-1.5">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${getCheckpointClass(90)}`}>
            3
          </div>
          <span className="font-medium text-brand-dark">Answer Key</span>
        </div>
      </div>

      {/* Terminal Logs Box */}
      <div className="w-full bg-brand-dark text-gray-200 p-4 rounded-xl text-[11px] font-mono h-40 overflow-y-auto border border-gray-800 shadow-inner flex flex-col space-y-1">
        {currentJob.logs.map((log, index) => (
          <div key={index} className="flex items-start">
            <span className="text-brand-orange mr-1.5">&gt;</span>
            <span className="text-gray-200">{log}</span>
          </div>
        ))}
        {/* Blinking cursor on last line */}
        <div className="flex items-center">
          <span className="text-brand-orange mr-1.5">&gt;</span>
          <span className="inline-block w-1.5 h-3.5 bg-brand-orange animate-pulse rounded-sm" />
        </div>
        {/* Scroll target */}
        <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
      </div>

      <div className="text-[11px] text-brand-secondary flex flex-col items-center space-y-1 justify-center">
        <div className="flex items-center space-x-1 justify-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Realtime generator pipeline active</span>
        </div>
        <p className="text-xs font-semibold text-brand-secondary text-center mt-1">
          Estimated time: {countdown}s remaining
        </p>
      </div>
    </div>
  );
};
