
import React, { useState } from 'react';
import { Metric } from '../types';
import { Card, ProgressBar } from './ui/Card';
import { Server, ShieldCheck, ShieldAlert, Activity, ChevronRight, Fingerprint, MousePointerClick, AlertTriangle, Loader2, Info } from 'lucide-react';
import { useCountUp } from '../utils/animationUtils';
import CalculationMethodologyModal from './CalculationMethodologyModal';

interface Props {
  metric: Metric;
  onClick: (metric: Metric) => void;
}

export const MetricCard: React.FC<Props> = ({ metric, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  
  // DEBUG: Log what metric receives
  console.log('[MetricCard] Rendering metric:', metric.label, '| has formula?', !!metric.formula, '| formula:', metric.formula ? metric.formula.substring(0, 40) : 'UNDEFINED');
  
  // Animated count-up for the metric value
  const { formattedValue } = useCountUp(metric.value, {
    duration: 2000,
    decimals: 0,
    separator: ','
  });
  
  const Icon = {
    'total-assessed': Server,
    'secure-assets': ShieldCheck,
    'potential-vulnerable': AlertTriangle,
    'vulnerable-assets': ShieldAlert
  }[metric.id] || Server;

  const colorClasses = {
    blue: 'text-cyan-400 bg-cyan-900/40 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    green: 'text-emerald-400 bg-emerald-900/40 border border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    amber: 'text-amber-400 bg-amber-900/40 border border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    rose: 'text-red-400 bg-red-900/40 border border-red-500/50 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
  };

  const gradientClasses = {
    blue: 'from-cyan-500/10 to-transparent',
    green: 'from-emerald-500/10 to-transparent',
    amber: 'from-amber-500/10 to-transparent',
    rose: 'from-red-500/10 to-transparent'
  };

  const textShadowClass = {
    blue: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    green: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    amber: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    rose: 'drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]'
  };

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Simulate AI/ML Processing Latency
    try {
       await new Promise(resolve => setTimeout(resolve, 1000));
       onClick(metric);
    } catch (e) {
       console.error("AI Analysis failed", e);
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <div 
      className={`perspective-1000 group h-full cursor-pointer w-full ${isProcessing ? 'pointer-events-none' : ''}`} 
      onClick={handleClick}
      role="button"
      aria-label={`Analyze ${metric.label}`}
      aria-busy={isProcessing}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={`relative h-full bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-700/80 p-6 
                    transition-all duration-500 ease-out transform-style-3d 
                    ${isProcessing ? 'opacity-100 scale-100' : 'group-hover:rotate-x-2 group-hover:rotate-y-2 group-hover:translate-y-[-5px] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]'}
                    border-t-slate-600/50 overflow-hidden flex flex-col`}>
        
        {/* Dynamic Lighting/Glare Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[metric.color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
        
        {/* Logo / Watermark Background */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 transform rotate-12 scale-150 pointer-events-none">
          <Fingerprint size={180} />
        </div>

        {/* Content Layer */}
        <div className={`relative z-10 flex flex-col justify-between h-full transform-style-3d ${isProcessing ? '' : 'group-hover:translate-z-10'}`}>
          
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg backdrop-blur-sm transition-transform duration-300 ${isProcessing ? 'scale-100' : 'group-hover:scale-110'} ${colorClasses[metric.color]}`}>
              <Icon size={24} className={isProcessing ? 'animate-pulse' : 'animate-pulse-glow'} />
            </div>
            
            {/* Interactive Cue or Loading Indicator */}
            <div className="flex items-center gap-1.5">
               {/* Methodology Info Button */}
               <button
                 onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
                 className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                 aria-label={`View calculation methodology for ${metric.label}`}
                 title="Calculation Methodology"
                 tabIndex={0}
               >
                 <Info size={13} />
               </button>
               {isProcessing ? (
                 <div className="flex items-center gap-2 text-xs uppercase font-bold text-cyan-400 bg-cyan-950/80 px-3 py-1.5 rounded-full border border-cyan-500/50 animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing</span>
                 </div>
               ) : (
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 text-xs uppercase font-bold text-cyan-400 bg-cyan-950/50 px-3 py-1.5 rounded-full border border-cyan-500/30">
                    <MousePointerClick size={14} className="animate-bounce" />
                    <span>Analyze</span>
                 </div>
               )}
            </div>
          </div>

          <div className={`space-y-3 flex-1 ${isProcessing ? 'opacity-50 transition-opacity duration-300' : ''}`}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors duration-300">{metric.label}</h3>
            
            <div className={`flex items-baseline gap-2 flex-wrap transform-style-3d ${isProcessing ? '' : 'group-hover:translate-z-4'}`}>
              <h2 className={`text-3xl lg:text-4xl font-bold text-white tracking-widest ${textShadowClass[metric.color]}`}>
                {formattedValue}
              </h2>
            </div>
            
            <div className="flex flex-col gap-1 min-h-[40px]">
              {metric.percentage !== undefined && (
                <div className="flex items-center justify-between">
                  <div className={`text-xl font-bold ${textShadowClass[metric.color]} text-white`}>
                    {metric.percentage}%
                  </div>
                  {metric.trend && (
                     <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        (metric.color === 'green' && metric.trend > 0) || (metric.color !== 'green' && metric.trend < 0) 
                        ? 'bg-emerald-900/30 text-emerald-400' 
                        : 'bg-red-900/30 text-red-400'
                     }`}>
                        {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
                     </span>
                  )}
                </div>
              )}
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-tight group-hover:text-cyan-300 transition-colors">
                {metric.subtext}
              </div>
            </div>
          </div>

          {metric.percentage !== undefined && (
            <div className={`mt-4 transform-style-3d ${isProcessing ? '' : 'group-hover:translate-z-2'}`}>
               <ProgressBar value={metric.percentage} color={metric.color as any} />
            </div>
          )}
          
          {/* Bottom Interactive Strip */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-full group-hover:translate-y-0" />
        </div>
        
        {/* Shine effect on hover */}
        {!isProcessing && (
           <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shine pointer-events-none" />
        )}

        {/* Full Card Loading Overlay - Subtle */}
        {isProcessing && (
           <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl animate-in fade-in duration-300">
             {/* Spinner already shown in header, this overlay just dims interaction */}
           </div>
        )}
      </div>

      {/* Calculation Methodology Modal */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        methodologyKey={metric.id}
      />
    </div>
  );
};
