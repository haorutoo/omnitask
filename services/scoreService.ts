
import { OmniTask, Experiment } from "../types";

/**
 * Calculates the Levenshtein distance between two strings.
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, i) => i)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

export const getSimilarityScore = (original: string, current: string): number => {
  if (original === current) return 1;
  if (!original || !current) return 0;
  const distance = getLevenshteinDistance(original, current);
  const maxLen = Math.max(original.length, current.length);
  return 1 - distance / maxLen;
};

export const calculateTaskAlignment = (
  originalTitle: string,
  currentTitle: string,
  originalDesc: string,
  currentDesc: string
): number => {
  const titleScore = getSimilarityScore(originalTitle, currentTitle);
  const descScore = getSimilarityScore(originalDesc, currentDesc);
  return (titleScore + descScore) / 2;
};

/**
 * Calculates a holistic project grade based on text edits, deletions, and manual additions.
 */
export const calculateProjectAlignment = (
  experiment: Experiment,
  allTasks: OmniTask[]
) => {
  const originalIds = new Set(experiment.originalTaskSnapshots.map(s => s.id));
  
  // Tasks currently in existence for this project
  const currentProjectTasks = allTasks.filter(t => 
    t.parentId === experiment.associatedTaskIds?.[0] || // Goal children
    experiment.associatedTaskIds?.includes(t.id)        // The goal itself
  );

  const aiTasksRemaining = currentProjectTasks.filter(t => t.isAiGenerated);
  const manualAdditions = currentProjectTasks.filter(t => !t.isAiGenerated && t.id !== experiment.associatedTaskIds?.[0]);
  
  const deletedAiCount = experiment.originalTaskSnapshots.length - aiTasksRemaining.length;

  // Sum of text similarity scores for AI tasks that were kept
  const totalSimilarity = aiTasksRemaining.reduce((acc, task) => {
    return acc + (task.alignmentScore ?? 1);
  }, 0);

  // Denominator: The total number of steps that SHOULD have been generated correctly
  // Includes original AI steps + any steps the human had to add manually
  const totalComplexityCount = experiment.originalTaskSnapshots.length + manualAdditions.length;

  const holisticScore = totalSimilarity / totalComplexityCount;

  return {
    score: holisticScore,
    refinedCount: aiTasksRemaining.filter(t => (t.alignmentScore ?? 1) < 0.98).length,
    deletedCount: deletedAiCount,
    addedCount: manualAdditions.length,
    remainingAiCount: aiTasksRemaining.length
  };
};
