import {
  convertEntitiesToMarkdown,
  hasFormattingEntities,
} from './entity-converter';
import type { MessageEntity } from '../interfaces';

describe('EntityConverter', () => {
  describe('convertEntitiesToMarkdown', () => {
    it('should handle empty entities', () => {
      const text = 'Plain text message';
      const result = convertEntitiesToMarkdown(text, undefined);
      expect(result).toBe(text);
    });

    it('should convert bold entity', () => {
      const text = 'Hello World';
      const entities: MessageEntity[] = [
        { type: 'bold', offset: 0, length: 5 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('**Hello** World');
    });

    it('should convert italic entity', () => {
      const text = 'Hello World';
      const entities: MessageEntity[] = [
        { type: 'italic', offset: 6, length: 5 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('Hello *World*');
    });

    it('should convert code entity', () => {
      const text = 'Use npm install command';
      const entities: MessageEntity[] = [
        { type: 'code', offset: 4, length: 11 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('Use `npm install` command');
    });

    it('should convert text_link entity', () => {
      const text = 'Visit our website';
      const entities: MessageEntity[] = [
        {
          type: 'text_link',
          offset: 10,
          length: 7,
          url: 'https://example.com',
        } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('Visit our [website](https://example.com)');
    });

    it('should handle multiple entities', () => {
      const text = 'Hello World Test';
      const entities: MessageEntity[] = [
        { type: 'bold', offset: 0, length: 5 } as MessageEntity,
        { type: 'italic', offset: 6, length: 5 } as MessageEntity,
        { type: 'code', offset: 12, length: 4 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('**Hello** *World* `Test`');
    });

    it('should handle strikethrough entity', () => {
      const text = 'This is old news';
      const entities: MessageEntity[] = [
        { type: 'strikethrough', offset: 8, length: 3 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('This is ~~old~~ news');
    });

    it('should handle underline entity', () => {
      const text = 'Important text';
      const entities: MessageEntity[] = [
        { type: 'underline', offset: 0, length: 9 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('__Important__ text');
    });

    it('should preserve mentions and hashtags', () => {
      const text = 'Follow @user #tag';
      const entities: MessageEntity[] = [
        { type: 'mention', offset: 7, length: 5 } as MessageEntity,
        { type: 'hashtag', offset: 13, length: 4 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('Follow @user #tag');
    });

    it('should handle pre (code block) entity', () => {
      const text = 'function test() { return true; }';
      const entities: MessageEntity[] = [
        { type: 'pre', offset: 0, length: 32 } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('```\nfunction test() { return true; }\n```');
    });

    it('should handle pre entity with language', () => {
      const text = 'const x = 1;';
      const entities: MessageEntity[] = [
        {
          type: 'pre',
          offset: 0,
          length: 12,
          language: 'javascript',
        } as MessageEntity,
      ];
      const result = convertEntitiesToMarkdown(text, entities);
      expect(result).toBe('```javascript\nconst x = 1;\n```');
    });
  });

  describe('hasFormattingEntities', () => {
    it('should return false for undefined entities', () => {
      expect(hasFormattingEntities(undefined)).toBe(false);
    });

    it('should return false for empty entities array', () => {
      expect(hasFormattingEntities([])).toBe(false);
    });

    it('should return true for bold entity', () => {
      const entities: MessageEntity[] = [
        { type: 'bold', offset: 0, length: 5 } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(true);
    });

    it('should return true for italic entity', () => {
      const entities: MessageEntity[] = [
        { type: 'italic', offset: 0, length: 5 } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(true);
    });

    it('should return true for code entity', () => {
      const entities: MessageEntity[] = [
        { type: 'code', offset: 0, length: 5 } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(true);
    });

    it('should return true for text_link entity', () => {
      const entities: MessageEntity[] = [
        {
          type: 'text_link',
          offset: 0,
          length: 5,
          url: 'https://example.com',
        } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(true);
    });

    it('should return false for non-formatting entities', () => {
      const entities: MessageEntity[] = [
        { type: 'mention', offset: 0, length: 5 } as MessageEntity,
        { type: 'hashtag', offset: 6, length: 4 } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(false);
    });

    it('should return true if at least one formatting entity exists', () => {
      const entities: MessageEntity[] = [
        { type: 'mention', offset: 0, length: 5 } as MessageEntity,
        { type: 'bold', offset: 6, length: 4 } as MessageEntity,
        { type: 'hashtag', offset: 11, length: 4 } as MessageEntity,
      ];
      expect(hasFormattingEntities(entities)).toBe(true);
    });
  });
});
