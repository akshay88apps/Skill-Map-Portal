import { z } from 'zod';
import { departmentOptions } from '@/lib/departments';
import { isTaxonomyName } from '@/lib/taxonomy';
import { isExperienceDuration } from '@/lib/experience';
import { careerTimeframeOptions } from '@/lib/career-aspiration';

const taxonomySelection = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(isTaxonomyName, 'Selection is not in the HR taxonomy');
const otherTerm = z.string().trim().min(2).max(100);
const departmentSelection = z.enum(departmentOptions);
const optionalDepartmentSelection = z.preprocess(
  (value) => (value === '' ? undefined : value),
  departmentSelection.optional(),
);
const careerTimeframeSelection = z.enum(
  careerTimeframeOptions.map((option) => option.value) as [
    (typeof careerTimeframeOptions)[number]['value'],
    ...(typeof careerTimeframeOptions)[number]['value'][],
  ],
);
const aspirationSkillsInput = z
  .array(
    z.object({
      name: taxonomySelection,
      targetProficiency: z.number().int().min(1).max(5),
    }),
  )
  .min(1)
  .max(50)
  .refine(
    (skills) => new Set(skills.map((skill) => skill.name)).size === skills.length,
    'Target skills must be unique',
  );
export const careerAspirationInput = z
  .object({
    targetCapability: optionalDepartmentSelection,
    targetRole: z.string().trim().min(1).max(60),
    targetSkills: aspirationSkillsInput,
    targetTimeframe: careerTimeframeSelection,
    secondaryCapability: optionalDepartmentSelection,
    notes: z.string().trim().max(300).optional(),
  })
  .refine(
    (aspiration) =>
      !aspiration.targetCapability ||
      !aspiration.secondaryCapability ||
      aspiration.targetCapability !== aspiration.secondaryCapability,
    {
      message: 'Secondary capability must differ from target capability',
      path: ['secondaryCapability'],
    },
  );
export const leaderInput = z.object({
  fullName: z.string().min(2).max(120),
  preferredName: z.string().max(80).optional().nullable(),
  email: z.string().email(),
  department: z.string().max(80).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  experienceRaw: z.string().max(40).optional().nullable(),
  leadershipBracketRaw: z.string().max(40).optional().nullable(),
  updatedAt: z.string().datetime().optional(),
});
export const projectInput = z.object({
  leaderId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().max(10000).optional().nullable(),
  techStack: z.array(taxonomySelection).max(100).default([]),
  client: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  durationText: z.string().optional().nullable(),
  durationMonthsEstimate: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(['ACTIVE', 'CLOSED', 'UNKNOWN']).default('UNKNOWN'),
  rawText: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});
const profileProjectInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  techStack: z.array(taxonomySelection).min(1).max(100),
});
const profileCertificationInput = z.object({
  clientId: z.string().trim().min(1).max(100),
  id: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(200),
  attachmentFileName: z.string().trim().max(255).optional(),
  attachmentContentType: z.string().trim().max(100).optional(),
  attachmentSize: z.number().int().nonnegative().optional(),
  hasAttachment: z.boolean().optional(),
});
export const reviewInput = z.object({
  action: z.enum(['approve', 'reject']),
  payload: z.record(z.unknown()).optional(),
});
export const selfRatingInput = z.object({
  skills: z
    .array(
      z.object({
        name: taxonomySelection,
        proficiency: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(100),
});
export const profileInput = z.object({
  fullName: z.string().min(2).max(120),
  preferredName: z.string().max(80).optional(),
  department: optionalDepartmentSelection,
  jobTitle: z.string().max(100).optional(),
  experience: z
    .string()
    .max(40)
    .refine(isExperienceDuration, 'Select total relevant experience'),
  leadership: z.string().max(40).optional(),
  projects: z.array(profileProjectInput).max(50).default([]),
  tools: z.array(taxonomySelection).max(100).optional(),
  otherTools: z.array(otherTerm).max(20).optional(),
  certifications: z.array(profileCertificationInput).max(30).default([]),
  careerAspiration: careerAspirationInput,
  ratedSkills: z
    .array(
      z.object({
        name: taxonomySelection,
        proficiency: z.number().int().min(1).max(5),
      }),
    )
    .max(100),
  otherSkills: z
    .array(
      z.object({
        name: otherTerm,
        proficiency: z.number().int().min(1).max(5),
      }),
    )
    .max(20)
    .optional(),
});
export const profileDraftInput = profileInput.partial().extend({
  careerAspiration: z
    .object({
      targetCapability: z.string().max(100).optional(),
      targetRole: z.string().max(60).optional(),
      targetSkills: z
        .array(
          z.object({
            name: z.string().max(100),
            targetProficiency: z.number().int().min(1).max(5),
          }),
        )
        .max(50)
        .optional(),
      targetTimeframe: z.string().max(40).optional(),
      secondaryCapability: z.string().max(100).optional(),
      notes: z.string().max(300).optional(),
    })
    .optional(),
  ratedSkills: z
    .array(
      z.object({
        name: z.string().max(100),
        proficiency: z.number().int().min(1).max(5),
        otherName: z.string().max(100).optional(),
      }),
    )
    .max(100)
    .optional(),
  tools: z.array(z.string().max(100)).max(100).optional(),
  otherTools: z.array(z.string().max(100)).max(20).optional(),
  projects: z
    .array(
      z.object({
        name: z.string().max(200),
        description: z.string().max(10000),
        techStack: z.array(z.string().max(100)).max(100),
      }),
    )
    .max(50)
    .optional(),
  certifications: z
    .array(
      z.object({
        clientId: z.string().max(100),
        id: z.string().max(100).optional(),
        name: z.string().max(200),
        attachmentFileName: z.string().max(255).optional(),
        attachmentContentType: z.string().max(100).optional(),
        attachmentSize: z.number().int().nonnegative().optional(),
        hasAttachment: z.boolean().optional(),
      }),
    )
    .max(30)
    .optional(),
});
