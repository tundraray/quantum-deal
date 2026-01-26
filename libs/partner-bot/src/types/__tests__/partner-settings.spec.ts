import type {
  PartnerSettings,
  VerificationState,
  PartnerBotUserState,
  VerificationResult,
  ReminderStats,
} from '../partner-settings';

describe('PartnerSettings type definitions', () => {
  describe('VerificationState type', () => {
    it('should accept valid verification state values', () => {
      const states: VerificationState[] = [
        'awaiting_channel_subscription',
        'channel_verified',
        'trial_activated',
        'trial_expired',
      ];

      states.forEach((state) => {
        expect(typeof state).toBe('string');
      });
    });

    it('should be a string literal union type', () => {
      const state: VerificationState = 'awaiting_channel_subscription';
      expect(state).toBe('awaiting_channel_subscription');
    });
  });

  describe('PartnerSettings interface', () => {
    it('should have optional channelId field', () => {
      const settings: PartnerSettings = {
        features: {
          trialEnabled: false,
          paymentsEnabled: false,
          signalsEnabled: false,
          broadcastEnabled: false,
        },
        defaults: {
          subscriptionDays: 30,
          trialDays: 7,
          language: 'en',
        },
        channelId: '@testchannel',
      };

      expect(settings.channelId).toBe('@testchannel');
    });

    it('should extend base BotSettings interface', () => {
      const settings: PartnerSettings = {
        features: {
          trialEnabled: true,
          paymentsEnabled: true,
          signalsEnabled: false,
          broadcastEnabled: false,
        },
        defaults: {
          subscriptionDays: 30,
          trialDays: 7,
          language: 'en',
        },
        channelName: 'Test Channel',
        referralUrl: 'https://example.com/ref',
      };

      expect(settings).toHaveProperty('features');
      expect(settings).toHaveProperty('defaults');
    });
  });

  describe('PartnerBotUserState interface', () => {
    it('should have verification state field', () => {
      const userState: PartnerBotUserState = {
        verificationState: 'awaiting_channel_subscription',
        verificationAttempts: 0,
      };

      expect(userState.verificationState).toBe('awaiting_channel_subscription');
    });

    it('should track verification attempts', () => {
      const userState: PartnerBotUserState = {
        verificationState: 'channel_verified',
        verificationAttempts: 3,
      };

      expect(userState.verificationAttempts).toBe(3);
    });

    it('should support optional lastVerificationAttempt field', () => {
      const userState: PartnerBotUserState = {
        verificationState: 'trial_activated',
        verificationAttempts: 1,
        lastVerificationAttempt: new Date('2024-01-01'),
      };

      expect(userState.lastVerificationAttempt).toBeInstanceOf(Date);
    });

    it('should support optional trialActivatedAt field', () => {
      const userState: PartnerBotUserState = {
        verificationState: 'trial_activated',
        verificationAttempts: 1,
        trialActivatedAt: new Date('2024-01-01'),
      };

      expect(userState.trialActivatedAt).toBeInstanceOf(Date);
    });

    it('should support optional trialExpiresAt field', () => {
      const userState: PartnerBotUserState = {
        verificationState: 'trial_activated',
        verificationAttempts: 1,
        trialExpiresAt: new Date('2024-01-08'),
      };

      expect(userState.trialExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('VerificationResult interface', () => {
    it('should return verified true when verification succeeds', () => {
      const result: VerificationResult = {
        verified: true,
      };

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return verified false with error when verification fails', () => {
      const result: VerificationResult = {
        verified: false,
        error: 'User is not subscribed to the channel',
      };

      expect(result.verified).toBe(false);
      expect(result.error).toBe('User is not subscribed to the channel');
    });

    it('should support optional error field', () => {
      const successResult: VerificationResult = {
        verified: true,
      };
      const failureResult: VerificationResult = {
        verified: false,
        error: 'Verification failed',
      };

      expect(successResult.error).toBeUndefined();
      expect(failureResult.error).toBeDefined();
    });
  });

  describe('ReminderStats interface', () => {
    it('should track sent reminders count', () => {
      const stats: ReminderStats = {
        sent: 5,
        skipped: 2,
        failed: 1,
      };

      expect(stats.sent).toBe(5);
    });

    it('should track skipped reminders count', () => {
      const stats: ReminderStats = {
        sent: 0,
        skipped: 3,
        failed: 0,
      };

      expect(stats.skipped).toBe(3);
    });

    it('should track failed reminders count', () => {
      const stats: ReminderStats = {
        sent: 10,
        skipped: 0,
        failed: 2,
      };

      expect(stats.failed).toBe(2);
    });

    it('should initialize with zero values', () => {
      const stats: ReminderStats = {
        sent: 0,
        skipped: 0,
        failed: 0,
      };

      expect(stats.sent).toBe(0);
      expect(stats.skipped).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });
});
