import type { EvaluationContext } from './types';

export function addMissingContext(
    context: EvaluationContext,
    requiredContext: EvaluationContext
): EvaluationContext | null {
  const mergedContext = { ...context };
  let changed = false;

  Object.entries(requiredContext).forEach(([ key, requiredValue ]) => {
    if (!Object.hasOwn(context, key)) {
      mergedContext[key] = requiredValue;
      changed = true;

      return;
    }

    if (!isContext(requiredValue)) {
      return;
    }

    const currentValue = context[key];

    if (currentValue === null) {
      mergedContext[key] = requiredValue;
      changed = true;

      return;
    }

    if (!isContext(currentValue)) {
      return;
    }

    const mergedValue = addMissingContext(currentValue, requiredValue);

    if (mergedValue) {
      mergedContext[key] = mergedValue;
      changed = true;
    }
  });

  return changed ? mergedContext : null;
}

function isContext(value: unknown): value is EvaluationContext {
  return !!value && !Array.isArray(value) && typeof value === 'object';
}
