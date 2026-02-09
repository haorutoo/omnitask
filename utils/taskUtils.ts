
import { OmniTask, CompletionRecord, RecurrenceConfig } from '../types';
import { ConsistencyMetrics } from '../types'; // Import from types.ts now that it's defined there

export const getConsistencyMetrics = (task: OmniTask, now: Date): ConsistencyMetrics => {
  if (!task.recurrence) return { score: 0, actual: 0, missed: 0, expected: 0, isFinished: false, totalAttemptsLogged: 0 };

  const start = new Date(task.recurrence.startDate || task.createdAt);
  let effectiveEndForExpected = now;
  let isFinished = false;

  if (task.recurrence.endDate) {
    const actualEndDate = new Date(task.recurrence.endDate);
    if (now >= actualEndDate) { // Use >= to include the end date itself
      effectiveEndForExpected = actualEndDate;
      isFinished = true; // Recurrence has officially ended or passed its end date
    } else {
      effectiveEndForExpected = now;
    }
  }

  const diffMs = effectiveEndForExpected.getTime() - start.getTime();
  const interval = task.recurrence.interval || 1;

  let expected = 0;

  switch (task.recurrence.frequency) {
    case 'minutely':
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60)) / interval);
      break;
    case 'hourly':
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60 * 60)) / interval);
      break;
    case 'daily':
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60 * 60 * 24)) / interval);
      break;
    case 'weekly':
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 7)) / interval);
      break;
    case 'monthly':
      // Simplified monthly calculation, could be more precise
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.4375)) / interval); // Average days in month
      break;
    case 'yearly':
      expected = Math.floor(Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25)) / interval); // Average days in year
      break;
  }
  
  // If the start date is in the past or now, there's at least one cycle (the current one)
  if (start.getTime() <= effectiveEndForExpected.getTime()) {
    expected = Math.max(1, expected + 1); 
  } else {
    expected = 0; // If start date is in the future, 0 expected cycles
  }

  const totalAttemptsLogged = (task.completionHistory?.length || 0);

  // 'actual' and 'missed' for display should be capped by 'expected' for the *current period*,
  // and their sum should not exceed 'expected'.
  let actualForDisplay = 0;
  let missedForDisplay = 0;

  // We need to count the *effective* achieved/missed for the expected cycles.
  // Iterate through completion history and "fill" the expected slots.
  // This ensures that actual + missed for display does not exceed expected.
  task.completionHistory?.forEach(record => {
      if (actualForDisplay + missedForDisplay < expected) {
          if (record.wasSuccessful) {
              actualForDisplay++;
          } else {
              missedForDisplay++;
          }
      }
  });
  
  // Calculate score based on actualForDisplay / expected
  let score = expected > 0 ? (actualForDisplay / expected) * 100 : 0;
  score = Math.min(100, score); // Cap score at 100%

  return { 
    score, 
    actual: actualForDisplay, 
    missed: missedForDisplay, 
    expected, 
    isFinished,
    totalAttemptsLogged // This is the raw count for internal logic
  };
};

export const getNextDueDate = (currentDate: string, frequency: string, interval: number = 1): string => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'minutely': date.setMinutes(date.getMinutes() + interval); break;
    case 'hourly': date.setHours(date.getHours() + interval); break;
    case 'daily': date.setDate(date.getDate() + interval); break;
    case 'weekly': date.setDate(date.getDate() + (interval * 7)); break;
    case 'monthly': date.setMonth(date.getMonth() + interval); break;
    case 'yearly': date.setFullYear(date.getFullYear() + interval); break;
  }
  return date.toISOString();
};
