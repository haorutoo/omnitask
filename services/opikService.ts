
import { OpikTrace, Experiment } from "../types";

const STORAGE_KEY = 'omnitask_opik_logs';

export const logToOpik = (trace: OpikTrace) => {
  const logs = getOpikLogs();
  logs.push(trace);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  
  // Firestore Backup Simulation
  console.log("Backing up trace to Firestore:", trace.id);
};

export const getOpikLogs = (): OpikTrace[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Fixed: Added originalTaskSnapshots and associatedTaskIds to match Experiment interface requirements
export const createExperiment = (
  userPrompt: string, 
  originalTaskSnapshots: { id: string; title: string; description: string; }[],
  baseline: OpikTrace, 
  associatedTaskIds?: string[],
  optimized?: OpikTrace
): Experiment => {
  const experiment: Experiment = {
    id: `exp-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userPrompt,
    associatedTaskIds,
    originalTaskSnapshots,
    variants: { baseline, optimized }
  };
  
  const experiments = getExperiments();
  experiments.push(experiment);
  localStorage.setItem('omnitask_experiments', JSON.stringify(experiments));
  return experiment;
};

export const getExperiments = (): Experiment[] => {
  const data = localStorage.getItem('omnitask_experiments');
  return data ? JSON.parse(data) : [];
};
