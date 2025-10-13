import type { MessageEntity } from '../interfaces';

/**
 * Utility functions for converting Telegram message entities to Markdown format
 * This preserves formatting during translation by using Markdown syntax
 */

/**
 * Convert a message with entities to Markdown format
 *
 * This function converts Telegram message entities (bold, italic, links, etc.)
 * into Markdown syntax that can be translated while preserving formatting.
 *
 * The LLM will preserve Markdown formatting like **bold** and *italic* during translation,
 * and we can send the result using parse_mode: 'Markdown'
 *
 * @param text - The message text
 * @param entities - Array of message entities
 * @returns Markdown-formatted text
 */
export function convertEntitiesToMarkdown(
  text: string,
  entities: MessageEntity[] | undefined,
): string {
  if (!entities || entities.length === 0) {
    return text;
  }

  // Sort entities by offset in reverse order to avoid offset shifts
  const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

  let result = text;

  for (const entity of sortedEntities) {
    const start = entity.offset;
    const end = entity.offset + entity.length;
    const entityText = text.substring(start, end);

    let replacement: string;

    switch (entity.type) {
      case 'bold':
        replacement = `**${entityText}**`;
        break;

      case 'italic':
        replacement = `*${entityText}*`;
        break;

      case 'code':
        replacement = `\`${entityText}\``;
        break;

      case 'pre': {
        // Code block - preserve language if available
        const language = 'language' in entity ? entity.language : undefined;
        replacement = language
          ? `\`\`\`${language}\n${entityText}\n\`\`\``
          : `\`\`\`\n${entityText}\n\`\`\``;
        break;
      }

      case 'text_link': {
        // Link with custom text
        const url = 'url' in entity ? entity.url : '';
        replacement = `[${entityText}](${url})`;
        break;
      }

      case 'url':
        // Plain URL - keep as is or wrap in markdown link
        replacement = entityText;
        break;

      case 'mention':
      case 'hashtag':
      case 'cashtag':
      case 'bot_command':
        // Keep these as-is
        replacement = entityText;
        break;

      case 'text_mention':
        // User mention without username
        replacement = entityText;
        break;

      case 'underline':
        // Markdown doesn't have native underline, use HTML-style or keep as-is
        replacement = `__${entityText}__`;
        break;

      case 'strikethrough':
        replacement = `~~${entityText}~~`;
        break;

      case 'spoiler':
        // Markdown doesn't have spoiler, keep as-is
        replacement = entityText;
        break;

      default:
        replacement = entityText;
    }

    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

/**
 * Check if message has formatting entities
 *
 * @param entities - Array of message entities
 * @returns True if message has formatting entities
 */
export function hasFormattingEntities(
  entities: MessageEntity[] | undefined,
): boolean {
  if (!entities || entities.length === 0) {
    return false;
  }

  const formattingTypes = [
    'bold',
    'italic',
    'code',
    'pre',
    'text_link',
    'underline',
    'strikethrough',
  ];

  return entities.some((entity) => formattingTypes.includes(entity.type));
}
