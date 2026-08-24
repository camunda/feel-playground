import type { EvaluationContext } from './types';

export function parseContext(value: string): EvaluationContext {
  if (!value || !value.trim()) {
    return {};
  }

  const context: unknown = JSON.parse(value);

  if (!context || Array.isArray(context) || typeof context !== 'object') {
    throw new Error('Context must be a JSON object.');
  }

  return context as EvaluationContext;
}
