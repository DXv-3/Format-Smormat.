import { describe, it, expect } from 'vitest';
import { buildTransformPrompt, buildMetadataPrompt } from './index';

describe('Prompt Builders', () => {
  it('builds a transform prompt for custom instructions', () => {
    const payload = buildTransformPrompt('ai_custom', 'Translate to French', 'doc.txt', 'Hello world');
    
    expect(payload.contents[0].parts[0].text).toContain('Translate to French');
    expect(payload.contents[0].parts[0].text).toContain('Hello world');
    expect(payload.generationConfig.maxOutputTokens).toBe(8192);
  });

  it('builds a metadata prompt correctly', () => {
    const payload = buildMetadataPrompt('invoice.pdf', 'Total: $100');
    
    expect(payload.contents[0].parts[0].text).toContain('invoice.pdf');
    expect(payload.contents[0].parts[0].text).toContain('Total: $100');
    expect(payload.generationConfig.responseMimeType).toBe('application/json');
    expect(payload.generationConfig.responseSchema).toBeDefined();
  });
});
