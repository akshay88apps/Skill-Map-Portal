import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OTHER_TAXONOMY_VALUE,
  TaxonomyCombobox,
} from '@/components/taxonomy-combobox';
import { otherTaxonomyReviewRequests } from '@/lib/profile-taxonomy';
import { resolveCanonicalSkill } from '@/lib/skill-resolution';
import { seedTaxonomy } from '@/lib/taxonomy-seed';
import {
  taxonomyEntries,
  taxonomyGroups,
  taxonomyNameSet,
} from '@/lib/taxonomy';

describe('HR skill taxonomy', () => {
  it('seeds every unique HR term with its category', async () => {
    const upsert = vi.fn().mockResolvedValue({});

    await expect(
      seedTaxonomy({ skill: { upsert } }),
    ).resolves.toBe(167);
    expect(taxonomyGroups).toHaveLength(14);
    expect(upsert).toHaveBeenCalledTimes(taxonomyEntries.length);
    expect(upsert).toHaveBeenCalledWith({
      where: { name: 'Power BI' },
      update: {
        category: 'Microsoft Business Applications',
        needsReview: false,
      },
      create: {
        name: 'Power BI',
        category: 'Microsoft Business Applications',
        needsReview: false,
      },
    });
  });

  it('only offers searchable taxonomy values plus the governed Other path', () => {
    const onSelect = vi.fn();
    render(
      <TaxonomyCombobox label="Skill 1" onSelect={onSelect} />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Skill 1' });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: 'kuber' } });

    const options = screen.getAllByRole('option');
    const offeredTaxonomyValues = options
      .map((option) => option.textContent || '')
      .filter((value) => !value.startsWith('Other (specify)'));
    expect(offeredTaxonomyValues).toEqual(['Kubernetes']);
    expect(
      offeredTaxonomyValues.every((value) => taxonomyNameSet.has(value)),
    ).toBe(true);

    fireEvent.click(
      screen.getByRole('option', { name: /Other \(specify\)/ }),
    );
    expect(onSelect).toHaveBeenCalledWith(OTHER_TAXONOMY_VALUE);
  });

  it('queues Other skill and tool requests without creating canonical rows', async () => {
    const requests = otherTaxonomyReviewRequests(
      'leader-1',
      [{ name: 'Emerging Runtime', proficiency: 4 }],
      ['Internal Platform Tool'],
    );

    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      entityType: 'skill',
      confidence: 0,
      payload: {
        requestedName: 'Emerging Runtime',
        needsReview: true,
        source: 'user_other',
      },
    });
    expect(requests[1]).toMatchObject({
      entityType: 'tool',
      payload: {
        requestedName: 'Internal Platform Tool',
        needsReview: true,
      },
    });
  });

  it('resolves ingestion terms taxonomy-first, then SkillAlias, then fuzzy match', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      skill: { name: 'Internal Approved Skill', category: 'Approved' },
    });
    const database = { skillAlias: { findFirst } };

    await expect(resolveCanonicalSkill('PowerBI', database)).resolves.toMatchObject({
      name: 'Power BI',
      matchType: 'exact',
    });
    expect(findFirst).not.toHaveBeenCalled();

    await expect(
      resolveCanonicalSkill('Company shorthand', database),
    ).resolves.toEqual({
      name: 'Internal Approved Skill',
      category: 'Approved',
      matchType: 'database-alias',
    });

    findFirst.mockResolvedValueOnce(null);
    await expect(
      resolveCanonicalSkill('Kubernets', database),
    ).resolves.toMatchObject({ name: 'Kubernetes', matchType: 'fuzzy' });
  });
});
