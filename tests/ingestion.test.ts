import { describe, expect, it } from 'vitest';
import {
  deterministicExtract,
  partitionByConfidence,
  safeInferredProficiency,
} from '@/lib/ingestion/service';
describe('ingestion', () => {
  it('structures messy project text and gates uncertainty', () => {
    const records = deterministicExtract({
      projects:
        '1. Phoenix migration - Solution Lead - 14 months - completed\n2. Internal AI accelerator, ongoing',
      primary: 'MS Dynamics, Azure',
      secondary: 'MS Dynamics CRM',
      tools: 'Jira, GitHub',
    });
    expect(records.filter((x) => x.type === 'project')).toHaveLength(2);
    expect(
      records.find((x) => x.type === 'project')?.payload.durationMonthsEstimate,
    ).toBe(14);
    const p = partitionByConfidence(records);
    expect(p.accepted.length).toBeGreaterThan(0);
    expect(p.needsReview.length).toBeGreaterThan(0);
  });
  it('deduplicates aliases and uses primary precedence without claiming self rating', () => {
    const skills = deterministicExtract({
      primary: 'MS Dynamics, Azure',
      secondary: 'MS Dynamics CRM, Power BI',
    }).filter((x) => x.type === 'skill');
    const dynamics = skills.find(
      (x) => x.payload.canonicalName === 'Microsoft Dynamics 365',
    );
    expect(
      skills.filter(
        (x) => x.payload.canonicalName === 'Microsoft Dynamics 365',
      ),
    ).toHaveLength(1);
    expect(dynamics?.payload).toMatchObject({
      proficiency: 4,
      ratingSource: 'inferred',
      tag: 'primary',
    });
    expect(
      skills.find((x) => x.payload.canonicalName === 'Power BI')?.payload,
    ).toMatchObject({ proficiency: 2, ratingSource: 'inferred' });
  });
  it('constrains provider-inferred values to the 1-5 scale', () => {
    expect(safeInferredProficiency({ tag: 'primary', proficiency: 99 })).toBe(
      4,
    );
    expect(safeInferredProficiency({ tag: 'secondary', proficiency: 99 })).toBe(
      2,
    );
    expect(safeInferredProficiency({ proficiency: 99 })).toBe(3);
  });
});
