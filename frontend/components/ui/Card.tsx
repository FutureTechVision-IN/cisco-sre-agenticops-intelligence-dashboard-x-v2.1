import React from 'react';

// FIX: Update CardProps to accept all HTMLDivElement attributes, overriding `onClick` to maintain its existing signature, and pass them down to the underlying div. This allows for accessibility attributes to be used on the Card component.
type CardProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  children: React.ReactNode;
  onClick?: () => void;
};

export const Card: React.FC<CardProps> = ({ children, className = "", onClick, ...props }) => {
  return (
    <div 
      onClick={onClick}
      {...props}
      className={`relative bg-slate-800/60 backdrop-blur-xl rounded-xl border border-slate-700/80 shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:border-cyan-500/80' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color: 'red' | 'amber' | 'green' | 'blue' | 'gray'; className?: string }> = ({ children, color, className = "" }) => {
  // Mapping 'green' to teal for the neon theme as per spec ("Safe: teal") 
  // but keeping 'green' prop name for compatibility with existing code.
  const colorClasses = {
    red: 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]', // Using emerald/teal mix
    blue: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
    gray: 'bg-slate-700/50 text-slate-300 border border-slate-600'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{ value: number; color: 'rose' | 'amber' | 'emerald' | 'blue' | 'green' }> = ({ value, color }) => {
  const bgClasses: Record<string, string> = {
    rose: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
    amber: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]',
    emerald: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
    green: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
    blue: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
  };

  // Ensure a minimum visible width (4%) so small percentages remain perceptible
  const displayWidth = value > 0 ? Math.min(100, Math.max(4, value)) : 0;
  
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-3 overflow-hidden">
      <div 
        className={`${bgClasses[color]} h-1.5 rounded-full transition-all duration-500 ease-out`} 
        style={{ width: `${displayWidth}%` }}
      />
    </div>
  );
};