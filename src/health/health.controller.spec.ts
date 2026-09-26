import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let $queryRaw: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    $queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw } }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports ok when the database responds', async () => {
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });

  it('reports degraded when the database throws', async () => {
    $queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).resolves.toEqual({
      status: 'degraded',
      database: 'down',
    });
  });
});
