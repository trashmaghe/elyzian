import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns status ok when the check succeeds', async () => {
    healthCheckService.check.mockResolvedValue({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });

  it('returns status error when the check throws', async () => {
    healthCheckService.check.mockRejectedValue(
      new Error('database unreachable'),
    );

    const result = await controller.check();

    expect(result.status).toBe('error');
  });
});
