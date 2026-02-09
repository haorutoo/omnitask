
import React, { useState } from 'react';
import { Experiment, OpikTrace, OmniTask } from '../types';
import { calculateProjectAlignment } from '../services/scoreService';
import { 
  FlaskConical, 
  TrendingUp, 
  Cpu, 
  UserCheck, 
  ShieldAlert, 
  Trash2, 
  PlusCircle, 
  Edit3,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Terminal,
  BarChart3,
  Quote,
  Zap
} from 'lucide-react';

interface ExperimentViewProps {
  experiments: Experiment[];
  tasks: OmniTask[];
}

export const ExperimentView: React.FC<ExperimentViewProps> = ({ experiments, tasks }) => {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  if (experiments.length === 0) {
    return (
      <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
        <FlaskConical className="text-slate-300 mx-auto mb-4" size={40} />
        <h3 className="text-slate-800 font-black uppercase tracking-tight">No Observability Data</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">Start a mission to track AI alignment performance.</p>
      </div>
    );
  }

  const renderTraceDetails = (title: string, trace: OpikTrace) => {
    const isExpanded = expandedTrace === trace.id;
    const scores = trace.heuristicScores;

    return (
      <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${trace.isOptimized ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
              {/* Fix: Use the imported Zap icon for optimized traces */}
              {trace.isOptimized ? <Zap size={14} /> : <Terminal size={14} />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{title}</span>
          </div>
          <button 
            onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Heuristic Scores */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 size={12} className="text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Heuristic Quality</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(scores).map(([key, val]) => (
                <div key={key} className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs font-black text-slate-800">{(val * 100).toFixed(0)}%</div>
                  <div className="text-[7px] font-bold text-slate-400 uppercase">{key}</div>
                </div>
              ))}
            </div>
          </div>

          {isExpanded && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Chain of Thought */}
              {trace.thinkingSteps && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BrainCircuit size={12} className="text-indigo-400" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Internal Chain of Thought</span>
                  </div>
                  <div className="bg-slate-900 text-indigo-300 p-3 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto max-h-32 overflow-y-auto">
                    {trace.thinkingSteps}
                  </div>
                </div>
              )}

              {/* Generated Logic */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Terminal size={12} className="text-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Generated Logic</span>
                </div>
                <div className="bg-slate-800 text-slate-300 p-3 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto max-h-40 overflow-y-auto">
                  {trace.aiResponse}
                </div>
              </div>

              {/* Evaluator Critique */}
              {trace.llmCritique && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Quote size={12} className="text-amber-400" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Evaluator Critique</span>
                  </div>
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-[10px] font-medium italic border border-amber-100">
                    "{trace.llmCritique}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDriftCard = (exp: Experiment) => {
    const metrics = calculateProjectAlignment(exp, tasks);
    const scoreColor = metrics.score > 0.9 ? 'text-emerald-600' : metrics.score > 0.7 ? 'text-amber-600' : 'text-red-600';

    return (
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Observability Grade</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(exp.timestamp).toLocaleDateString()}</span>
            </div>
            <h4 className="text-3xl font-black text-slate-900 leading-tight">"{exp.userPrompt}"</h4>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-black ${scoreColor}`}>{(metrics.score * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Human Alignment Score</div>
          </div>
        </div>

        {/* Drift Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
             <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl mb-3"><CheckCircle2 size={18} /></div>
             <div className="text-lg font-black text-slate-800">{metrics.remainingAiCount}</div>
             <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">AI Steps Kept</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
             <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl mb-3"><Edit3 size={18} /></div>
             <div className="text-lg font-black text-slate-800">{metrics.refinedCount}</div>
             <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Steps Refined</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
             <div className="bg-red-100 text-red-700 p-2 rounded-xl mb-3"><Trash2 size={18} /></div>
             <div className="text-lg font-black text-slate-800">{metrics.deletedCount}</div>
             <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">AI Deletions</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
             <div className="bg-amber-100 text-amber-700 p-2 rounded-xl mb-3"><PlusCircle size={18} /></div>
             <div className="text-lg font-black text-slate-800">{metrics.addedCount}</div>
             <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual Additions</div>
          </div>
        </div>

        {/* AI Performance Traces */}
        <div className="space-y-4">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Architecture Strategy Comparison</h5>
          <div className="flex flex-col lg:flex-row gap-4">
            {renderTraceDetails("Baseline System", exp.variants.baseline)}
            {exp.variants.optimized && renderTraceDetails("Optimized Strategy", exp.variants.optimized)}
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
           <div className="flex items-center gap-3">
             <AlertCircle className="text-indigo-400" size={18} />
             <p className="text-[10px] font-medium text-slate-300">Holistic scoring includes text similarity (Levenshtein) and structural drift penalties.</p>
           </div>
           <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Opik Trace Integration v1.3</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-6">
        <TrendingUp className="text-indigo-600" size={28} />
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Observability Hub</h2>
          <p className="text-slate-500 text-sm font-medium">Monitoring human-in-the-loop drift and strategy heuristic quality.</p>
        </div>
      </div>
      <div className="space-y-10">
        {experiments.map(exp => (
          <div key={exp.id}>
            {renderDriftCard(exp)}
          </div>
        ))}
      </div>
    </div>
  );
};
