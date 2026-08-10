import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CareerAspirationField,
  type DraftCareerAspiration,
} from '@/app/my-profile/page';
import { careerAspirationInput } from '@/lib/validation';
import { proficiencyComparison } from '@/lib/career-aspiration';

afterEach(cleanup);

const validAspiration = {
  targetCapability: 'Platform Engineering',
  targetRole: 'Platform Engineering Lead',
  targetSkills: [{ name: 'Azure Functions', targetProficiency: 5 }],
  targetTimeframe: 'SIX_TO_TWELVE_MONTHS',
  secondaryCapability: 'Product Engineering',
  notes: 'Build platform leadership evidence.',
};

describe('structured career aspiration', () => {
  it('enforces primary and secondary capability exclusivity', () => {
    expect(careerAspirationInput.safeParse(validAspiration).success).toBe(true);
    const invalid = careerAspirationInput.safeParse({
      ...validAspiration,
      secondaryCapability: 'Platform Engineering',
    });
    expect(invalid.success).toBe(false);
    expect(invalid.error?.flatten().fieldErrors.secondaryCapability).toContain(
      'Secondary capability must differ from target capability',
    );
  });

  it('enforces the target-role and notes character limits', () => {
    expect(
      careerAspirationInput.safeParse({
        ...validAspiration,
        targetRole: 'R'.repeat(60),
        notes: 'N'.repeat(300),
      }).success,
    ).toBe(true);
    expect(
      careerAspirationInput.safeParse({
        ...validAspiration,
        targetRole: 'R'.repeat(61),
      }).success,
    ).toBe(false);
    expect(
      careerAspirationInput.safeParse({
        ...validAspiration,
        notes: 'N'.repeat(301),
      }).success,
    ).toBe(false);
  });

  it('formats the current-to-target comparison used on the owner profile', () => {
    expect(proficiencyComparison(3, 4)).toBe(
      'Proficient (3) → targeting Advanced (4)',
    );
    expect(proficiencyComparison(undefined, 2)).toBe(
      'Not yet rated → targeting Familiar (2)',
    );
  });

  it('excludes the primary capability and uses bounded structured inputs', () => {
    function Harness() {
      const [value, setValue] = useState<DraftCareerAspiration>({
        ...validAspiration,
        targetTimeframe: 'SIX_TO_TWELVE_MONTHS',
      });
      return <CareerAspirationField value={value} onChange={setValue} />;
    }

    render(<Harness />);

    expect(
      screen.getByLabelText('Target Role / Next Milestone'),
    ).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Career aspiration notes')).toHaveAttribute(
      'maxlength',
      '300',
    );
    const secondary = screen.getByLabelText('Secondary Capability Interest');
    expect(
      secondary.querySelector('option[value="Platform Engineering"]'),
    ).not.toBeInTheDocument();
    expect(
      secondary.querySelector('option[value="Product Engineering"]'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Target Capability'), {
      target: { value: 'Product Engineering' },
    });
    expect(screen.getByLabelText('Secondary Capability Interest')).toHaveValue(
      '',
    );
  });
});
