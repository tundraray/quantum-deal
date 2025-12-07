import { Test, TestingModule } from '@nestjs/testing';
import Bottleneck from 'bottleneck';
import { Telegraf } from 'telegraf';
import { BotRegistryService } from '../bot-registry.service';
import { DynamicTelegrafService, getBotToken } from '@quantumdeal/telegraf';
import type { DynamicBotInstance, BotSettings } from '@quantumdeal/telegraf';
import type { UserContext } from '../../interfaces';
import type { Context } from 'telegraf';

// Get the correct token used by @InjectBot('QuantumDealBot')
const INJECT_BOT_TOKEN = getBotToken('QuantumDealBot');

describe('BotRegistryService', () => {
  let service: BotRegistryService;
  let mockStaticBot: Partial<Telegraf<UserContext>>;
  let mockDynamicTelegrafService: Partial<DynamicTelegrafService>;

  // Helper to create mock DynamicBotInstance
  const createMockDynamicBotInstance = (
    overrides: Partial<DynamicBotInstance> = {},
  ): DynamicBotInstance => ({
    botId: 1,
    name: 'TestBot',
    bot: {
      telegram: { sendMessage: jest.fn() },
    } as unknown as Telegraf<Context>,
    stage: {} as DynamicBotInstance['stage'],
    webhookPath: '/dynamic/test',
    settings: {
      features: {
        trialEnabled: true,
        paymentsEnabled: true,
        signalsEnabled: true,
        broadcastEnabled: true,
        partnerFlowEnabled: false,
      },
      defaults: {
        subscriptionDays: 30,
        trialDays: 7,
        language: 'en',
      },
    },
    username: 'testbot',
    limiter: new Bottleneck({ maxConcurrent: 1 }),
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock static bot
    mockStaticBot = {
      telegram: { sendMessage: jest.fn() },
    } as unknown as Partial<Telegraf<UserContext>>;

    // Create mock DynamicTelegrafService
    mockDynamicTelegrafService = {
      getAllBots: jest.fn().mockReturnValue(new Map()),
      getBotInstance: jest.fn(),
      hasBot: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotRegistryService,
        {
          provide: INJECT_BOT_TOKEN,
          useValue: mockStaticBot,
        },
        {
          provide: DynamicTelegrafService,
          useValue: mockDynamicTelegrafService,
        },
      ],
    }).compile();

    service = module.get<BotRegistryService>(BotRegistryService);

    // Manually call onModuleInit to initialize the limiter
    service.onModuleInit();
  });

  describe('getSignalCapableBots', () => {
    it('AC-008: should include static QuantumDealBot with botId=1 when enabled', () => {
      const bots = service.getSignalCapableBots();

      const staticBot = bots.find((b) => b.type === 'static');
      expect(staticBot).toBeDefined();
      expect(staticBot?.name).toBe('QuantumDealBot');
      expect(staticBot?.botId).toBe(1);
    });

    it('AC-008: should exclude static bot when setStaticBotSignalsEnabled(false)', () => {
      service.setStaticBotSignalsEnabled(false);

      const bots = service.getSignalCapableBots();

      const staticBot = bots.find((b) => b.type === 'static');
      expect(staticBot).toBeUndefined();
    });

    it('AC-001: should include dynamic bots with signalsEnabled=true', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
        settings: {
          features: {
            trialEnabled: true,
            paymentsEnabled: true,
            signalsEnabled: true,
            broadcastEnabled: true,
            partnerFlowEnabled: false,
          },
          defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' },
        },
      });

      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map([[5, dynamicBot]]));

      const bots = service.getSignalCapableBots();

      const foundBot = bots.find((b) => b.botId === 5);
      expect(foundBot).toBeDefined();
      expect(foundBot?.name).toBe('DynamicBot1');
      expect(foundBot?.type).toBe('dynamic');
    });

    it('AC-001: should exclude dynamic bots with signalsEnabled=false', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DisabledBot',
        settings: {
          features: {
            trialEnabled: true,
            paymentsEnabled: true,
            signalsEnabled: false, // Signals disabled
            broadcastEnabled: true,
            partnerFlowEnabled: false,
          },
          defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' },
        },
      });

      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map([[5, dynamicBot]]));

      const bots = service.getSignalCapableBots();

      const foundBot = bots.find((b) => b.botId === 5);
      expect(foundBot).toBeUndefined();
    });

    it('AC-005: should return bots with their own Bottleneck limiter', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
      });

      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map([[5, dynamicBot]]));

      const bots = service.getSignalCapableBots();

      for (const bot of bots) {
        expect(bot.limiter).toBeDefined();
        expect(bot.limiter).toBeInstanceOf(Bottleneck);
      }
    });

    it('should return empty array when no bots have signals enabled', () => {
      service.setStaticBotSignalsEnabled(false);
      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map());

      const bots = service.getSignalCapableBots();

      expect(bots).toHaveLength(0);
    });

    it('should return both static and dynamic bots when both have signals enabled', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
      });

      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map([[5, dynamicBot]]));

      const bots = service.getSignalCapableBots();

      expect(bots.length).toBe(2);
      expect(bots.some((b) => b.type === 'static')).toBe(true);
      expect(bots.some((b) => b.type === 'dynamic')).toBe(true);
    });

    it('should handle dynamic bots with null settings', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'NullSettingsBot',
        settings: null,
      });

      mockDynamicTelegrafService.getAllBots = jest
        .fn()
        .mockReturnValue(new Map([[5, dynamicBot]]));

      const bots = service.getSignalCapableBots();

      // Bot with null settings should NOT be included (no signalsEnabled)
      const foundBot = bots.find((b) => b.botId === 5);
      expect(foundBot).toBeUndefined();
    });
  });

  describe('getBot', () => {
    it('should return static bot when botId is null', () => {
      const bot = service.getBot(null);

      expect(bot).toBeDefined();
      expect(bot?.botId).toBe(1);
      expect(bot?.type).toBe('static');
      expect(bot?.name).toBe('QuantumDealBot');
    });

    it('should return undefined for static bot when disabled', () => {
      service.setStaticBotSignalsEnabled(false);

      const bot = service.getBot(null);

      expect(bot).toBeUndefined();
    });

    it('should return dynamic bot when botId is specified', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
      });

      mockDynamicTelegrafService.getBotInstance = jest
        .fn()
        .mockReturnValue(dynamicBot);

      const bot = service.getBot(5);

      expect(bot).toBeDefined();
      expect(bot?.botId).toBe(5);
      expect(bot?.type).toBe('dynamic');
      expect(bot?.name).toBe('DynamicBot1');
    });

    it('should return undefined for non-existent dynamic bot', () => {
      mockDynamicTelegrafService.getBotInstance = jest
        .fn()
        .mockReturnValue(undefined);

      const bot = service.getBot(999);

      expect(bot).toBeUndefined();
    });

    it('should include settings for dynamic bots', () => {
      const settings: BotSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: true,
          signalsEnabled: true,
          broadcastEnabled: true,
          partnerFlowEnabled: false,
        },
        defaults: {
          subscriptionDays: 30,
          trialDays: 7,
          language: 'en',
        },
      };

      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
        settings,
      });

      mockDynamicTelegrafService.getBotInstance = jest
        .fn()
        .mockReturnValue(dynamicBot);

      const bot = service.getBot(5);

      expect(bot?.settings).toEqual(settings);
    });

    it('should return limiter for static bot', () => {
      const bot = service.getBot(null);

      expect(bot?.limiter).toBeDefined();
      expect(bot?.limiter).toBeInstanceOf(Bottleneck);
    });

    it('should return limiter for dynamic bot', () => {
      const dynamicBot = createMockDynamicBotInstance({
        botId: 5,
        name: 'DynamicBot1',
      });

      mockDynamicTelegrafService.getBotInstance = jest
        .fn()
        .mockReturnValue(dynamicBot);

      const bot = service.getBot(5);

      expect(bot?.limiter).toBeDefined();
      expect(bot?.limiter).toBeInstanceOf(Bottleneck);
    });
  });

  describe('hasBot', () => {
    it('should return true for static bot when enabled', () => {
      expect(service.hasBot(null)).toBe(true);
    });

    it('should return false for static bot when disabled', () => {
      service.setStaticBotSignalsEnabled(false);

      expect(service.hasBot(null)).toBe(false);
    });

    it('should return true for existing dynamic bot', () => {
      mockDynamicTelegrafService.hasBot = jest.fn().mockReturnValue(true);

      expect(service.hasBot(5)).toBe(true);
      expect(mockDynamicTelegrafService.hasBot).toHaveBeenCalledWith(5);
    });

    it('should return false for non-existent dynamic bot', () => {
      mockDynamicTelegrafService.hasBot = jest.fn().mockReturnValue(false);

      expect(service.hasBot(999)).toBe(false);
      expect(mockDynamicTelegrafService.hasBot).toHaveBeenCalledWith(999);
    });
  });

  describe('setStaticBotSignalsEnabled', () => {
    it('should exclude static bot from getSignalCapableBots when disabled', () => {
      service.setStaticBotSignalsEnabled(false);

      const bots = service.getSignalCapableBots();

      expect(bots.find((b) => b.type === 'static')).toBeUndefined();
    });

    it('should include static bot from getSignalCapableBots when re-enabled', () => {
      service.setStaticBotSignalsEnabled(false);
      service.setStaticBotSignalsEnabled(true);

      const bots = service.getSignalCapableBots();

      expect(bots.find((b) => b.type === 'static')).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should initialize static bot limiter', () => {
      // onModuleInit is called in beforeEach
      // Verify by checking getBot(null) returns a valid limiter
      const bot = service.getBot(null);

      expect(bot?.limiter).toBeDefined();
      expect(bot?.limiter).toBeInstanceOf(Bottleneck);
    });
  });
});
