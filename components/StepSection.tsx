import React from 'react';

interface StepSectionProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export const StepSection: React.FC<StepSectionProps> = ({ number, title, children }) => {
  return (
    <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600"></div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 border border-gray-700 text-indigo-400 font-bold text-sm">
          {number}
        </div>
        <h2 className="text-xl font-semibold text-white tracking-wide">{title}</h2>
      </div>
      <div className="pl-2 md:pl-11">
        {children}
      </div>
    </div>
  );
};