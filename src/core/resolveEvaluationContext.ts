import { FeelAnalyzer } from '@bpmn-io/feel-analyzer';

import type { EvaluationContext, FeelLanguageContext } from './types';

export interface ContextVariable {
  name: string;
  entries?: ContextVariable[];
}

export interface ResolveEvaluationContextOptions {
  expression: string;
  variables?: ContextVariable[];
  feelLanguageContext?: FeelLanguageContext;
}

/**
 * Build the smallest context described by an expression, enriching referenced
 * paths with structure known to the host.
 */
export function resolveEvaluationContext({
  expression,
  variables = [],
  feelLanguageContext = {}
}: ResolveEvaluationContextOptions): EvaluationContext {
  if (!expression) {
    return toContext(variables);
  }

  const analyzer = new FeelAnalyzer(feelLanguageContext);
  const { inputs = [], functions = [] } = analyzer.analyzeExpression(expression);
  const functionNames = new Set(functions.map(({ name }) => name));
  const expressionVariables = inputs.filter(({ name }) => !functionNames.has(name));

  return toContext(projectVariables(expressionVariables, variables));
}

function projectVariables(
    variables: ContextVariable[],
    knownVariables: ContextVariable[]
): ContextVariable[] {
  return variables.map(variable => {
    const knownVariable = knownVariables.find(({ name }) => name === variable.name);

    if (!knownVariable) {
      return variable;
    }

    if (!variable.entries?.length) {
      return knownVariable;
    }

    return {
      ...knownVariable,
      ...variable,
      entries: projectVariables(variable.entries, knownVariable.entries || [])
    };
  });
}

function toContext(variables: ContextVariable[]): EvaluationContext {
  return variables.reduce<EvaluationContext>((context, variable) => {
    context[variable.name] = variable.entries?.length
      ? toContext(variable.entries)
      : null;

    return context;
  }, {});
}