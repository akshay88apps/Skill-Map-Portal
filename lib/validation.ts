import { z } from 'zod';
export const leaderInput = z.object({
  fullName: z.string().min(2).max(120),
  preferredName: z.string().max(80).optional().nullable(),
  email: z.string().email(),
  department: z.string().max(80).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  experienceRaw: z.string().max(40).optional().nullable(),
  leadershipBracketRaw: z.string().max(40).optional().nullable(),
  careerJourneyRaw: z.string().max(8000).optional().nullable(),
  updatedAt: z.string().datetime().optional(),
});
export const projectInput = z.object({
  leaderId: z.string().min(1),
  name: z.string().min(2),
  client: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  durationText: z.string().optional().nullable(),
  durationMonthsEstimate: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(['ACTIVE', 'CLOSED', 'UNKNOWN']).default('UNKNOWN'),
  rawText: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});
export const reviewInput = z.object({
  action: z.enum(['approve', 'reject']),
  payload: z.record(z.unknown()).optional(),
});
export const selfRatingInput = z.object({
  email: z.string().email(),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        proficiency: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(100),
});
