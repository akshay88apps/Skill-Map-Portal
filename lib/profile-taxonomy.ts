import type { Prisma } from '@prisma/client';

export type TaxonomyReviewRequest = {
  entityType: 'skill' | 'tool';
  confidence: number;
  payload: Prisma.InputJsonObject;
};

export function otherTaxonomyReviewRequests(
  leaderId: string,
  otherSkills: Array<{ name: string; proficiency: number }> = [],
  otherTools: string[] = [],
): TaxonomyReviewRequest[] {
  return [
    ...otherSkills.map((requested) => ({
      entityType: 'skill' as const,
      confidence: 0,
      payload: {
        leaderId,
        rawText: requested.name,
        requestedName: requested.name,
        proficiency: requested.proficiency,
        ratingSource: 'self_rated',
        source: 'user_other',
        needsReview: true,
      },
    })),
    ...otherTools.map((requestedName) => ({
      entityType: 'tool' as const,
      confidence: 0,
      payload: {
        leaderId,
        rawText: requestedName,
        requestedName,
        source: 'user_other',
        needsReview: true,
      },
    })),
  ];
}
