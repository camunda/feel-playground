import { parseContext } from './parseContext';
import type {
  EvaluationContext,
  FeelVariable
} from './types';

export function resolveAutocompleteVariables(
    contextValue: string,
    variables: FeelVariable[]): FeelVariable[] {
  let context: EvaluationContext;

  try {
    context = parseContext(contextValue);
  } catch {
    return variables;
  }

  return mergeVariables(variables, toVariables(context));
}

function toVariables(context: EvaluationContext): FeelVariable[] {
  return Object.entries(context).map(([ name, value ]) => toVariable(name, value));
}

function toVariable(name: string, value: unknown): FeelVariable {
  const variable: FeelVariable = {
    name,
    detail: getDetail(value),
    info: JSON.stringify(value, null, 2)
  };

  if (Array.isArray(value)) {
    variable.isList = true;

    if (value.length) {
      const entries = toEntries(value[0]);

      if (entries) {
        variable.entries = entries;
      }
    }
  } else {
    const entries = toEntries(value);

    if (entries) {
      variable.entries = entries;
    }
  }

  return variable;
}

function toEntries(value: unknown): FeelVariable[] | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return undefined;
  }

  return toVariables(value as EvaluationContext);
}

function getDetail(value: unknown): string {
  if (value === null) {
    return 'Null';
  }

  if (Array.isArray(value)) {
    return 'List';
  }

  if (typeof value === 'object') {
    return 'Context';
  }

  const type = typeof value;

  return `${type[0].toUpperCase()}${type.slice(1)}`;
}

function mergeVariables(
    target: FeelVariable[],
    source: FeelVariable[]): FeelVariable[] {
  const merged = target.map(cloneVariable);

  source.forEach(variable => {
    const existing = merged.find(({ name }) => name === variable.name);

    if (!existing) {
      merged.push(cloneVariable(variable));
      return;
    }

    existing.detail = mergeText(existing.detail, variable.detail, '|');
    existing.info = mergeText(existing.info, variable.info, '\n');

    const isList = mergeList(existing.isList, variable.isList);

    if (typeof isList !== 'undefined') {
      existing.isList = isList;
    }

    const entries = mergeVariables(existing.entries || [], variable.entries || []);

    if (entries.length) {
      existing.entries = entries;
    }
  });

  return merged;
}

function cloneVariable(variable: FeelVariable): FeelVariable {
  const clone = { ...variable };

  if (variable.entries) {
    clone.entries = variable.entries.map(cloneVariable);
  }

  return clone;
}

function mergeText(
    target: string | undefined,
    source: string | undefined,
    separator: string): string | undefined {
  if (!target) {
    return source;
  }

  if (!source || target === source) {
    return target;
  }

  return [ target, source ].sort().join(separator);
}

function mergeList(
    target: FeelVariable['isList'],
    source: FeelVariable['isList']): FeelVariable['isList'] {
  if (target === source) {
    return target;
  }

  if (typeof target === 'undefined') {
    return source;
  }

  if (typeof source === 'undefined') {
    return target;
  }

  return 'optional';
}
