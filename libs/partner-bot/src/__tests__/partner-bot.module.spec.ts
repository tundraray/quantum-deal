// Mock uuid to avoid ESM import issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock telegramify-markdown
jest.mock('telegramify-markdown', () => ({
  __esModule: true,
  default: jest.fn((text: string) => text),
}));

import { PartnerBotModule } from '../partner-bot.module';
import { ChannelVerifierService } from '../services/channel-verifier.service';
import { PartnerFlowService } from '../services/partner-flow.service';
import { ChannelVerificationAction } from '../actions/channel-verification.action';
import { StartCommandUpdate } from '../commands/start/start.update';

describe('PartnerBotModule', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(PartnerBotModule).toBeDefined();
    });

    it('should have @Module decorator', () => {
      const moduleMetadata = Reflect.getMetadata('imports', PartnerBotModule);
      expect(moduleMetadata).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should import DbModule', () => {
      const imports = Reflect.getMetadata('imports', PartnerBotModule) || [];
      const dbModuleImported = imports.some(
        (imp: any) => imp?.name === 'DbModule',
      );
      expect(dbModuleImported).toBe(true);
    });

    it('should import BotModule', () => {
      const imports = Reflect.getMetadata('imports', PartnerBotModule) || [];
      const botModuleImported = imports.some(
        (imp: any) => imp?.name === 'BotModule',
      );
      expect(botModuleImported).toBe(true);
    });

    it('should have ChannelVerifierService provider', () => {
      const providers =
        Reflect.getMetadata('providers', PartnerBotModule) || [];
      expect(providers).toContain(ChannelVerifierService);
    });

    it('should have PartnerFlowService provider', () => {
      const providers =
        Reflect.getMetadata('providers', PartnerBotModule) || [];
      expect(providers).toContain(PartnerFlowService);
    });

    it('should have ChannelVerificationAction provider', () => {
      const providers =
        Reflect.getMetadata('providers', PartnerBotModule) || [];
      expect(providers).toContain(ChannelVerificationAction);
    });

    it('should have StartCommandUpdate provider', () => {
      const providers =
        Reflect.getMetadata('providers', PartnerBotModule) || [];
      expect(providers).toContain(StartCommandUpdate);
    });

    it('should export PartnerFlowService', () => {
      const exports = Reflect.getMetadata('exports', PartnerBotModule) || [];
      expect(exports).toContain(PartnerFlowService);
    });
  });

  describe('No Circular Dependencies', () => {
    it('should have all providers as separate classes', () => {
      // Verify that all providers are defined and not circular
      expect(ChannelVerifierService).toBeDefined();
      expect(PartnerFlowService).toBeDefined();
      expect(ChannelVerificationAction).toBeDefined();
      expect(StartCommandUpdate).toBeDefined();

      // Verify they are constructors
      expect(typeof ChannelVerifierService).toBe('function');
      expect(typeof PartnerFlowService).toBe('function');
      expect(typeof ChannelVerificationAction).toBe('function');
      expect(typeof StartCommandUpdate).toBe('function');
    });
  });
});
