import { Test, TestingModule } from '@nestjs/testing';
import { TouchpointsController } from './touchpoints.controller';

describe('TouchpointsController', () => {
  let controller: TouchpointsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TouchpointsController],
    }).compile();

    controller = module.get<TouchpointsController>(TouchpointsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
