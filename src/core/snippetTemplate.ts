import type { EvaluationContext } from './types';

const INDENT = '  ';
const PLACEHOLDER = 'null';

/**
 * Turn an evaluation context into a CodeMirror snippet template.
 *
 * Every null leaf becomes a numbered tab stop holding the literal text `null`,
 * so the context stays valid JSON while the user tabs through it and fills the
 * values in.
 *
 * Stops are numbered rather than named, as fields sharing a name are edited
 * together.
 */
export function toSnippetTemplate(context: EvaluationContext): string {
  let field = 0;

  const stringify = (value: unknown, indent: string): string => {
    if (value === null) {
      return `\${${++field}:${PLACEHOLDER}}`;
    }

    const childIndent = indent + INDENT;

    if (Array.isArray(value)) {
      if (!value.length) {
        return '[]';
      }

      const items = value.map(item => childIndent + stringify(item, childIndent));

      return `[\n${items.join(',\n')}\n${indent}]`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as EvaluationContext);

      if (!entries.length) {
        return '{}';
      }

      const properties = entries.map(([ key, entry ]) => {
        return `${childIndent}${escape(JSON.stringify(key))}: ${stringify(entry, childIndent)}`;
      });

      return `{\n${properties.join(',\n')}\n${indent}}`;
    }

    return escape(JSON.stringify(value));
  };

  return `${stringify(context, '')}\${0}`;
}


// helpers //////////

/**
 * Keep literal text from being read as a snippet placeholder.
 */
function escape(text: string): string {
  return text.replace(/([$#])\{/g, '$1\\{');
}
