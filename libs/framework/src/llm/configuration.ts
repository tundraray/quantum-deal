import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuration service for the educational content agent using NestJS ConfigService
 * Provides type-safe configuration management with validation for multiple AI providers
 */
@Injectable()
export class LLMConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Gets Gemini API key
   */
  get geminiApiKey(): string | undefined {
    // Support both GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY for AI SDK compatibility
    return this.configService.get<string>('GEMINI_API_KEY');
  }

  /**
   * Gets OpenAI API key
   */
  get openaiApiKey(): string | undefined {
    return this.configService.get<string>('OPENAI_API_KEY');
  }

  /**
   * Gets Anthropic API key
   */
  get anthropicApiKey(): string | undefined {
    return this.configService.get<string>('ANTHROPIC_API_KEY');
  }

  /**
   * Gets LLM service configuration
   */
  get llmConfig() {
    return {
      openaiApiKey: this.openaiApiKey,
      geminiApiKey: this.geminiApiKey,
      anthropicApiKey: this.anthropicApiKey,
    };
  }

  /**
   * Validates that required configuration is present
   */
  validateConfiguration(): void {
    const geminiKey = this.geminiApiKey;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is required but not set');
    }

    // Log available providers (without exposing keys)
    const providers: string[] = [];
    if (this.geminiApiKey) providers.push('Google');
    if (this.openaiApiKey) providers.push('OpenAI');
    if (this.anthropicApiKey) providers.push('Anthropic');

    console.log(`Available AI providers: ${providers.join(', ')}`);
  }

  /**
   * Gets the configuration as a plain object
   */
  toObject(): Record<string, any> {
    return {
      // Hide API keys in logs
      geminiApiKey: this.geminiApiKey ? '***' : '',
      openaiApiKey: this.openaiApiKey ? '***' : '',
      anthropicApiKey: this.anthropicApiKey ? '***' : '',
    };
  }
}
