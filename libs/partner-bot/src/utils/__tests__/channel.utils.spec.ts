import { resolveChannelInfo } from '../channel.utils';

describe('channel.utils', () => {
  describe('resolveChannelInfo', () => {
    it('should handle channel username with @ prefix', () => {
      const result = resolveChannelInfo('@mychannel');

      expect(result).toEqual({
        name: 'mychannel',
        url: 'https://t.me/mychannel',
      });
    });

    it('should handle numeric channel ID', () => {
      const result = resolveChannelInfo('123456789');

      expect(result).toEqual({
        name: '123456789',
        url: 'https://t.me/123456789',
      });
    });

    it('should use custom name when provided', () => {
      const result = resolveChannelInfo('@mychannel', 'My Custom Channel');

      expect(result).toEqual({
        name: 'My Custom Channel',
        url: 'https://t.me/mychannel',
      });
    });

    it('should use custom name even for numeric channel ID', () => {
      const result = resolveChannelInfo('123456789', 'Private Channel');

      expect(result).toEqual({
        name: 'Private Channel',
        url: 'https://t.me/123456789',
      });
    });

    it('should ignore custom name if undefined', () => {
      const result = resolveChannelInfo('@testchannel', undefined);

      expect(result).toEqual({
        name: 'testchannel',
        url: 'https://t.me/testchannel',
      });
    });
  });
});
