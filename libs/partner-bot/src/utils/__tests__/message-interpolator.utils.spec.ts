import { interpolateVariables } from '../message-interpolator.utils';

describe('interpolateVariables', () => {
  it('should replace single variable', () => {
    const result = interpolateVariables('Hello {name}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should replace multiple variables', () => {
    const result = interpolateVariables('{greeting} {name}!', {
      greeting: 'Hello',
      name: 'World',
    });
    expect(result).toBe('Hello World!');
  });

  it('should handle missing variables (leave as-is)', () => {
    const result = interpolateVariables('Hello {name}!', {});
    expect(result).toBe('Hello {name}!');
  });

  it('should handle empty template', () => {
    const result = interpolateVariables('', { name: 'World' });
    expect(result).toBe('');
  });

  it('should handle template with no variables', () => {
    const result = interpolateVariables('Hello World!', { name: 'Test' });
    expect(result).toBe('Hello World!');
  });
});
