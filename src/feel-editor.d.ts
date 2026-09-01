// TODO(jarekdanielak): Generate and publish declarations from
// feel-editor's checked JSDoc, then remove this.
declare module '@bpmn-io/feel-editor' {
  import type { FeelDialect } from './core/types';
  import type { FeelLintReport, FeelVariable } from './render/ExpressionEditor';

  interface FeelEditorConfig {
    container: HTMLElement;
    contentAttributes?: Record<string, string>;
    dialect?: FeelDialect;
    extensions?: unknown[];
    onChange?(value: string): void;
    onLint?(reports: FeelLintReport[]): void;
    value?: string;
    variables?: FeelVariable[];
  }

  export default class FeelEditor {
    constructor(config: FeelEditorConfig);
    setValue(value: string): void;
    setVariables(variables: FeelVariable[]): void;
    focus(position?: number): void;
  }
}