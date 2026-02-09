
import { OmniTask } from "../types";

const TASKS_KEY = 'omnitask_data';

/**
 * Generic Firestore update simulation.
 * In a production environment, this would interface with the firebase/firestore SDK.
 */
export const logModificationToFirestore = async (action: string, data: any) => {
  try {
    const logEntry = {
      action,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Simulation of a firestore.collection('modifications').add(logEntry)
    console.debug("[Firestore Log]", logEntry);
    
    // If a real Firestore instance were configured:
    // const db = getFirestore();
    // await addDoc(collection(db, "modifications"), logEntry);
    
  } catch (error) {
    // Graceful error handling to prevent app crashes during telemetry logging
    console.error("Critical: Failed to log modification to Firestore", error);
  }
};

export const saveTasks = (tasks: OmniTask[]) => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  logModificationToFirestore("save_tasks", { count: tasks.length });
};

export const loadTasks = (): OmniTask[] => {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
};
