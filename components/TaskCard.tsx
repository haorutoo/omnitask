
import React, { useState, useEffect, useRef } from 'react';
import { OmniTask, TaskStatus, Priority, Collaborator, RecurrenceConfig } from '../types';
import { getConsistencyMetrics } from '../utils/taskUtils'; // Import shared utility
import { 
  CheckCircle, 
  Users,
  Trash2,
  ListTree,
  Pencil,
  Save,
  X,
  UserRoundPen,
  Cpu,
  User,
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  Flame,
  RotateCw,
  CalendarClock,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Clock,
  Lock,
  ChevronRight,
  AlarmClockOff,
  LightbulbOff,
  Lightbulb
} from 'lucide-react';

interface TaskCardProps {
  task: OmniTask;
  allTasks: OmniTask[];
  onStatusChange: (id: string, status: TaskStatus, wasSuccessfulAttempt?: boolean) => void; // Updated signature
  onProgressChange?: (id: string, percentage: number) => void;
  onReassess: (task: OmniTask) => void;
  onUpdateCollaborators: (id: string, collaborators: Collaborator[]) => void;
  onCreateSubtask: (parentId: string, title: string, description: string, dueDate?: string, recurrence?: RecurrenceConfig) => void;
  onGenerateSubtasks: (parentId: string, request: string) => Promise<void>;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<OmniTask>) => void;
  onMissedWithAI: (taskId: string, reason: string) => Promise<void>; // New prop for AI intervention on missed tasks
  depth?: number;
  viewMode?: 'nested' | 'flat';
}

// Helper to convert ISO string to local datetime string for input[type="datetime-local"]
const toLocalISOString = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000; // Offset in milliseconds
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  allTasks, 
  onStatusChange, 
  onProgressChange,
  onCreateSubtask,
  onGenerateSubtasks,
  onDeleteTask,
  onEditTask,
  onReassess,
  onUpdateCollaborators,
  onMissedWithAI, // Destructure new prop
  depth = 0,
  viewMode = 'nested'
}) => {
  const [showSubtasks, setShowSubtasks] = useState(depth === 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editDueDate, setEditDueDate] = useState(task.dueDate);
  
  // Live Clock state for Minutely/Real-time updates
  const [now, setNow] = useState(new Date());

  // Recurrence Edit State
  const [isRecurrenceEnabled, setIsRecurrenceEnabled] = useState(!!task.recurrence);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'minutely'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'>(task.recurrence?.frequency as any || 'daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(task.recurrence?.interval || 1);
  const [editGoalEndDate, setEditGoalEndDate] = useState(task.recurrence?.endDate || '');

  // New manual step form state
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDesc, setNewSubtaskDesc] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskIsRecurring, setNewSubtaskIsRecurring] = useState(false);
  const [newSubtaskFreq, setNewSubtaskFreq] = useState<'minutely'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'>('daily');
  const [newSubtaskInterval, setNewSubtaskInterval] = useState(1);
  const [newSubtaskGoalEndDate, setNewSubtaskGoalEndDate] = useState('');

  // States for AI intervention on missed tasks
  const [showMissedReasonModal, setShowMissedReasonModal] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);


  const editDateInputRef = useRef<HTMLInputElement>(null);
  const newSubtaskDateInputRef = useRef<HTMLInputElement>(null);
  const editGoalEndDateInputRef = useRef<HTMLInputElement>(null);
  const newSubtaskGoalEndDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditDueDate(task.dueDate);
    setIsRecurrenceEnabled(!!task.recurrence);
    if (task.recurrence) {
        setRecurrenceFreq(task.recurrence.frequency as any);
        setRecurrenceInterval(task.recurrence.interval);
        setEditGoalEndDate(task.recurrence.endDate || '');
    } else {
      setEditGoalEndDate('');
    }
  }, [task.title, task.description, task.recurrence, task.dueDate]);

  // Timer for minutely/hourly tasks to refresh UI
  useEffect(() => {
    if (!task.recurrence || task.status === TaskStatus.COMPLETED) return; // No need to refresh if recurrence ended or task completed
    
    // Refresh rate depends on frequency
    const intervalTime = task.recurrence.frequency === 'minutely' ? 1000 : 60000;
    
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalTime);

    return () => clearInterval(timer);
  }, [task.recurrence, task.status]);

  const handleSaveEdit = () => {
    let updates: Partial<OmniTask> = { 
        title: editTitle, 
        description: editDesc,
        dueDate: editDueDate
    };

    if (isRecurrenceEnabled) {
        updates.recurrence = {
            frequency: recurrenceFreq as any,
            interval: recurrenceInterval,
            streak: task.recurrence?.streak || 0,
            startDate: task.recurrence?.startDate || new Date().toISOString(),
            endDate: editGoalEndDate || undefined, // Save as undefined if empty
        };
    } else {
        updates.recurrence = undefined;
    }

    onEditTask(task.id, updates);
    setIsEditing(false);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim() || !newSubtaskDesc.trim()) return;
    
    let recurrenceConfig: RecurrenceConfig | undefined;
    if (newSubtaskIsRecurring) {
        recurrenceConfig = {
            frequency: newSubtaskFreq,
            interval: newSubtaskInterval,
            streak: 0,
            startDate: new Date().toISOString(),
            endDate: newSubtaskGoalEndDate || undefined,
        };
    }

    const finalDueDate = newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : undefined;

    onCreateSubtask(task.id, newSubtaskTitle, newSubtaskDesc, finalDueDate, recurrenceConfig);
    
    setNewSubtaskTitle('');
    setNewSubtaskDesc('');
    setNewSubtaskDueDate('');
    setNewSubtaskIsRecurring(false);
    setNewSubtaskInterval(1);
    setNewSubtaskFreq('daily');
    setNewSubtaskGoalEndDate('');
    
    setIsAddingSubtask(false);
    setShowSubtasks(true);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerateSubtasks(task.id, aiPrompt);
      setAiPrompt('');
      setIsAiPromptOpen(false);
      setShowSubtasks(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDateChange = (value: string, setter: (val: string) => void) => {
      if (!value) {
        setter(''); // Allow clearing the date
        return;
      }
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
          setter(date.toISOString());
      }
  };

  const triggerPicker = (ref: React.RefObject<HTMLInputElement>) => {
    try {
      if (ref.current && 'showPicker' in ref.current) {
        // @ts-ignore - showPicker is a newer standard property
        ref.current.showPicker();
      } else {
        ref.current?.focus();
      }
    } catch (e) {
      console.warn("Date picker could not be opened programmatically", e);
      ref.current?.focus();
    }
  };

  const handleGenerateSolution = async () => {
    if (!failureReason.trim()) return;
    setIsGeneratingSolution(true);
    try {
      await onMissedWithAI(task.id, failureReason);
      setFailureReason('');
      setShowMissedReasonModal(false);
    } finally {
      setIsGeneratingSolution(false);
    }
  };

  const subTasks = allTasks.filter(t => t.parentId === task.id);
  const isEdited = task.isAiGenerated && task.alignmentScore !== undefined && task.alignmentScore < 0.99;
  const isManual = !task.isAiGenerated;
  const isRecurring = !!task.recurrence;
  
  // Use consistency for recurring, otherwise standard progress
  const consistency = getConsistencyMetrics(task, now); // Use shared utility
  const progress = isRecurring ? Math.round(consistency.score) : (task.completionPercentage || 0);
  
  // Determine button state for recurring tasks
  const isRecurrenceFinished = consistency.isFinished;

  return (
    <div className={`flex flex-col rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group/card bg-white 
      ${isEdited ? 'border-amber-100 shadow-amber-50' : 'border-slate-100 shadow-sm'} 
      ${isManual && task.parentId ? 'border-dashed border-indigo-100/30 bg-indigo-50/5' : ''}`}
    >
      
      {/* Source & Alignment Badges */}
      <div className="absolute top-3 right-4 flex gap-2 z-10">
        {isRecurring && (
           <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-[8px] font-black px-2.5 py-1 rounded-full border border-orange-100 uppercase tracking-widest">
             <RotateCw size={10} /> {task.recurrence?.frequency} <Flame size={10} className="ml-1 fill-orange-500" /> {task.recurrence?.streak}
           </div>
        )}
        {task.isAiGenerated ? (
          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-[8px] font-black px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
            <Cpu size={10} /> AI Proposed
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-indigo-100/50 text-indigo-700 text-[8px] font-black px-2.5 py-1 rounded-full border border-indigo-200 uppercase tracking-widest shadow-sm">
            <User size={10} /> Human Addition
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4 pr-32">
          {isEditing ? (
            <input 
              className="flex-1 text-lg font-black text-slate-900 border-b-2 border-indigo-500 outline-none bg-slate-50 px-2 py-1 rounded-t-lg"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
          ) : (
            <h3 className={`${depth === 0 ? 'text-xl font-black' : 'text-md font-bold'} ${isManual ? 'text-indigo-900' : 'text-slate-900'} flex-1 leading-tight`}>
              {task.title}
            </h3>
          )}
          
          <div className="flex gap-2 ml-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Save size={16} /></button>
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><X size={16} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Pencil size={16} /></button>
                <button onClick={() => onDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-6">
            <textarea 
                className="w-full text-slate-600 text-sm bg-slate-50 border-2 border-indigo-100 rounded-xl p-4 outline-none min-h-[100px] font-medium"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
            />
             {/* Editable Due Date with Calendar Picker */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500" />
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Due Date & Time</span>
                </div>
                {/* Visual indicator that this is a picker */}
                <button onClick={() => triggerPicker(editDateInputRef)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors">
                    <Calendar size={18} />
                </button>
              </div>
              <input 
                ref={editDateInputRef}
                type="datetime-local" 
                value={toLocalISOString(editDueDate)}
                onChange={(e) => handleDateChange(e.target.value, setEditDueDate)}
                // We add an onClick handler to force picker open for better UX
                onClick={() => triggerPicker(editDateInputRef)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors cursor-pointer"
              />
            </div>

            {/* Recurrence Editing UI */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <RotateCw size={16} className="text-orange-500" />
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Recurring Task</span>
                    </div>
                    <button onClick={() => setIsRecurrenceEnabled(!isRecurrenceEnabled)} className="text-indigo-600">
                        {isRecurrenceEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-300" />}
                    </button>
                </div>
                
                {isRecurrenceEnabled && (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Frequency</label>
                                <select 
                                    value={recurrenceFreq} 
                                    onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors"
                                >
                                    <option value="minutely">Minutely</option>
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="w-20">
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Interval</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={recurrenceInterval}
                                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Recurrence Goal End Date */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase block">Goal End Date (Optional)</label>
                              <button onClick={() => triggerPicker(editGoalEndDateInputRef)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg">
                                  <Calendar size={14} />
                              </button>
                          </div>
                          <input 
                            ref={editGoalEndDateInputRef}
                            type="datetime-local" 
                            value={toLocalISOString(editGoalEndDate)}
                            onChange={(e) => handleDateChange(e.target.value, setEditGoalEndDate)}
                            onClick={() => triggerPicker(editGoalEndDateInputRef)}
                            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors cursor-pointer"
                          />
                        </div>
                    </div>
                )}
            </div>
          </div>
        ) : (
          <p className={`${isManual ? 'text-slate-500' : 'text-slate-600'} text-sm leading-relaxed mb-6 font-medium pr-12`}>
            {task.description}
          </p>
        )}

        {/* Progress Bar Section */}
        <div className="mb-6">
           <div className="flex justify-between items-end mb-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {isRecurring ? 'Consistency Score' : 'Completion'}
             </span>
             {/* Updated display for recurring tasks to show achieved, missed, and total cycles */}
             <span className={`text-[10px] font-black ${isRecurring ? 'text-orange-600' : 'text-indigo-600'}`}>
                {progress}% {isRecurring && <span className="text-slate-400 font-normal ml-1">({consistency.actual} achieved, {consistency.missed} missed, {consistency.expected} total cycles)</span>}
             </span>
           </div>
           
           {/* Logic for showing slider vs read-only bar */}
           {/* Slider allowed ONLY if: Not Recurring AND Not Editing AND Has No Subtasks */}
           {!isRecurring && subTasks.length === 0 && !isEditing ? (
             <div className="relative h-2 w-full bg-slate-100 rounded-full group/slider">
               <div 
                 className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full pointer-events-none transition-all duration-300"
                 style={{ width: `${progress}%` }} 
               />
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 value={progress}
                 onChange={(e) => onProgressChange && onProgressChange(task.id, parseInt(e.target.value))}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
             </div>
           ) : (
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-500 ease-out ${isRecurring ? 'bg-orange-500' : 'bg-indigo-500'}`} 
                 style={{ width: `${progress}%` }} 
               />
             </div>
           )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setShowSubtasks(!showSubtasks)} className="flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
            <ListTree size={14} className="mr-2" /> Steps {subTasks.length > 0 && `(${subTasks.length})`}
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer group/date"
          >
             <CalendarClock size={14} className="mr-1.5 group-hover/date:text-indigo-500" /> 
             Next Cycle Due: {new Date(task.dueDate).toLocaleString()}
             <ChevronRight size={12} className="ml-1 opacity-0 group-hover/date:opacity-100 transition-opacity" />
          </button>
        </div>

        {showSubtasks && (
          <div className="space-y-3 p-4 bg-slate-50/50 rounded-3xl border border-slate-100 mb-6">
            {subTasks.map(st => (
              <TaskCard key={st.id} task={st} allTasks={allTasks} depth={depth + 1} viewMode={viewMode}
                onStatusChange={onStatusChange} 
                onProgressChange={onProgressChange}
                onReassess={onReassess} 
                onUpdateCollaborators={onUpdateCollaborators}
                onCreateSubtask={onCreateSubtask} 
                onGenerateSubtasks={onGenerateSubtasks} 
                onDeleteTask={onDeleteTask} 
                onEditTask={onEditTask} 
                onMissedWithAI={onMissedWithAI}
              />
            ))}
            
            {/* Manual Creation UI */}
            {isAddingSubtask && (
              <div className="bg-white p-6 rounded-[2.5rem] border-2 border-indigo-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] px-1">
                  <User size={14} /> Add Action Step
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">Step Title</label>
                    <input 
                      type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="e.g. Drink 2L of water" 
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">Action Details</label>
                    <textarea 
                      value={newSubtaskDesc} onChange={(e) => setNewSubtaskDesc(e.target.value)}
                      placeholder="e.g. Keep a water bottle at my desk..." 
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all min-h-[100px]"
                    />
                  </div>

                  {/* Manual Creation Due Date */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase block">Due Date</label>
                        <button onClick={() => triggerPicker(newSubtaskDateInputRef)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg">
                            <Calendar size={14} />
                        </button>
                    </div>
                    <input 
                      ref={newSubtaskDateInputRef}
                      type="datetime-local" 
                      value={toLocalISOString(newSubtaskDueDate)}
                      onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                      onClick={() => triggerPicker(newSubtaskDateInputRef)}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors cursor-pointer"
                    />
                  </div>

                  {/* Manual Creation Recurrence */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <RotateCw size={16} className="text-orange-500" />
                            <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Recurring Task</span>
                        </div>
                        <button onClick={() => setNewSubtaskIsRecurring(!newSubtaskIsRecurring)} className="text-indigo-600">
                            {newSubtaskIsRecurring ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-300" />}
                        </button>
                    </div>
                    
                    {newSubtaskIsRecurring && (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Frequency</label>
                                    <select 
                                        value={newSubtaskFreq} 
                                        onChange={(e) => setNewSubtaskFreq(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors"
                                    >
                                        <option value="minutely">Minutely</option>
                                        <option value="hourly">Hourly</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Interval</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={newSubtaskInterval}
                                        onChange={(e) => setNewSubtaskInterval(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* New Subtask Recurrence Goal End Date */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase block">Goal End Date (Optional)</label>
                                  <button onClick={() => triggerPicker(newSubtaskGoalEndDateInputRef)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg">
                                      <Calendar size={14} />
                                  </button>
                              </div>
                              <input 
                                ref={newSubtaskGoalEndDateInputRef}
                                type="datetime-local" 
                                value={toLocalISOString(newSubtaskGoalEndDate)}
                                onChange={(e) => handleDateChange(e.target.value, setNewSubtaskGoalEndDate)}
                                onClick={() => triggerPicker(newSubtaskGoalEndDateInputRef)}
                                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 transition-colors cursor-pointer"
                              />
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim() || !newSubtaskDesc.trim()} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100">
                    Add Step
                  </button>
                  <button onClick={() => setIsAddingSubtask(false)} className="px-5 py-3.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* AI Generation UI */}
            {isAiPromptOpen && (
              <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-[2.5rem] border-2 border-indigo-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] px-1">
                  <Sparkles size={14} /> AI Step Breakdown
                </div>
                <div>
                    <textarea 
                      value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={`How should AI break down "${task.title}"? (e.g. 'Create 5 steps to build this habit')`} 
                      className="w-full px-4 py-3 bg-white rounded-2xl border border-indigo-100 text-xs font-medium outline-none focus:border-indigo-400 focus:shadow-md transition-all min-h-[80px]"
                      autoFocus
                    />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleAiGenerate} disabled={!aiPrompt.trim() || isGenerating} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                    {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <><Sparkles size={14} /> Generate Subtasks</>}
                  </button>
                  <button onClick={() => setIsAiPromptOpen(false)} className="px-5 py-3.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Default Add Buttons */}
            {!isAddingSubtask && !isAiPromptOpen && (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddingSubtask(true)}
                  className="flex-1 py-4 bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-[9px] tracking-[0.15em] hover:bg-white hover:border-slate-300 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Step
                </button>
                <button 
                  onClick={() => setIsAiPromptOpen(true)}
                  className="flex-1 py-4 bg-indigo-50/30 border-2 border-dashed border-indigo-200/50 rounded-2xl text-indigo-400 font-black uppercase text-[9px] tracking-[0.15em] hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> AI Breakdown
                </button>
              </div>
            )}
          </div>
        )}

        {isRecurrenceFinished ? (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all transform shadow-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
          >
            <AlarmClockOff size={16} /> Recurrence Finished
          </button>
        ) : isRecurring ? (
          <div className="flex gap-2"> {/* New container for two buttons */}
            <button
              onClick={() => onStatusChange(task.id, TaskStatus.COMPLETED, true)} // Mark as successful
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"
            >
              <CheckCircle size={18} /> Mark Achieved & Advance
            </button>
            <button
              onClick={() => setShowMissedReasonModal(true)} // Open modal on "Mark Missed"
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-lg bg-red-500 text-white hover:bg-red-600 shadow-red-100"
            >
              <X size={18} /> Mark Missed & Advance
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStatusChange(task.id, task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED)}
            disabled={task.status === TaskStatus.COMPLETED}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-lg
              ${task.status === TaskStatus.COMPLETED
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
              }`}
          >
            <CheckCircle size={18} /> {task.status === TaskStatus.COMPLETED ? 'Completed' : 'Complete Step'}
          </button>
        )}
      </div>

      {/* Failure Reason Modal */}
      {showMissedReasonModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 text-red-600 font-black text-xl">
              <LightbulbOff size={24} className="flex-shrink-0" />
              <span>Why was "{task.title}" missed?</span>
            </div>
            <p className="text-slate-600 text-sm">Help AI understand the challenge to generate a solution to prevent future misses.</p>
            <textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="e.g. 'I ran out of time', 'It was too complex', 'Unexpected obstacles arose'"
              className="w-full min-h-[120px] p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:border-red-400 outline-none"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleGenerateSolution} 
                disabled={!failureReason.trim() || isGeneratingSolution} 
                className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
              >
                {isGeneratingSolution ? <Loader2 className="animate-spin" size={14} /> : <><Sparkles size={14} /> Generate Solution</>}
              </button>
              <button 
                onClick={() => {
                  onStatusChange(task.id, TaskStatus.COMPLETED, false); // Just mark as missed
                  setShowMissedReasonModal(false);
                  setFailureReason('');
                }} 
                disabled={isGeneratingSolution}
                className="px-5 py-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
              >
                Just Mark Missed
              </button>
              <button 
                onClick={() => {
                  setShowMissedReasonModal(false);
                  setFailureReason('');
                }} 
                disabled={isGeneratingSolution}
                className="px-5 py-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
