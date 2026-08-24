import type {
  EvaluationResult,
  EvaluationWarning
} from './types';

interface NormalizedEvaluationResult {
  result: unknown;
  warnings: EvaluationWarning[];
}

export function normalizeEvaluationResult(value: EvaluationResult): NormalizedEvaluationResult {
  if (!value || typeof value !== 'object' || !('result' in value)) {
    throw new Error('Evaluator must resolve to an object containing result.');
  }

  return {
    result: value.result,
    warnings: Array.isArray(value.warnings) ? value.warnings : []
  };
}
