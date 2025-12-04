/**
 * Message Interpolation Utility
 *
 * Provides functions for replacing variables in message templates.
 * Variables use the format {variableName}.
 */

/**
 * Replaces variables in a template string with provided values.
 * Variables are in the format {variableName}.
 *
 * @param template - Template string with {variable} placeholders
 * @param variables - Object with variable names and their values
 * @returns String with variables replaced; unmatched variables remain as-is
 *
 * @example
 * ```typescript
 * interpolateVariables('Hello {name}!', { name: 'World' })
 * // Returns: 'Hello World!'
 *
 * interpolateVariables('{greeting} {name}!', { greeting: 'Hi', name: 'User' })
 * // Returns: 'Hi User!'
 *
 * interpolateVariables('Hello {name}!', {})
 * // Returns: 'Hello {name}!' (missing variables preserved)
 * ```
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}
