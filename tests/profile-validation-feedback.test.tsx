import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Wizard from '@/app/my-profile/page';

const invalidDraft = {
  fullName: 'Test Leader',
  preferredName: 'Test',
  department: 'Product Engineering',
  jobTitle: 'Engineering Lead',
  experience: '10 years 0 months',
  leadership: '5 years',
  projects: [
    {
      name: 'Project without technology',
      description: 'A deliberately incomplete project.',
      techStack: [],
    },
  ],
  certifications: [],
  ratedSkills: [{ name: 'OpenAI', proficiency: 3 }],
  careerAspiration: {
    targetCapability: 'Product Engineering',
    targetRole: 'Engineering Director',
    targetSkills: [{ name: '.NET Framework', targetProficiency: 4 }],
    targetTimeframe: 'SIX_TO_TWELVE_MONTHS',
    secondaryCapability: '',
    notes: '',
  },
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('skillmap-draft', JSON.stringify(invalidDraft));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method)
        return { ok: false, json: async () => ({}) } as Response;
      if (init.method === 'POST')
        return {
          ok: false,
          status: 422,
          json: async () => ({
            error: 'Profile validation failed',
            code: 'PROFILE_VALIDATION_FAILED',
            issues: [
              {
                path: 'projects.0.techStack',
                message: 'Add at least one technology to this project.',
                code: 'too_small',
              },
            ],
          }),
        } as Response;
      return { ok: true, json: async () => ({ saved: true }) } as Response;
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('profile validation feedback', () => {
  it('navigates to the invalid step and shows the actionable field error', async () => {
    render(<Wizard />);

    fireEvent.click(screen.getByRole('button', { name: 'Career Aspiration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit profile' }));

    expect(
      await screen.findByText('Add at least one technology to this project.'),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please correct this field: Add at least one technology to this project.',
    );
    expect(
      screen.getByRole('button', { name: 'Projects: 1 validation errors' }),
    ).toBeVisible();
    expect(
      screen.queryByText('Profile validation failed'),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Step 3 of 6')).toBeVisible(),
    );
  });
});
