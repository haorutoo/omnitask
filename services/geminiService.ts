
import { GoogleGenAI, Type } from "@google/genai";
import { OmniTask, TaskStatus, Priority } from "../types";

// Always initialize inside the function to use process.env.API_KEY directly

export const taskSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
      dueDate: { type: Type.STRING, description: 'ISO string format' },
      completionPercentage: { type: Type.NUMBER, description: 'Initial progress 0-100' },
      recurrence: {
        type: Type.OBJECT,
        properties: {
          frequency: { type: Type.STRING, enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] },
          interval: { type: Type.NUMBER, description: 'e.g. 1 for every day, 2 for every other day' },
          streak: { type: Type.NUMBER }
        }
      },
      metadata: {
        type: Type.OBJECT,
        properties: {
          quantity: { type: Type.STRING },
          brand: { type: Type.STRING },
          itemType: { type: Type.STRING },
          location: { type: Type.STRING },
          contactInfo: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          recipe: { type: Type.STRING },
          startTime: { type: Type.STRING },
          attendees: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      }
    },
    required: ['title', 'description', 'priority', 'dueDate']
  }
};

const SYSTEM_INSTRUCTION_BASE = `
You are the Resolution AI Coach. Your goal is to break down self-improvement goals (New Year's Resolutions) into a list of detailed, actionable steps and habits.
Every task you create must be comprehensive. For example:
- Habits: If a task implies repetition (e.g., "Sleep 8 hours", "Daily meditation", "Gym"), set the 'recurrence' field appropriately (frequency: 'daily', interval: 1).
- Projects: Include specific steps, resources needed, or milestones.
- Learning: Include study schedules, resources, or practice sessions.
- Shopping/Prep: Include specific items to buy (e.g. "Buy running shoes", "Get gym membership").

If a task is overdue and the user provides an explanation:
1. If they lacked time, adjust the timeline.
2. If it's too difficult, break it into smaller sub-tasks to help them overcome obstacles.
`;

const OPTIMIZED_PROMPT_PREFIX = `
[PROMPT OPTIMIZER ENABLED]
Focus on maximizing the 'specificity' and 'completeness' heuristics. 
Ensure every task has a clear success criterion in the description.
Structure the timeline with logical dependencies.
`;

export const generateTasks = async (goal: string, useOptimizer: boolean = false) => {
  // Corrected initialization to use process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = 'gemini-3-pro-preview';
  
  const systemPrompt = useOptimizer 
    ? SYSTEM_INSTRUCTION_BASE + "\n" + OPTIMIZED_PROMPT_PREFIX
    : SYSTEM_INSTRUCTION_BASE;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Goal: ${goal}`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: taskSchema,
      thinkingConfig: { thinkingBudget: 4000 }
    },
  });

  // Extract generated text directly from response.text
  const responseText = response.text || "[]";

  return {
    raw: responseText,
    tasks: JSON.parse(responseText) as Partial<OmniTask>[],
    // Thinking steps extraction corrected to placeholder as specific field access is discouraged
    thinking: "AI generated tasks based on goal complexity."
  };
};

export const generateSubtasks = async (parentTask: OmniTask, request: string) => {
  // Corrected initialization
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Parent Task: "${parentTask.title}" (${parentTask.description}). 
  User wants to break this down specifically with: "${request}". 
  Generate a list of granular subtasks that fit within this parent task's context.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema: taskSchema
    }
  });

  const responseText = response.text || "[]";
  return JSON.parse(responseText) as Partial<OmniTask>[];
};

export const reassessTask = async (task: OmniTask, explanation: string) => {
  // Corrected initialization
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The task "${task.title}" is overdue. User explanation: "${explanation}". 
    Based on this, should I extend the deadline or create new sub-tasks? Return a JSON array of updated or new tasks.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema: taskSchema
    }
  });

  const responseText = response.text || "[]";
  return JSON.parse(responseText) as Partial<OmniTask>[];
};

export const evaluateQuality = async (prompt: string, response: string) => {
  // Corrected initialization
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const evalPrompt = `
    Rate the following AI task generation on a scale of 0-1 for:
    1. Completeness (Are all steps covered?)
    2. Specificity (Are metadata fields like brand/quantity/location filled?)
    3. Relevance (Do they match the goal?)
    
    Goal: ${prompt}
    Response: ${response}
    
    Return JSON with scores and a brief critique.
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: evalPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          completeness: { type: Type.NUMBER },
          specificity: { type: Type.NUMBER },
          relevance: { type: Type.NUMBER },
          critique: { type: Type.STRING }
        }
      }
    }
  });

  const responseText = result.text || "{}";
  return JSON.parse(responseText);
};


// import { GoogleGenAI, Type } from "@google/genai";
// import { OmniTask, TaskStatus, Priority } from "../types";

// // Always initialize inside the function to use process.env.API_KEY directly

// export const taskSchema = {
//   type: Type.ARRAY,
//   items: {
//     type: Type.OBJECT,
//     properties: {
//       title: { type: Type.STRING },
//       description: { type: Type.STRING },
//       priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
//       dueDate: { type: Type.STRING, description: 'ISO string format' },
//       completionPercentage: { type: Type.NUMBER, description: 'Initial progress 0-100' },
//       recurrence: {
//         type: Type.OBJECT,
//         properties: {
//           frequency: { type: Type.STRING, enum: ['minutely', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'] },
//           interval: { type: Type.NUMBER, description: 'e.g. 1 for every day, 2 for every other day' },
//           streak: { type: Type.NUMBER },
//           endDate: { type: Type.STRING, description: 'ISO string format for when the recurrence should end' }
//         }
//       },
//       metadata: {
//         type: Type.OBJECT,
//         properties: {
//           quantity: { type: Type.STRING },
//           brand: { type: Type.STRING },
//           itemType: { type: Type.STRING },
//           location: { type: Type.STRING },
//           contactInfo: { type: Type.STRING },
//           ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
//           recipe: { type: Type.STRING },
//           startTime: { type: Type.STRING },
//           attendees: { type: Type.ARRAY, items: { type: Type.STRING } },
//         }
//       }
//     },
//     required: ['title', 'description', 'priority', 'dueDate']
//   }
// };

// const SYSTEM_INSTRUCTION_BASE = `
// You are the OmniTask AI Architect. Your goal is to break down complex goals into a list of detailed, actionable "OmniTask" objects.
// Every task you create must be comprehensive. For example:
// - Shopping: Include quantity, brand, and type in the metadata.
// - Meetings: Include location, time, attendees, and contact info.
// - Cooking/Projects: Include ingredients, recipes, or detailed steps.
// - Habits: If a task implies repetition (e.g., "Sleep 8 hours", "Daily standup"), set the 'recurrence' field appropriately (frequency: 'daily', interval: 1).

// If a task is overdue and the user provides an explanation:
// 1. If they lacked time, adjust the timeline.
// 2. If it's too difficult, break it into smaller sub-tasks to help them overcome obstacles.
// `;

// const OPTIMIZED_PROMPT_PREFIX = `
// [PROMPT OPTIMIZER ENABLED]
// Focus on maximizing the 'specificity' and 'completeness' heuristics. 
// Ensure every task has a clear success criterion in the description.
// Structure the timeline with logical dependencies.
// `;

// // Helper function to handle API errors, especially quota issues
// const handleApiError = async (error: any): Promise<never> => {
//   console.error("Gemini API Error:", error);
//   let errorMessage = "An unexpected AI error occurred. Please try again.";

//   // Check for RESOURCE_EXHAUSTED or similar quota errors (code 429)
//   if (error.code === 429 || (error.message && (error.message.includes("quota") || error.message.includes("rate-limits")))) {
//     console.warn("API quota exceeded. Attempting to prompt user for new API key.");
//     errorMessage = "AI quota exceeded. Please select a valid API key with sufficient quota and try again. Visit ai.google.dev/gemini-api/docs/billing for more information.";
    
//     // Check if window.aistudio exists and has openSelectKey method (as per Veo guidelines)
//     if (typeof window !== 'undefined' && (window as any).aistudio && (window as any).aistudio.openSelectKey) {
//       try {
//         await (window as any).aistudio.openSelectKey();
//         console.log("API key selection dialog opened.");
//       } catch (keySelectError) {
//         console.error("Failed to open API key selection dialog:", keySelectError);
//         errorMessage = "AI quota exceeded. Please manually ensure your API key is valid and has sufficient quota. Visit ai.google.dev/gemini-api/docs/billing for more information.";
//       }
//     } else {
//       console.warn("window.aistudio.openSelectKey not available. Cannot prompt for key selection.");
//     }
//   }
//   throw new Error(errorMessage);
// };


// export const generateTasks = async (goal: string, useOptimizer: boolean = false) => {
//   // Corrected initialization to use process.env.API_KEY directly
//   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
//   const modelName = 'gemini-3-pro-preview';
  
//   const systemPrompt = useOptimizer 
//     ? SYSTEM_INSTRUCTION_BASE + "\n" + OPTIMIZED_PROMPT_PREFIX
//     : SYSTEM_INSTRUCTION_BASE;

//   try {
//     const response = await ai.models.generateContent({
//       model: modelName,
//       contents: `Goal: ${goal}`,
//       config: {
//         systemInstruction: systemPrompt,
//         responseMimeType: "application/json",
//         responseSchema: taskSchema,
//         thinkingConfig: { thinkingBudget: 4000 }
//       },
//     });

//     // Extract generated text directly from response.text
//     const responseText = response.text || "[]";

//     return {
//       raw: responseText,
//       tasks: JSON.parse(responseText) as Partial<OmniTask>[],
//       // Thinking steps extraction corrected to placeholder as specific field access is discouraged
//       thinking: "AI generated tasks based on goal complexity."
//     };
//   } catch (error: any) {
//     await handleApiError(error); // This function will throw
//   }
// };

// export const generateSubtasks = async (parentTask: OmniTask, request: string) => {
//   // Corrected initialization
//   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
//   const prompt = `Parent Task: "${parentTask.title}" (${parentTask.description}). 
//   User wants to break this down specifically with: "${request}". 
//   Generate a list of granular subtasks that fit within this parent task's context.`;

//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-3-flash-preview',
//       contents: prompt,
//       config: {
//         systemInstruction: SYSTEM_INSTRUCTION_BASE,
//         responseMimeType: "application/json",
//         responseSchema: taskSchema
//       }
//     });

//     const responseText = response.text || "[]";
//     return JSON.parse(responseText) as Partial<OmniTask>[];
//   } catch (error: any) {
//     await handleApiError(error); // This function will throw
//   }
// };

// export const reassessTask = async (task: OmniTask, explanation: string) => {
//   // Corrected initialization
//   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
//   const response = await ai.models.generateContent({
//     model: 'gemini-3-flash-preview',
//     contents: `The task "${task.title}" is overdue. User explanation: "${explanation}". 
//     Based on this, should I extend the deadline or create new sub-tasks? Return a JSON array of updated or new tasks.`,
//     config: {
//       systemInstruction: SYSTEM_INSTRUCTION_BASE,
//       responseMimeType: "application/json",
//       responseSchema: taskSchema
//     }
//   });

//   const responseText = response.text || "[]";
//   return JSON.parse(responseText) as Partial<OmniTask>[];
// };

// export const evaluateQuality = async (prompt: string, response: string) => {
//   // Corrected initialization
//   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
//   const evalPrompt = `
//     Rate the following AI task generation on a scale of 0-1 for:
//     1. Completeness (Are all steps covered?)
//     2. Specificity (Are metadata fields like brand/quantity/location filled?)
//     3. Relevance (Do they match the goal?)
    
//     Goal: ${prompt}
//     Response: ${response}
    
//     Return JSON with scores and a brief critique.
//   `;

//   try {
//     const result = await ai.models.generateContent({
//       model: 'gemini-3-flash-preview',
//       contents: evalPrompt,
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: Type.OBJECT,
//           properties: {
//             completeness: { type: Type.NUMBER },
//             specificity: { type: Type.NUMBER },
//             relevance: { type: Type.NUMBER },
//             critique: { type: Type.STRING }
//           }
//         }
//       }
//     });

//     const responseText = result.text || "{}";
//     return JSON.parse(responseText);
//   } catch (error: any) {
//     await handleApiError(error); // This function will throw
//   }
// };
