import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CapabilityTagMultiSelect } from '@/components/capability-tag-multiselect';
import {
  buildCapabilityMatrix,
  capabilityForCategory,
  capabilityNames,
  categoryCapabilityMap,
} from '@/lib/capabilities';
import { taxonomyGroups } from '@/lib/taxonomy';

describe('capability model', () => {
  it('maps every category in the updated HR taxonomy with no unmapped bucket', () => {
    const categories = taxonomyGroups.map((group) => group.category);

    expect(categories).toHaveLength(14);
    expect(Object.keys(categoryCapabilityMap)).toEqual(categories);
    expect(categories.map(capabilityForCategory)).not.toContain(null);
    expect(capabilityNames).toHaveLength(10);
  });

  it('counts a leader in every relevant capability and only once per capability', () => {
    const matrix = buildCapabilityMatrix([
      {
        id: 'multi-capability-leader',
        skills: [
          { skill: { category: 'Microsoft Technologies' } },
          { skill: { category: 'Backend Technologies' } },
          {
            skill: {
              category: 'Artificial Intelligence & Generative AI',
            },
          },
        ],
        additionalCapabilityTags: ['INNOVATION_LAB'],
      },
      {
        id: 'experience-leader',
        skills: [
          { skill: { category: 'Frontend Technologies' } },
          { skill: { category: 'UI/UX Design' } },
        ],
        additionalCapabilityTags: [],
      },
    ]);

    expect(matrix).toHaveLength(10);
    expect(matrix.find((row) => row.name === 'Product Engineering')).toMatchObject({
      headcount: 1,
      leaderIds: ['multi-capability-leader'],
    });
    expect(
      matrix.find((row) => row.name === 'AI & Autonomous Systems'),
    ).toMatchObject({ headcount: 1 });
    expect(
      matrix.find((row) => row.name === 'Experience Engineering'),
    ).toMatchObject({
      headcount: 1,
      leaderIds: ['experience-leader'],
    });
    expect(matrix.find((row) => row.name === 'Innovation Lab')).toMatchObject({
      kind: 'manual',
      headcount: 1,
    });
    expect(matrix.find((row) => row.name === 'Digital Trust')).toMatchObject({
      kind: 'skill-derived',
      headcount: 0,
    });
  });

  it('supports selecting more than one admin-only function capability', () => {
    function Harness() {
      const [tags, setTags] = useState<string[]>([]);
      return <CapabilityTagMultiSelect value={tags} onChange={setTags} />;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Customer Engineering' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Innovation Lab' }));

    expect(
      screen.getByRole('checkbox', { name: 'Customer Engineering' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Innovation Lab' }),
    ).toBeChecked();
  });
});
