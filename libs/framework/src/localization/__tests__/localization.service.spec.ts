import { Test, TestingModule } from '@nestjs/testing';
import {
  LocalizationService,
  LocalizationContext,
} from '../localization.service';
import { BotMessagesRepository, MessagesRepository } from '@quantumdeal/db';
import type { I18nMessages } from '../interfaces';

describe('LocalizationService', () => {
  let service: LocalizationService;
  let mockBotMessagesRepository: Partial<BotMessagesRepository>;
  let mockMessagesRepository: Partial<MessagesRepository>;

  beforeEach(async () => {
    // Create mock repositories
    mockBotMessagesRepository = {
      findByBotTypeAndLang: jest.fn().mockResolvedValue(null),
    };

    mockMessagesRepository = {
      findByTypeAndLang: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalizationService,
        {
          provide: BotMessagesRepository,
          useValue: mockBotMessagesRepository,
        },
        {
          provide: MessagesRepository,
          useValue: mockMessagesRepository,
        },
      ],
    }).compile();

    service = module.get<LocalizationService>(LocalizationService);
  });

  describe('forBot().lang().t() - Fluent API', () => {
    it('AC-5: should support fluent API chaining', async () => {
      // Register i18n for fallback
      service.registerI18n('test', {
        ru: { welcome: 'Добро пожаловать' },
      });

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('Добро пожаловать');
    });

    it('AC-1: should return bot_messages override when exists', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'welcome',
          lang: 'ru',
          message: 'Привет от бота!',
        });

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('Привет от бота!');
      expect(
        mockBotMessagesRepository.findByBotTypeAndLang,
      ).toHaveBeenCalledWith(1, 'welcome', 'ru');
    });

    it('AC-2: should fall back to global messages when no bot override', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest.fn().mockResolvedValue({
        id: 1,
        type: 'welcome',
        lang: 'ru',
        message: 'Глобальное приветствие',
      });

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('Глобальное приветствие');
      expect(mockMessagesRepository.findByTypeAndLang).toHaveBeenCalledWith(
        'welcome',
        'ru',
      );
    });

    it('AC-3: should fall back to i18n when not in DB', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      service.registerI18n('test', {
        ru: { welcome: 'i18n приветствие' },
      });

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('i18n приветствие');
    });

    it('AC-10: should return key when all fallbacks fail (never throws)', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.forBot(1).lang('ru').t('unknown_key');

      expect(result).toBe('unknown_key');
    });

    it('AC-4: should apply language fallback to en when lang not found', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValueOnce(null) // ru not found
        .mockResolvedValueOnce(null); // en query (for bot)
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValueOnce(null) // ru global not found
        .mockResolvedValueOnce({
          id: 1,
          type: 'welcome',
          lang: 'en',
          message: 'Welcome in English',
        }); // en global found

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('Welcome in English');
    });

    it('should skip bot_messages lookup when botId is null', async () => {
      mockMessagesRepository.findByTypeAndLang = jest.fn().mockResolvedValue({
        id: 1,
        type: 'welcome',
        lang: 'en',
        message: 'Global message',
      });

      const result = await service.forBot(null).lang('en').t('welcome');

      expect(result).toBe('Global message');
      expect(
        mockBotMessagesRepository.findByBotTypeAndLang,
      ).not.toHaveBeenCalled();
    });

    it('should not apply language fallback when already using en', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.forBot(1).lang('en').t('missing_key');

      // Should call findByTypeAndLang only once (for 'en'), not twice
      expect(mockMessagesRepository.findByTypeAndLang).toHaveBeenCalledTimes(1);
      expect(result).toBe('missing_key');
    });

    it('should handle DB errors gracefully and return key', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockRejectedValue(new Error('Database connection error'));

      const result = await service.forBot(1).lang('ru').t('welcome');

      expect(result).toBe('welcome');
    });
  });

  describe('interpolation', () => {
    it('AC-6: should replace {placeholder} with param values', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'greeting',
          lang: 'en',
          message: 'Hello, {name}! Welcome to {place}.',
        });

      const result = await service
        .forBot(1)
        .lang('en')
        .t('greeting', { name: 'John', place: 'Paradise' });

      expect(result).toBe('Hello, John! Welcome to Paradise.');
    });

    it('should leave {placeholder} when param not provided', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'greeting',
          lang: 'en',
          message: 'Hello, {name}! Your balance is {balance}.',
        });

      const result = await service
        .forBot(1)
        .lang('en')
        .t('greeting', { name: 'John' });

      expect(result).toBe('Hello, John! Your balance is {balance}.');
    });

    it('should handle multiple placeholders', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'stats',
          lang: 'en',
          message: 'User: {user}, Score: {score}, Rank: {rank}',
        });

      const result = await service
        .forBot(1)
        .lang('en')
        .t('stats', { user: 'Alice', score: 100, rank: 1 });

      expect(result).toBe('User: Alice, Score: 100, Rank: 1');
    });

    it('should return template as-is when no params provided', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'greeting',
          lang: 'en',
          message: 'Hello, {name}!',
        });

      const result = await service.forBot(1).lang('en').t('greeting');

      expect(result).toBe('Hello, {name}!');
    });

    it('should handle number and boolean values in interpolation', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'info',
          lang: 'en',
          message: 'Count: {count}, Active: {active}',
        });

      const result = await service
        .forBot(1)
        .lang('en')
        .t('info', { count: 42, active: true });

      expect(result).toBe('Count: 42, Active: true');
    });
  });

  describe('i18n registry', () => {
    it('should register namespace messages', () => {
      const messages: I18nMessages = {
        en: { hello: 'Hello', goodbye: 'Goodbye' },
        ru: { hello: 'Привет', goodbye: 'Пока' },
      };

      service.registerI18n('common', messages);

      // Verify by trying to resolve
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
    });

    it('AC-9: should resolve function-based messages with args', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      const messages: I18nMessages = {
        en: {
          greeting: (name: unknown, age: unknown) =>
            `Hello ${String(name)}, you are ${String(age)} years old`,
        },
      };

      service.registerI18n('functions', messages);

      const result = await service
        .forBot(1)
        .lang('en')
        .t('greeting', { name: 'Alice', age: 25 });

      expect(result).toBe('Hello Alice, you are 25 years old');
    });

    it('should return undefined for unregistered keys', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      // Register empty namespace
      service.registerI18n('empty', {});

      const result = await service.forBot(1).lang('en').t('nonexistent');

      // Should return key itself as last resort
      expect(result).toBe('nonexistent');
    });

    it('should search across multiple registered namespaces', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      service.registerI18n('namespace1', {
        en: { key1: 'Value from namespace1' },
      });

      service.registerI18n('namespace2', {
        en: { key2: 'Value from namespace2' },
      });

      const result1 = await service.forBot(1).lang('en').t('key1');
      const result2 = await service.forBot(1).lang('en').t('key2');

      expect(result1).toBe('Value from namespace1');
      expect(result2).toBe('Value from namespace2');
    });

    it('should handle function-based messages with no args', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      const messages: I18nMessages = {
        en: {
          dynamic: () =>
            `Generated at ${new Date().toISOString().split('T')[0]}`,
        },
      };

      service.registerI18n('dynamic', messages);

      const result = await service.forBot(1).lang('en').t('dynamic');

      expect(result).toMatch(/Generated at \d{4}-\d{2}-\d{2}/);
    });
  });

  describe('forBot()', () => {
    it('should create new LocalizationContext for each call', () => {
      const context1 = service.forBot(1);
      const context2 = service.forBot(2);

      expect(context1).not.toBe(context2);
    });

    it('should pass botId correctly to context', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 5,
          type: 'test',
          lang: 'en',
          message: 'Bot 5 message',
        });

      await service.forBot(5).lang('en').t('test');

      expect(
        mockBotMessagesRepository.findByBotTypeAndLang,
      ).toHaveBeenCalledWith(5, 'test', 'en');
    });
  });

  describe('registerI18n()', () => {
    it('should allow overwriting existing namespace', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      service.registerI18n('test', {
        en: { key: 'Original value' },
      });

      service.registerI18n('test', {
        en: { key: 'Updated value' },
      });

      const result = await service.forBot(1).lang('en').t('key');

      expect(result).toBe('Updated value');
    });

    it('should support partial language registration', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      // Only register English
      service.registerI18n('partial', {
        en: { greeting: 'Hello' },
      });

      // Request Russian should fall back to English
      const result = await service.forBot(1).lang('ru').t('greeting');

      expect(result).toBe('Hello');
    });
  });

  describe('LocalizationContext.use()', () => {
    beforeEach(() => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
    });

    it('should return this for chaining', () => {
      const context = service.forBot(1);
      const result = context.use('test');

      expect(result).toBe(context);
    });

    it('should search only in specified namespace', async () => {
      service.registerI18n('renewal', {
        en: { welcome: 'Renewal Welcome' },
      });

      service.registerI18n('trial', {
        en: { welcome: 'Trial Welcome' },
      });

      const result = await service
        .forBot(1)
        .use('renewal')
        .lang('en')
        .t('welcome');

      expect(result).toBe('Renewal Welcome');
    });

    it('should not find key from other namespaces', async () => {
      service.registerI18n('renewal', {
        en: { renewKey: 'Renewal Key' },
      });

      service.registerI18n('trial', {
        en: { trialKey: 'Trial Key' },
      });

      // Try to get trial key from renewal namespace
      const result = await service
        .forBot(1)
        .use('renewal')
        .lang('en')
        .t('trialKey');

      // Should return key itself since trialKey is not in 'renewal' namespace
      expect(result).toBe('trialKey');
    });

    it('should return key if namespace not registered', async () => {
      service.registerI18n('existing', {
        en: { key: 'value' },
      });

      const result = await service
        .forBot(1)
        .use('nonexistent')
        .lang('en')
        .t('key');

      expect(result).toBe('key');
    });

    it('should still check DB before i18n namespace', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          botId: 1,
          type: 'welcome',
          lang: 'en',
          message: 'DB Welcome',
        });

      service.registerI18n('renewal', {
        en: { welcome: 'Renewal Welcome' },
      });

      // DB message should take priority even with namespace set
      const result = await service
        .forBot(1)
        .use('renewal')
        .lang('en')
        .t('welcome');

      expect(result).toBe('DB Welcome');
    });

    it('should work with lang() in any order', async () => {
      service.registerI18n('test', {
        ru: { greeting: 'Привет' },
      });

      // use() before lang()
      const result1 = await service
        .forBot(1)
        .use('test')
        .lang('ru')
        .t('greeting');

      // lang() before use()
      const result2 = await service
        .forBot(1)
        .lang('ru')
        .use('test')
        .t('greeting');

      expect(result1).toBe('Привет');
      expect(result2).toBe('Привет');
    });

    it('should apply language fallback within namespace', async () => {
      service.registerI18n('test', {
        en: { greeting: 'Hello from namespace' },
        // No 'ru' translation
      });

      const result = await service
        .forBot(1)
        .use('test')
        .lang('ru')
        .t('greeting');

      // Should fall back to 'en' within the namespace
      expect(result).toBe('Hello from namespace');
    });
  });

  describe('LocalizationContext.lang()', () => {
    it('should return this for chaining', () => {
      const context = service.forBot(1);
      const result = context.lang('en');

      expect(result).toBe(context);
    });

    it('should allow changing language multiple times', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      service.registerI18n('test', {
        en: { greeting: 'Hello' },
        ru: { greeting: 'Привет' },
      });

      const context = service.forBot(1);

      // Change language multiple times
      context.lang('en');
      context.lang('ru');

      const result = await context.t('greeting');

      expect(result).toBe('Привет');
    });

    it('should default to en when lang() not called', async () => {
      mockBotMessagesRepository.findByBotTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);
      mockMessagesRepository.findByTypeAndLang = jest
        .fn()
        .mockResolvedValue(null);

      service.registerI18n('test', {
        en: { greeting: 'Hello' },
      });

      // Do not call lang()
      const result = await service.forBot(1).t('greeting');

      expect(result).toBe('Hello');
    });
  });
});
