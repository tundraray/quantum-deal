import { Test, TestingModule } from '@nestjs/testing';
import { MasterbotService } from './masterbot.service';

describe('MasterbotService', () => {
  let service: MasterbotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasterbotService],
    }).compile();

    service = module.get<MasterbotService>(MasterbotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
