import { z } from 'zod';

export const stepCodeSchema = z.enum(['BASE', 'STEP_1', 'STEP_2', 'STEP_3', 'STEP_4']);
export type StepCode = z.infer<typeof stepCodeSchema>;

export const systemRoleSchema = z.enum(['USER', 'MANAGER', 'ADMIN']);
export type SystemRole = z.infer<typeof systemRoleSchema>;
