import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findLeaders: vi.fn(),
  findSkills: vi.fn(),
  findSnapshots: vi.fn(),
  countViewerSkills: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    leader: { findMany: mocks.findLeaders },
    leaderSkill: { count: mocks.countViewerSkills },
    skill: { findMany: mocks.findSkills },
    kpiSnapshot: { findMany: mocks.findSnapshots },
  },
}));

import { loadDashboardData } from '@/lib/dashboard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findLeaders.mockResolvedValue([
    {
      id: 'leader-1',
      fullName: 'Admin One',
      preferredName: 'Admin',
      email: 'admin@example.com',
      department: 'Engineering',
      jobTitle: null,
      role: 'ADMIN',
      profileCompleted: false,
      profileStatus: 'PUBLISHED',
      updatedAt: new Date('2026-08-10T00:00:00Z'),
      skills: [],
      projects: [],
      certifications: [],
    },
    {
      id: 'leader-2',
      fullName: 'Leader Two',
      preferredName: 'Leader',
      email: 'leader@example.com',
      department: 'Delivery',
      jobTitle: 'Director',
      role: 'LEADER',
      profileCompleted: false,
      profileStatus: 'INVITED',
      updatedAt: new Date('2026-08-09T00:00:00Z'),
      skills: [],
      projects: [],
      certifications: [],
    },
  ]);
  mocks.findSkills.mockResolvedValue([
    {
      id: 'skill-azure',
      name: 'Azure',
      category: 'Cloud',
      needsReview: false,
      leaders: [
        { leaderId: 'leader-1', proficiency: 5 },
        { leaderId: 'leader-1', proficiency: 4 },
        { leaderId: 'leader-2', proficiency: 3 },
      ],
    },
    {
      id: 'skill-ai',
      name: 'AI Strategy',
      category: 'Strategy',
      needsReview: true,
      leaders: [{ leaderId: 'leader-1', proficiency: 4 }],
    },
    {
      id: 'skill-unassigned',
      name: 'Data Engineering',
      category: null,
      needsReview: false,
      leaders: [],
    },
  ]);
  mocks.findSnapshots.mockResolvedValue([
    { quarter: '2026-Q2', skillCount: 3 },
    { quarter: '2026-Q2', skillCount: 3 },
    { quarter: '2026-Q1', skillCount: 2 },
    { quarter: '2026-Q1', skillCount: 2 },
  ]);
  mocks.countViewerSkills.mockResolvedValue(0);
});

describe('live dashboard reconciliation', () => {
  it('derives skill count, category count, coverage, and growth from queried database rows', async () => {
    const dashboard = await loadDashboardData({ role: 'ADMIN' });

    expect(dashboard).toMatchObject({
      leaderCount: 2,
      completionPercent: 50,
      canonicalSkillCount: 3,
      categoryCount: 2,
      skillsNeedingReview: 1,
      quarterlyGrowth: {
        value: '+50%',
        detail: 'Compared with 2026-Q1',
      },
    });
    expect(dashboard.capability).toEqual([
      {
        id: 'skill-azure',
        name: 'Azure',
        leaderCount: 2,
        coveragePercent: 100,
      },
      {
        id: 'skill-ai',
        name: 'AI Strategy',
        leaderCount: 1,
        coveragePercent: 50,
      },
    ]);
    expect(mocks.findSkills).toHaveBeenCalledOnce();
  });

  it('shows explicit empty states when the database has no skill or KPI data', async () => {
    mocks.findSkills.mockResolvedValue([]);
    mocks.findSnapshots.mockResolvedValue([]);

    const dashboard = await loadDashboardData({ role: 'ADMIN' });

    expect(dashboard.canonicalSkillCount).toBe(0);
    expect(dashboard.categoryCount).toBe(0);
    expect(dashboard.capability).toEqual([]);
    expect(dashboard.quarterlyGrowth).toEqual({
      value: '—',
      detail: 'No quarterly history yet',
    });
  });

  it('reports whether the signed-in leader has skills for map expansion', async () => {
    let dashboard = await loadDashboardData({
      role: 'LEADER',
      leaderId: 'leader-1',
    });
    expect(dashboard.viewerHasSkills).toBe(false);
    expect(mocks.countViewerSkills).toHaveBeenCalledWith({
      where: { leaderId: 'leader-1' },
    });

    mocks.countViewerSkills.mockResolvedValue(2);
    dashboard = await loadDashboardData({
      role: 'LEADER',
      leaderId: 'leader-1',
    });
    expect(dashboard.viewerHasSkills).toBe(true);
  });
});
