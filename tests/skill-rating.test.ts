import { describe, expect, it } from 'vitest';
import {
  profileDraftInput,
  profileInput,
  selfRatingInput,
} from '@/lib/validation';
import { detectSkillGaps } from '@/lib/integrations/lnd';
describe('explicit skill ratings', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i on the defined scale', (proficiency) =>
    expect(
      selfRatingInput.safeParse({
        email: 'leader@example.com',
        skills: [{ name: 'Azure', proficiency }],
      }).success,
    ).toBe(true),
  );
  it.each([0, 6, 2.5])('rejects out-of-scale rating %s', (proficiency) =>
    expect(
      selfRatingInput.safeParse({
        email: 'leader@example.com',
        skills: [{ name: 'Azure', proficiency }],
      }).success,
    ).toBe(false),
  );
});
describe('L&D gap confidence', () => {
  const ratings = [
    {
      leaderEmail: 'a@example.com',
      skill: 'Azure',
      proficiency: 2,
      target: 4,
      ratingSource: 'self_rated' as const,
    },
    {
      leaderEmail: 'b@example.com',
      skill: 'AI',
      proficiency: 2,
      target: 4,
      ratingSource: 'inferred' as const,
    },
  ];
  it('uses self ratings for confirmed gap decisions by default', () =>
    expect(detectSkillGaps(ratings)).toEqual([
      {
        leaderEmail: 'a@example.com',
        skill: 'Azure',
        current: 2,
        target: 4,
        ratingSource: 'self_rated',
        decisionConfidence: 'confirmed',
      },
    ]));
  it('only includes inferred gaps as explicitly advisory', () =>
    expect(detectSkillGaps(ratings, true)[1]).toMatchObject({
      skill: 'AI',
      ratingSource: 'inferred',
      decisionConfidence: 'advisory',
    }));
});
describe('production profile contract', () => {
  it('requires a complete identity-bound submission with valid ratings', () =>
    expect(
      profileInput.safeParse({
        fullName: 'Test Leader',
        ratedSkills: [{ name: 'Azure', proficiency: 4 }],
      }).success,
    ).toBe(true));
  it('allows incomplete server-side drafts but still validates field limits', () => {
    expect(
      profileDraftInput.safeParse({ projects: 'In progress' }).success,
    ).toBe(true);
    expect(profileDraftInput.safeParse({ fullName: 'x' }).success).toBe(false);
  });
});
