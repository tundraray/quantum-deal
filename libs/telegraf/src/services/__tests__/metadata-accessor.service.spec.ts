// MetadataAccessorService Unit Tests - ForBot and RequiresFeature metadata
// Test Type: Unit Tests
// Purpose: Test metadata extraction for @ForBot and @RequiresFeature decorators

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { MetadataAccessorService } from '../metadata-accessor.service';
import { ForBot, RequiresFeature } from '../../decorators';

describe('MetadataAccessorService', () => {
  let metadataAccessor: MetadataAccessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetadataAccessorService, Reflector],
    }).compile();

    metadataAccessor = module.get<MetadataAccessorService>(
      MetadataAccessorService,
    );
  });

  describe('Bot Target Filtering (@ForBot)', () => {
    it('extracts bot target ID from @ForBot decorator metadata', () => {
      // Arrange
      @ForBot(5)
      class TargetedHandler {}

      // Act
      const botId = metadataAccessor.getBotTargetMetadata(TargetedHandler);

      // Assert
      expect(botId).toBe(5);
    });

    it('returns undefined when no @ForBot decorator', () => {
      // Arrange
      class SharedHandler {}

      // Act
      const botId = metadataAccessor.getBotTargetMetadata(SharedHandler);

      // Assert
      expect(botId).toBeUndefined();
    });

    it('handles null target gracefully', () => {
      // Act
      const botId = metadataAccessor.getBotTargetMetadata(
        null as unknown as Function,
      );

      // Assert
      expect(botId).toBeUndefined();
    });

    it('handles undefined target gracefully', () => {
      // Act
      const botId = metadataAccessor.getBotTargetMetadata(
        undefined as unknown as Function,
      );

      // Assert
      expect(botId).toBeUndefined();
    });
  });

  describe('Feature Flag Filtering (@RequiresFeature)', () => {
    it('extracts feature key from @RequiresFeature decorator metadata', () => {
      // Arrange
      @RequiresFeature('paymentsEnabled')
      class FeatureHandler {}

      // Act
      const featureKey =
        metadataAccessor.getFeatureFlagMetadata(FeatureHandler);

      // Assert
      expect(featureKey).toBe('paymentsEnabled');
    });

    it('returns undefined when no @RequiresFeature decorator', () => {
      // Arrange
      class AlwaysHandler {}

      // Act
      const featureKey = metadataAccessor.getFeatureFlagMetadata(AlwaysHandler);

      // Assert
      expect(featureKey).toBeUndefined();
    });

    it('handles null target gracefully', () => {
      // Act
      const featureKey = metadataAccessor.getFeatureFlagMetadata(
        null as unknown as Function,
      );

      // Assert
      expect(featureKey).toBeUndefined();
    });

    it('handles undefined target gracefully', () => {
      // Act
      const featureKey = metadataAccessor.getFeatureFlagMetadata(
        undefined as unknown as Function,
      );

      // Assert
      expect(featureKey).toBeUndefined();
    });
  });
});
