import { Test, TestingModule } from '@nestjs/testing';
import { TouchpointsService } from './touchpoints.service';

describe('TouchpointsService', () => {
  let service: TouchpointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TouchpointsService],
    }).compile();

    service = module.get<TouchpointsService>(TouchpointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
