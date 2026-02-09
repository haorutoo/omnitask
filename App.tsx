
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OmniTask, TaskStatus, Priority, Experiment, OpikTrace, Collaborator, User, RecurrenceConfig } from './types';
import { generateTasks, evaluateQuality, reassessTask, generateSubtasks } from './services/geminiService';
import { logToOpik, createExperiment, getExperiments } from './services/opikService';
import { saveTasks, loadTasks, logModificationToFirestore } from './services/storageService';
import { loginWithGoogle, logout, getCurrentUser } from './services/authService';
import { calculateTaskAlignment } from './services/scoreService';
import { TaskCard } from './components/TaskCard';
import { ExperimentView } from './components/ExperimentView';
import { getConsistencyMetrics, getNextDueDate } from './utils/taskUtils'; // Import shared utilities
import { 
  PlusCircle, 
  Target, 
  Activity, 
  Zap, 
  History, 
  Loader2, 
  Sparkles, 
  Search, 
  LayoutList, 
  Layers,
  X,
  Database,
  Rocket,
  Mic,
  MicOff,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<OmniTask[]>([]);
  const [goal, setGoal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'experiments'>('tasks');
  const [viewMode, setViewMode] = useState<'nested' | 'flat'>('nested');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [useOptimizer, setUseOptimizer] = useState(true);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null); // New state for API errors

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
    setTasks(loadTasks());
    setExperiments(getExperiments());
  }, []);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  const handleCreateTasks = async () => {
    if (!goal.trim() || !currentUser) return;
    setIsLoading(true);
    setApiErrorMessage(null); // Clear previous errors
    try {
      const baselineRes = await generateTasks(goal, false);
      const baselineEval = await evaluateQuality(goal, baselineRes.raw);
      
      const baselineTrace: OpikTrace = {
        id: `trace-b-${Date.now()}`,
        timestamp: new Date().toISOString(),
        inputPrompt: goal,
        systemPromptUsed: "Standard Resolution Coach",
        aiResponse: baselineRes.raw,
        heuristicScores: {
          completeness: baselineEval.completeness,
          specificity: baselineEval.specificity,
          relevance: baselineEval.relevance
        },
        llmCritique: baselineEval.critique,
        isOptimized: false
      };

      const selectedRes = baselineRes.raw;
      const aiTasksRaw = JSON.parse(selectedRes);
      
      const goalTaskId = Math.random().toString(36).substr(2, 9);
      const originalSnapshots: { id: string; title: string; description: string; }[] = [];

      const parsedSubTasks = aiTasksRaw.map((t: any) => {
        const tid = Math.random().toString(36).substr(2, 9);
        originalSnapshots.push({ id: tid, title: t.title, description: t.description });
        return {
          ...t,
          id: tid,
          status: TaskStatus.TODO,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: currentUser.id,
          collaborators: [],
          subTaskIds: [],
          parentId: goalTaskId,
          isAiGenerated: true,
          originalAiData: { title: t.title, description: t.description },
          alignmentScore: 1.0,
          completionPercentage: 0,
          recurrence: t.recurrence ? { ...t.recurrence, streak: 0, startDate: new Date().toISOString() } : undefined
        };
      });

      const masterGoalTask: OmniTask = {
        id: goalTaskId,
        title: goal.length > 50 ? goal.substring(0, 47) + "..." : goal,
        description: goal,
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: currentUser.id,
        collaborators: [],
        subTaskIds: parsedSubTasks.map((st: any) => st.id),
        isAiGenerated: false,
        metadata: { customFields: { isGoal: true } },
        completionPercentage: 0
      };

      logToOpik(baselineTrace);
      createExperiment(
        goal, 
        originalSnapshots, 
        baselineTrace, 
        [goalTaskId, ...parsedSubTasks.map((t: any) => t.id)]
      );
      
      setExperiments(getExperiments());

      const newTaskList = [masterGoalTask, ...parsedSubTasks, ...tasks];
      setTasks(newTaskList);
      saveTasks(newTaskList);
      setGoal('');
    } catch (error: any) {
      console.error("Error creating tasks:", error);
      setApiErrorMessage(error.message);
      setTimeout(() => setApiErrorMessage(null), 15000); // Clear message after 15 seconds
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSampleTasks = () => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const parentTaskId = Math.random().toString(36).substr(2, 9);
    const subtask1Id = Math.random().toString(36).substr(2, 9);
    const subtask2Id = Math.random().toString(36).substr(2, 9);
    const subtask3Id = Math.random().toString(36).substr(2, 9);

    const sampleParentTask: OmniTask = {
      id: parentTaskId,
      title: "Achieve Consistent 8 Hours of Sleep",
      description: "Build a sustainable sleep schedule to improve energy, focus, and overall health for the new year.",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: oneWeekFromNow,
      createdAt: now,
      updatedAt: now,
      ownerId: currentUser.id,
      collaborators: [],
      subTaskIds: [subtask1Id, subtask2Id, subtask3Id],
      isAiGenerated: false,
      metadata: { customFields: { isGoal: true } },
      completionPercentage: 0,
    };

    const sampleSubtask1: OmniTask = {
      id: subtask1Id,
      title: "Create a Wind-Down Routine",
      description: "Establish a 30-minute pre-sleep ritual (reading, meditation, or stretching) to signal the body it's time to rest.",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: threeDaysFromNow,
      createdAt: now,
      updatedAt: now,
      ownerId: currentUser.id,
      collaborators: [],
      subTaskIds: [],
      parentId: parentTaskId,
      isAiGenerated: false,
      metadata: {},
      completionPercentage: 0,
    };

    const sampleSubtask2: OmniTask = {
      id: subtask2Id,
      title: "No Screens After 10 PM",
      description: "Avoid blue light from phones and laptops 1 hour before bed.",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: now, // Due now for a recurring task
      createdAt: now,
      updatedAt: now,
      ownerId: currentUser.id,
      collaborators: [],
      subTaskIds: [],
      parentId: parentTaskId,
      isAiGenerated: false,
      metadata: {},
      completionPercentage: 0,
      recurrence: {
        frequency: 'daily',
        interval: 1,
        streak: 0,
        startDate: now,
      },
      completionHistory: []
    };

    const sampleSubtask3: OmniTask = {
      id: subtask3Id,
      title: "Purchase Blackout Curtains",
      description: "Ensure the bedroom is completely dark to maximize melatonin production.",
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      dueDate: fiveDaysFromNow,
      createdAt: now,
      updatedAt: now,
      ownerId: currentUser.id,
      collaborators: [],
      subTaskIds: [],
      parentId: parentTaskId,
      isAiGenerated: false,
      metadata: {},
      completionPercentage: 0,
      completionHistory: [{ completedAt: now, wasSuccessful: true }]
    };

    const newTaskList = [sampleParentTask, sampleSubtask1, sampleSubtask2, sampleSubtask3, ...tasks];
    setTasks(newTaskList);
    saveTasks(newTaskList);
  };

  const handleEditTask = (id: string, updates: Partial<OmniTask>) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        let newTask = { ...t, ...updates, updatedAt: new Date().toISOString() };
        
        // If becoming recurring and history is missing, init it.
        if (updates.recurrence && !newTask.completionHistory) {
          newTask.completionHistory = [];
        }

        if (newTask.originalAiData && (updates.title || updates.description)) {
          newTask.alignmentScore = calculateTaskAlignment(
            newTask.originalAiData.title,
            newTask.title,
            newTask.originalAiData.description,
            newTask.description
          );
        }
        return newTask;
      }
      return t;
    });
    setTasks(updated);
    saveTasks(updated);
  };

  // Helper to calculate parent progress recursively
  const recalculateParentProgress = (taskList: OmniTask[], parentId: string): OmniTask[] => {
    let currentTasks = [...taskList];
    
    // Find parent
    const parentIndex = currentTasks.findIndex(t => t.id === parentId);
    if (parentIndex === -1) return currentTasks;
    
    const parent = currentTasks[parentIndex];
    if (parent.subTaskIds.length === 0) {
      // If a parent has no subtasks, it's 100% completed based on its children.
      if (parent.completionPercentage !== 100) {
        currentTasks[parentIndex] = { ...parent, completionPercentage: 100 };
        if (parent.parentId) {
          return recalculateParentProgress(currentTasks, parent.parentId);
        }
      }
      return currentTasks;
    }

    const children = currentTasks.filter(t => parent.subTaskIds.includes(t.id));
    
    // Get scores for all children (consistency for recurring, completionPercentage for non-recurring)
    const now = new Date();
    const childScores = children.map(child => {
      if (child.recurrence) {
        // For recurring subtasks, use their consistency score
        return getConsistencyMetrics(child, now).score;
      } else {
        // For non-recurring subtasks, use their completion percentage
        return child.completionPercentage || 0;
      }
    });

    // The parent's completion is the minimum of its children's scores/percentages
    // If any child is 0%, the parent is 0%.
    const newPercentage = childScores.length > 0 ? Math.min(...childScores) : 100;
    
    // Update parent if its percentage has changed
    if (parent.completionPercentage !== newPercentage) {
      currentTasks[parentIndex] = { ...parent, completionPercentage: newPercentage };
      // Recurse up if this parent has a parent
      if (parent.parentId) {
        return recalculateParentProgress(currentTasks, parent.parentId);
      }
    }
    
    return currentTasks;
  };

  const handleProgressChange = (id: string, percentage: number) => {
    let updatedTasks = tasks.map(t => t.id === id ? { ...t, completionPercentage: percentage } : t);
    
    const task = tasks.find(t => t.id === id);
    if (task && task.parentId) {
      updatedTasks = recalculateParentProgress(updatedTasks, task.parentId);
    }

    // Auto-complete if 100%
    if (percentage === 100) {
      // For non-recurring tasks, mark as completed. For recurring, this is handled by explicit buttons.
      if (!task?.recurrence) {
        handleStatusChange(id, TaskStatus.COMPLETED, undefined, updatedTasks);
      }
    } else if (percentage < 100 && task?.status === TaskStatus.COMPLETED && !task.recurrence) {
      // Revert status if dragged back for non-recurring
       handleStatusChange(id, TaskStatus.TODO, undefined, updatedTasks);
    } else {
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
    }
  };

  const handleStatusChange = (
    id: string,
    status: TaskStatus, // This parameter is primarily for non-recurring tasks.
    wasSuccessfulAttempt?: boolean, // Explicitly set for recurring tasks
    currentTasksOverride?: OmniTask[]
  ) => {
    const sourceTasks = currentTasksOverride || tasks;
    const task = sourceTasks.find(t => t.id === id);
    
    if (!task) return;

    let updatedTasks: OmniTask[] = [];

    // Recurring Logic
    if (task.recurrence) {
       const now = new Date();
       const currentConsistency = getConsistencyMetrics(task, now); // Get consistency BEFORE potential action

       let newHistory = [...(task.completionHistory || [])];
       let newRecurrence = { ...task.recurrence! };
       let nextDate = task.dueDate; 
       let newStatus = TaskStatus.TODO; 
       let newCompletionPercentage = 0; 

       // Determine if a new completion record should be added for the *current expected period*
       // If totalAttemptsLogged is already >= expected, then this action *doesn't* fill a new slot for this period.
       // It just means we're advancing to the next period.
       const shouldAddNewRecordToHistory = currentConsistency.totalAttemptsLogged < currentConsistency.expected;

       if (shouldAddNewRecordToHistory) {
           newHistory.push({ completedAt: now.toISOString(), wasSuccessful: wasSuccessfulAttempt! });

           // Streak logic
           let tempStreak = newRecurrence.streak || 0;
           if (wasSuccessfulAttempt) {
             tempStreak += 1;
           } else {
             // If we are recording a miss, the streak resets
             tempStreak = 0;
           }
           newRecurrence.streak = tempStreak;
       }
       
       // Always advance the due date for the next cycle, regardless of whether a record was added for *this* period.
       nextDate = getNextDueDate(task.dueDate, task.recurrence.frequency, task.recurrence.interval);

       // Streak logic
       let tempStreak = newRecurrence.streak || 0;
       if (wasSuccessfulAttempt) {
         tempStreak += 1;
       } else {
         // Reset streak only if the current *actual* achievements are less than *expected*
         // This prevents streak reset if the period was already fully achieved.
         if (currentConsistency.actual < currentConsistency.expected) {
           tempStreak = 0;
         }
       }
       newRecurrence.streak = tempStreak;

       // After updating history and calculating next due date, re-evaluate consistency
       // This re-evaluation will use the potentially updated `newHistory` to get the final `actual` and `missed` for display.
       // We need to pass the *new* state of the task to getConsistencyMetrics for the streak capping.
       const tempTaskForConsistencyCheck = { ...task, completionHistory: newHistory, dueDate: nextDate, recurrence: newRecurrence };
       const finalConsistency = getConsistencyMetrics(tempTaskForConsistencyCheck, now); // Use 'now' as the reference point

       // Apply streak capping logic based on the final consistency metrics
       newRecurrence.streak = Math.min(newRecurrence.streak, finalConsistency.actual);

       // Check if recurrence should end
       if (newRecurrence.endDate) {
         const endDateTime = new Date(newRecurrence.endDate).getTime();
         if (new Date(nextDate).getTime() > endDateTime) {
           // Recurrence has finished
           newRecurrence = undefined;
           newStatus = TaskStatus.COMPLETED; // Permanently mark as completed
           newCompletionPercentage = 100;
           nextDate = task.dueDate; // Keep the last due date for historical context
         }
       }

       updatedTasks = sourceTasks.map(t => {
         if (t.id === id) {
           return {
             ...t,
             status: newStatus,
             completionPercentage: newCompletionPercentage,
             dueDate: nextDate,
             recurrence: newRecurrence,
             completionHistory: newHistory, // Use the potentially *unchanged* history if period was full
             updatedAt: new Date().toISOString()
           };
         }
         return t;
       });

    } else {
       // Standard Logic (non-recurring tasks)
       updatedTasks = sourceTasks.map(t => {
        if (t.id === id) {
          return { 
            ...t, 
            status, 
            completionPercentage: status === TaskStatus.COMPLETED ? 100 : t.completionPercentage,
            updatedAt: new Date().toISOString() 
          };
        }
        return t;
       });
    }

    // Recalculate parent progress if needed
    if (task.parentId) {
      updatedTasks = recalculateParentProgress(updatedTasks, task.parentId);
    }

    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleMissedWithAI = async (taskId: string, reason: string) => {
    if (!currentUser) return;
    setApiErrorMessage(null); // Clear previous errors

    try {
      const parentTask = tasks.find(t => t.id === taskId);
      if (!parentTask) return;

      const aiSolutions = await reassessTask(parentTask, reason);
      
      // Check if AI suggests updating the main task (only for non-recurring)
      // We assume if the AI returns a task with the exact same title, it's an update.
      const updateToParent = aiSolutions.find((t: any) => t.title === parentTask.title);
      const newSubtasksData = aiSolutions.filter((t: any) => t.title !== parentTask.title);

      let updatedTasks = [...tasks];

      // 1. Handle Parent Update (Extension) - ONLY if not recurring
      if (updateToParent && !parentTask.recurrence && updateToParent.dueDate) {
          updatedTasks = updatedTasks.map(t => 
              t.id === taskId ? { 
                ...t, 
                dueDate: updateToParent.dueDate, 
                overdueExplanation: reason, 
                status: TaskStatus.TODO 
              } : t
          );
      }

      // 2. Handle New Subtasks
      let newSolutionTasks: OmniTask[] = [];
      if (newSubtasksData.length > 0) {
          newSolutionTasks = newSubtasksData.map((t: any) => {
            const tid = Math.random().toString(36).substr(2, 9);
            return {
                ...t,
                id: tid,
                status: TaskStatus.TODO,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ownerId: currentUser.id,
                collaborators: [],
                subTaskIds: [],
                parentId: parentTask.id, // Link solution tasks as subtasks to the missed task
                isAiGenerated: true,
                originalAiData: { title: t.title, description: t.description },
                alignmentScore: 1.0,
                metadata: {},
                completionPercentage: 0,
                recurrence: undefined // Ensure solution tasks aren't recurring by default
            };
          }) as OmniTask[];

          // Update parent to include new subtasks
          updatedTasks = updatedTasks.map(t => 
              t.id === taskId ? { ...t, subTaskIds: [...t.subTaskIds, ...newSolutionTasks.map(st => st.id)] } : t
          ).concat(newSolutionTasks);
      }
      
      // Update parent progress
      updatedTasks = recalculateParentProgress(updatedTasks, taskId); // Recalculate based on the original missed task

      setTasks(updatedTasks);
      saveTasks(updatedTasks);

      // 3. Handle Status Change
      // Only mark as missed/completed if it is a recurring task that needs to advance cycle.
      if (parentTask.recurrence) {
        handleStatusChange(taskId, TaskStatus.COMPLETED, false, updatedTasks);
      }

    } catch (error: any) {
      console.error("Failed to generate AI solution for missed task:", error);
      setApiErrorMessage(error.message);
      setTimeout(() => setApiErrorMessage(null), 15000); // Clear message after 15 seconds
    }
  };

  const handleCreateSubtask = (parentId: string, title: string, description: string, dueDate?: string, recurrence?: RecurrenceConfig) => {
    if (!currentUser) return;
    const parentTask = tasks.find(t => t.id === parentId);
    const newSubtask: OmniTask = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: dueDate || parentTask?.dueDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: currentUser.id,
      collaborators: [],
      subTaskIds: [],
      parentId: parentId,
      isAiGenerated: false,
      metadata: {},
      completionPercentage: 0,
      recurrence: recurrence,
      completionHistory: recurrence ? [] : undefined
    };
    let updatedTasks = tasks.map(t => t.id === parentId ? { ...t, subTaskIds: [...t.subTaskIds, newSubtask.id] } : t);
    updatedTasks = [newSubtask, ...updatedTasks];
    // Recalculate parent immediately as adding a 0% task drops the average
    updatedTasks = recalculateParentProgress(updatedTasks, parentId);
    
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleGenerateSubtasks = async (parentId: string, request: string) => {
    if (!currentUser) return;
    // The `isGenerating` state is managed within the TaskCard component that triggered this action.
    // This `App` component's `isLoading` state is for top-level goal creation.
    setApiErrorMessage(null); // Clear previous errors
    try {
      const parentTask = tasks.find(t => t.id === parentId);
      if (!parentTask) return;

      const subtasks = await generateSubtasks(parentTask, request);
      
      const newTasks = subtasks.map((t: any) => {
        const tid = Math.random().toString(36).substr(2, 9);
        return {
            ...t,
            id: tid,
            status: TaskStatus.TODO,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerId: currentUser.id,
            collaborators: [],
            subTaskIds: [],
            parentId: parentId,
            isAiGenerated: true,
            originalAiData: { title: t.title, description: t.description },
            alignmentScore: 1.0,
            metadata: {},
            completionPercentage: 0,
            recurrence: t.recurrence ? { ...t.recurrence, streak: 0, startDate: new Date().toISOString() } : undefined
        };
      }) as OmniTask[];

      const updatedParent = { ...parentTask, subTaskIds: [...parentTask.subTaskIds, ...newTasks.map(t => t.id)] };
      
      let updatedTasks = tasks.map(t => t.id === parentId ? updatedParent : t).concat(newTasks);
      
      // Update parent progress
      updatedTasks = recalculateParentProgress(updatedTasks, parentId);

      setTasks(updatedTasks);
      saveTasks(updatedTasks);
    } catch (error: any) {
      console.error("Failed to generate subtasks", error);
      setApiErrorMessage(error.message);
      setTimeout(() => setApiErrorMessage(null), 15000); // Clear message after 15 seconds
    } finally {
      // The `isGenerating` state is managed within the TaskCard component.
    }
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    const parentId = taskToDelete?.parentId;

    const idsToDelete = new Set<string>([id]);
    const findChildren = (pid: string) => {
      tasks.filter(t => t.parentId === pid).forEach(child => {
        idsToDelete.add(child.id);
        findChildren(child.id);
      });
    };
    findChildren(id);
    let updated = tasks.filter(t => !idsToDelete.has(t.id));

    if (parentId) {
      updated = updated.map(t => t.id === parentId ? { ...t, subTaskIds: t.subTaskIds.filter(sid => sid !== id) } : t);
      updated = recalculateParentProgress(updated, parentId);
    }

    setTasks(updated);
    saveTasks(updated);
  };

  const topLevelTasks = useMemo(() => tasks.filter(t => !t.parentId), [tasks]);

  const { totalMissedCycles, totalSuccessfulCycles, overallRecurringCompletionPercentage } = useMemo(() => {
    let totalMissed = 0;
    let totalSuccessful = 0;
    let totalExpectedOverall = 0;

    const now = new Date(); // Capture current time once for consistent calculation

    tasks.forEach(task => {
      if (task.recurrence) {
        const consistency = getConsistencyMetrics(task, now); // Use utility
        // Sum the capped actual and missed counts for the overall summary
        totalSuccessful += consistency.actual;
        totalMissed += consistency.missed;
        totalExpectedOverall += consistency.expected;
      }
    });

    const overallPercentage = totalExpectedOverall > 0 ? 
        (totalSuccessful / totalExpectedOverall) * 100 : 
        0;

    return {
      totalMissedCycles: totalMissed,
      totalSuccessfulCycles: totalSuccessful,
      overallRecurringCompletionPercentage: Math.min(100, overallPercentage)
    };
  }, [tasks]); // Recalculate whenever tasks change


  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl"><Activity size={40} className="text-white" /></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Resolution AI</h1>
            <p className="text-slate-500 font-medium">AI-Powered Habit Tracking & Goal Achievement.</p>
          </div>
          <button onClick={handleLogin} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl">{isAuthLoading ? "Loading..." : "Sign in with Google"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><Activity size={24} /></div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Resolution AI</h1>
          </div>
          <nav className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('tasks')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>Goals</button>
            <button onClick={() => setActiveTab('experiments')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'experiments' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>Insights</button>
          </nav>
          <div className="flex items-center gap-3">
             <div className="text-right"><div className="text-xs font-black text-slate-900 leading-none">{currentUser.name}</div><button onClick={handleLogout} className="text-[10px] font-black text-red-500 uppercase mt-1">Logout</button></div>
             <img src={currentUser.avatar} className="w-10 h-10 rounded-2xl border-2 border-indigo-100" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {apiErrorMessage && (
            <div 
                className="fixed bottom-6 right-6 p-4 rounded-xl shadow-lg bg-red-50 border border-red-200 text-red-700 animate-in fade-in slide-in-from-right-4 z-50 max-w-sm"
                role="alert"
            >
                <div className="flex items-start">
                    <X size={20} className="mt-0.5 mr-3 flex-shrink-0 text-red-500" />
                    <div>
                        <strong className="font-bold text-sm">AI Service Error</strong>
                        <p className="text-xs mt-1">{apiErrorMessage}</p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'tasks' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-4">
              <section className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-indigo-100/30 sticky top-28">
                <h2 className="text-xl font-black text-slate-900 uppercase mb-6">New Resolution</h2>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Lose 10 lbs by March, Learn Spanish, Sleep better..." className="w-full h-40 p-5 rounded-3xl border-2 border-slate-100 bg-slate-50 mb-6 focus:border-indigo-500 outline-none" />
                <button onClick={handleCreateTasks} disabled={isLoading || !goal} className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-xl">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Generate Plan"}</button>
                <button 
                  onClick={handleGenerateSampleTasks} 
                  disabled={isLoading} 
                  className="w-full bg-slate-200 text-slate-600 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-md mt-4 hover:bg-slate-300 disabled:opacity-50 transition-all"
                >
                  Generate Sample Resolution
                </button>
              </section>

              {/* Recurring Task Summary Section */}
              <section className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-indigo-100/30 mt-8 sticky top-[28rem]">
                  <h2 className="text-xl font-black text-slate-900 uppercase mb-6">Recurring Task Summary</h2>
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                              <X size={20} className="text-red-500" />
                              <span className="text-sm font-bold text-slate-700">Total Missed Cycles</span>
                          </div>
                          <span className="text-xl font-black text-red-600">{totalMissedCycles}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                              <CheckCircle size={20} className="text-emerald-500" />
                              <span className="text-sm font-bold text-slate-700">Overall Success Rate</span>
                          </div>
                          <span className="text-xl font-black text-emerald-600">{overallRecurringCompletionPercentage.toFixed(1)}%</span>
                      </div>
                  </div>
              </section>
            </aside>
            <section className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-5">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Active Resolutions</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {topLevelTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    allTasks={tasks} 
                    onStatusChange={handleStatusChange} 
                    onProgressChange={handleProgressChange}
                    onReassess={()=>{}} 
                    onUpdateCollaborators={()=>{}} 
                    onCreateSubtask={handleCreateSubtask} 
                    onGenerateSubtasks={handleGenerateSubtasks} 
                    onDeleteTask={handleDeleteTask} 
                    onEditTask={handleEditTask}
                    onMissedWithAI={handleMissedWithAI}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <ExperimentView experiments={experiments} tasks={tasks} />
        )}
      </main>
    </div>
  );
};

export default App;