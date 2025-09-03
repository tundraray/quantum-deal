import { Injectable, Logger } from '@nestjs/common';
import {
  generateObject,
  generateText,
  Output,
  ToolSet,
  stepCountIs,
  RetryError,
  APICallError,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  Tool,
} from '@google/generative-ai';

import { LLMConfigurationService } from './configuration';

// Custom exception for quota exceeded errors
export class QuotaExceededException extends Error {
  constructor(model: string) {
    super(
      `Quota exceeded for ${model}. Please check your API billing or try again later.`,
    );
    this.name = 'QuotaExceededException';
  }
}

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'google';

/**
 * Model configuration interface
 */
export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
}

/**
 * Generate text options
 */
export interface GenerateTextOptions {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Generate object options
 */
export interface GenerateObjectOptions {
  model: string;
  prompt: string;
  schema: any; // Zod schema
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolSet;
  maxRetries?: number;
  maxSteps?: number;
}

/**
 * Grounding search options
 */
export interface GroundingOptions {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  temperature?: number;
  maxTokens?: number;
}

/**
 * Grounding search result
 */
export interface GroundingResult {
  answer: string;
  sources: GroundingSource[];
  prompt: string;
  timestamp: string;
}

/**
 * Grounding source
 */
export interface GroundingSource {
  url: string;
  title?: string;
  snippet?: string;
  index: number;
}

/**
 * Grounding chunk from Gemini metadata
 */
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

/**
 * URL segment for citations
 */
export interface UrlSegment {
  short_url: string;
  value: string;
  segments: Array<{
    startIndex: number;
    endIndex: number;
    text: string;
  }>;
}

/**
 * Citation with segments
 */
export interface Citation {
  url: string;
  segments: UrlSegment[];
}

/**
 * URL shortening map for grounding citations
 */
const urlMap = new Map<string, string>();
let urlCounter = 0;

/**
 * Universal LLM Service using AI SDK from Vercel
 * Supports multiple providers: OpenAI, Google, Anthropic
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private modelConfigs: Map<string, ModelConfig> = new Map();

  constructor(private readonly configService: LLMConfigurationService) {
    this.initializeModels();
  }

  /**
   * Initialize supported models from configuration
   */
  private initializeModels(): void {
    // OpenAI models
    if (this.configService.openaiApiKey) {
      this.registerModel('gpt-4o', {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: this.configService.openaiApiKey,
      });

      this.registerModel('gpt-5-mini', {
        provider: 'openai',
        model: 'gpt-5-mini',
        apiKey: this.configService.openaiApiKey,
      });

      this.registerModel('gpt-5-nano', {
        provider: 'openai',
        model: 'gpt-5-nano',
        apiKey: this.configService.openaiApiKey,
      });

      this.registerModel('gpt-4-turbo', {
        provider: 'openai',
        model: 'gpt-4-turbo',
        apiKey: this.configService.openaiApiKey,
      });
    }

    // Google models
    if (this.configService.geminiApiKey) {
      // RECOMMENDED: Latest stable models
      this.registerModel('gemini-2.5-pro', {
        provider: 'google',
        model: 'gemini-2.5-pro',
        apiKey: this.configService.geminiApiKey,
        // Enhanced thinking and reasoning, state-of-the-art performance
        // Best for: Complex coding, math, science, advanced reasoning
        // Context: 1M tokens, Knowledge cutoff: January 2025
      });

      this.registerModel('gemini-2.5-flash', {
        provider: 'google',
        model: 'gemini-2.5-flash',
        apiKey: this.configService.geminiApiKey,
        // Best price-performance ratio, adaptive thinking
        // Best for: General purpose, balanced tasks, production apps
        // Context: 1M tokens, Knowledge cutoff: January 2025
      });

      this.registerModel('gemini-2.0-flash', {
        provider: 'google',
        model: 'gemini-2.0-flash',
        apiKey: this.configService.geminiApiKey,
        // Next-gen features, speed, realtime streaming
        // Best for: Agentic apps, tool use, production workloads
        // Context: 1M tokens, Knowledge cutoff: August 2024
      });

      this.registerModel('gemini-2.0-flash-lite', {
        provider: 'google',
        model: 'gemini-2.0-flash-lite',
        apiKey: this.configService.geminiApiKey,
        // Cost-efficient, low latency
        // Best for: High volume, cost-sensitive applications
        // Context: 1M tokens, Knowledge cutoff: August 2024
      });
    }

    this.logger.log(`Initialized ${this.modelConfigs.size} LLM models`);
  }

  /**
   * Register a new model configuration
   */
  private registerModel(name: string, config: ModelConfig): void {
    this.modelConfigs.set(name, config);
    this.logger.debug(`Registered model: ${name} (${config.provider})`);
  }

  /**
   * Get model configuration by name
   */
  private getModelConfig(modelName: string): ModelConfig {
    const config = this.modelConfigs.get(modelName);
    if (!config) {
      throw new Error(
        `Model '${modelName}' not found. Available models: ${Array.from(this.modelConfigs.keys()).join(', ')}`,
      );
    }
    return config;
  }

  /**
   * Get AI SDK provider instance
   */
  private getProvider(config: ModelConfig) {
    switch (config.provider) {
      case 'openai':
        return openai;
      case 'google':
        return createGoogleGenerativeAI({
          apiKey: config.apiKey,
        });

      default:
        throw new Error(`Unsupported provider: ${config.provider as string}`);
    }
  }

  /**
   * Generate text using specified model
   */
  async generateText(options: GenerateTextOptions): Promise<string> {
    const config = this.getModelConfig(options.model);

    this.logger.debug(
      `Generating text with ${options.model} (${config.provider})`,
    );

    try {
      const provider = this.getProvider(config);
      const result = await generateText({
        model: provider(options.model),
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature ?? config.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? config.maxTokens,
      });

      return result.text;
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        this.logger.warn(
          `Quota exceeded for ${options.model}. This is expected when using free tier limits.`,
        );
        throw new QuotaExceededException(options.model);
      }
      this.logger.error(`Text generation failed with ${options.model}:`, error);
      throw error;
    }
  }

  async generateObjectWithTools<T>(options: GenerateObjectOptions): Promise<T> {
    const config = this.getModelConfig(options.model);

    this.logger.debug(
      `Generating object with tools using ${options.model} (${config.provider})`,
    );

    try {
      const provider = this.getProvider(config);
      const result = await generateText({
        model: provider(options.model),
        prompt: options.prompt,
        system: options.systemPrompt,
        temperature: options.temperature ?? config.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? config.maxTokens,

        experimental_output: Output.object({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          schema: options.schema,
        }),

        tools: options.tools,
        maxRetries: options.maxRetries ?? config.maxRetries,
        stopWhen: options.maxSteps ? stepCountIs(options.maxSteps) : undefined, // Allow multiple tool calls
      });

      return result.experimental_output as T;
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        this.logger.warn(
          `Quota exceeded for ${options.model}. This is expected when using free tier limits.`,
        );
        throw new QuotaExceededException(options.model);
      }
      this.logger.error(
        `Object generation with tools failed with ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate structured object using specified model
   */
  async generateObject<T>(options: GenerateObjectOptions): Promise<T> {
    const config = this.getModelConfig(options.model);

    const temperature = options.temperature ?? config.temperature ?? 0;

    this.logger.debug(
      `Generating object with ${options.model} (${config.provider})`,
    );

    try {
      const provider = this.getProvider(config);
      const result = await generateObject({
        model: provider(options.model),
        prompt: options.prompt,
        system: options.systemPrompt,
        schema: options.schema,
        temperature,
        maxOutputTokens: options.maxTokens ?? config.maxTokens,
      });

      return result.object as T;
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        this.logger.warn(
          `Quota exceeded for ${options.model}. This is expected when using free tier limits.`,
        );
        throw new QuotaExceededException(options.model);
      }

      this.logger.error(
        `Object generation failed with ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): string[] {
    return Array.from(this.modelConfigs.keys());
  }

  /**
   * Get model information
   */
  getModelInfo(modelName: string): ModelConfig {
    return this.getModelConfig(modelName);
  }

  /**
   * Check if model is available
   */
  isModelAvailable(modelName: string): boolean {
    return this.modelConfigs.has(modelName);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: LLMProvider): string[] {
    return Array.from(this.modelConfigs.entries())
      .filter(([, config]) => config.provider === provider)
      .map(([name]) => name);
  }

  private isQuotaExceeded(error: any): boolean {
    if (error instanceof GoogleGenerativeAIFetchError) {
      return error.status === 429;
    }

    if (RetryError.isInstance(error)) {
      const apiCallError = error.errors.find(
        (e) => APICallError.isInstance(e) && e.statusCode === 429,
      );

      if (apiCallError) {
        return true;
      }
    }

    return APICallError.isInstance(error) && error.statusCode === 429;
  }

  /**
   * Resolve URLs to short URLs for saving tokens and time
   */
  private resolveUrls(groundingChunks: GroundingChunk[]): UrlSegment[] {
    const resolved: UrlSegment[] = [];

    groundingChunks.forEach((chunk) => {
      if (chunk.web?.uri) {
        const originalUrl = chunk.web.uri;
        let shortUrl = urlMap.get(originalUrl);

        if (!shortUrl) {
          shortUrl = `[${urlCounter++}]`;
          urlMap.set(originalUrl, shortUrl);
        }

        resolved.push({
          short_url: shortUrl,
          value: originalUrl,
          segments: [
            {
              startIndex: 0,
              endIndex: originalUrl.length,
              text: chunk.web.title || originalUrl,
            },
          ],
        });
      }
    });

    return resolved;
  }

  /**
   * Get citations from Gemini API response
   */
  private getCitations(response: any, resolvedUrls: UrlSegment[]): Citation[] {
    const citations: Citation[] = [];

    // Group resolved URLs by their original URL
    const urlGroups = new Map<string, UrlSegment[]>();
    resolvedUrls.forEach((urlSegment) => {
      const group = urlGroups.get(urlSegment.value) || [];
      group.push(urlSegment);
      urlGroups.set(urlSegment.value, group);
    });

    // Create citations from grouped URLs
    urlGroups.forEach((segments, url) => {
      citations.push({
        url,
        segments,
      });
    });

    return citations;
  }

  /**
   * Insert citation markers into the text
   */
  private insertCitationMarkers(text: string, citations: Citation[]): string {
    let modifiedText = text;

    citations.forEach((citation) => {
      citation.segments.forEach((segment) => {
        // Simple insertion of citation markers
        if (!modifiedText.includes(segment.short_url)) {
          modifiedText += ` ${segment.short_url}`;
        }
      });
    });

    return modifiedText;
  }

  /**
   * Perform grounded search using native Gemini client with Google Search
   * Provides AI-generated answers backed by real-time web search results
   * Uses native client to access grounding metadata that AI SDK doesn't expose
   */
  async grounding(options: GroundingOptions): Promise<GroundingResult> {
    const modelName = options.model || 'gemini-2.5-flash';
    const config = this.getModelConfig(modelName);

    // Ensure we're using a Google model for grounding
    if (config.provider !== 'google') {
      throw new Error(
        `Grounding is only supported with Google models. Provided model '${modelName}' uses provider '${config.provider}'`,
      );
    }

    this.logger.debug(
      `Performing grounded search with ${modelName} for prompt: "${options.prompt.substring(0, 100)}..."`,
    );

    try {
      // Use native Google Generative AI client to access grounding metadata
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const prompt = options.systemPrompt
        ? `${options.systemPrompt}\n\nUser: ${options.prompt}`
        : options.prompt;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] as unknown as Tool[],
        generationConfig: {
          temperature: options.temperature ?? config.temperature ?? 0.1,
        },
      });

      const response = result.response;
      const answer = response.text();

      // Extract grounding metadata and process like research-agent
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      let resolvedUrls: UrlSegment[] = [];
      let citations: Citation[] = [];

      if (
        groundingMetadata &&
        Array.isArray(groundingMetadata.groundingChunks)
      ) {
        // Resolve the URLs to short URLs for saving tokens and time
        resolvedUrls = this.resolveUrls(groundingMetadata.groundingChunks);

        // Get the citations and add them to the generated text
        citations = this.getCitations(response, resolvedUrls);
      }

      // Convert citations to GroundingSource format
      const sources: GroundingSource[] = citations.flatMap((citation, index) =>
        citation.segments.map((urlSegment, segIndex) => {
          // Extract text from the first segment within the UrlSegment
          const segmentText = urlSegment.segments[0]?.text || urlSegment.value;
          return {
            url: citation.url,
            title: segmentText || 'Untitled',
            snippet: segmentText
              ? segmentText.substring(0, 200) +
                (segmentText.length > 200 ? '...' : '')
              : '',
            index: index * citation.segments.length + segIndex + 1,
          };
        }),
      );

      const groundingResult: GroundingResult = {
        answer: answer || 'No answer generated',
        sources,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(
        `Grounded search completed: ${sources.length} sources found`,
      );

      return groundingResult;
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        this.logger.warn(
          `Quota exceeded for ${modelName}. This is expected when using free tier limits.`,
        );
        throw new QuotaExceededException(modelName);
      }

      this.logger.error(`Grounded search failed:`, error);

      // Fallback: try without grounding
      try {
        this.logger.warn('Attempting fallback without grounding...');
        const fallbackResult = await this.generateText({
          model: modelName,
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        });

        return {
          answer: fallbackResult,
          sources: [],
          prompt: options.prompt,
          timestamp: new Date().toISOString(),
        };
      } catch (fallbackError) {
        this.logger.error('Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }
}
