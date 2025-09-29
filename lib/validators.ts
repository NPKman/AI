import { z } from 'zod';

export const stationSearchSchema = z.object({
  q: z.string().trim().optional(),
  province: z.string().trim().optional(),
  status: z.enum(['ONLINE', 'OFFLINE']).optional(),
  stationType: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10)
});

export const dashboardFilterSchema = z.object({
  period: z.enum(['24h', '7d', '30d']).default('24h'),
  province: z.string().trim().optional(),
  stationType: z.string().trim().optional()
});

export const firmwareSchema = z.object({
  firmwareKey: z.string().min(1)
});

export const commandSchema = z.object({
  ip: z.string().min(1, 'กรุณาระบุ IP'),
  action: z.enum(['update_firmware', 'custom_config', 'soft_reset']),
  payload: z.unknown()
});
