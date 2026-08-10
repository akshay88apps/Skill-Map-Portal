import { describe, expect, it } from 'vitest';
import { OTHER_TAXONOMY_VALUE } from '@/components/taxonomy-combobox';
import { normalizedDraft } from '@/app/my-profile/page';

describe('profile skill draft defaults', () => {
  it('keeps new and unresolved legacy skill rows on the blank dropdown default', () => {
    const draft = normalizedDraft({
      projects: [],
      ratedSkills: [
        { name: '', proficiency: 3 },
        { name: 'Uncontrolled legacy skill', proficiency: 4 },
      ],
      tools: ['Legacy hidden tool'],
      otherTools: ['Legacy review tool'],
    });

    expect(draft.ratedSkills).toEqual([
      { name: '', proficiency: 3, otherName: undefined },
      { name: '', proficiency: 4, otherName: undefined },
    ]);
    expect(draft).not.toHaveProperty('tools');
    expect(draft).not.toHaveProperty('otherTools');
  });

  it('preserves an intentionally specified Other skill for the review queue', () => {
    const draft = normalizedDraft({
      projects: [],
      ratedSkills: [
        {
          name: OTHER_TAXONOMY_VALUE,
          proficiency: 4,
          otherName: 'Emerging Runtime',
        },
      ],
    });

    expect(draft.ratedSkills[0]).toMatchObject({
      name: OTHER_TAXONOMY_VALUE,
      otherName: 'Emerging Runtime',
    });
  });
});
