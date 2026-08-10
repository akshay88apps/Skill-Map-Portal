import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { AppRole } from '@/lib/roles';

type DashboardViewer = {
  role: AppRole;
};

function quarterOrder(quarter: string) {
  const yearFirst = quarter.match(/(\d{4})\D*Q([1-4])/i);
  if (yearFirst) return Number(yearFirst[1]) * 4 + Number(yearFirst[2]);
  const quarterFirst = quarter.match(/Q([1-4])\D*(\d{4})/i);
  if (quarterFirst)
    return Number(quarterFirst[2]) * 4 + Number(quarterFirst[1]);
  return Number.NEGATIVE_INFINITY;
}

function quarterlyGrowth(
  snapshots: Array<{ quarter: string; skillCount: number }>,
) {
  const totals = new Map<string, number>();
  for (const snapshot of snapshots)
    totals.set(
      snapshot.quarter,
      (totals.get(snapshot.quarter) || 0) + snapshot.skillCount,
    );
  const quarters = [...totals].sort(
    (a, b) => quarterOrder(b[0]) - quarterOrder(a[0]),
  );
  if (quarters.length < 2)
    return { value: '—', detail: 'No quarterly history yet' };
  const [current, previous] = quarters;
  if (previous[1] === 0)
    return { value: '—', detail: `No baseline for ${previous[0]}` };
  const change = Math.round(((current[1] - previous[1]) / previous[1]) * 100);
  return {
    value: `${change >= 0 ? '+' : ''}${change}%`,
    detail: `Compared with ${previous[0]}`,
  };
}

export async function loadDashboardData(viewer: DashboardViewer) {
  const leaderWhere: Prisma.LeaderWhereInput =
    viewer.role === 'ADMIN' ? {} : { profileStatus: 'PUBLISHED' };

  const [leaderRows, skillRows, snapshots] = await Promise.all([
    db.leader.findMany({
      where: leaderWhere,
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        email: true,
        department: true,
        jobTitle: true,
        role: true,
        profileCompleted: true,
        profileStatus: true,
        updatedAt: true,
        skills: {
          select: {
            id: true,
            proficiency: true,
            ratingSource: true,
            skill: { select: { id: true, name: true } },
          },
        },
        projects: { select: { id: true } },
        certifications: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.skill.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        needsReview: true,
        leaders: {
          where: { leader: leaderWhere },
          select: { leaderId: true, proficiency: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    db.kpiSnapshot.findMany({
      where: { leader: leaderWhere },
      select: { quarter: true, skillCount: true },
    }),
  ]);

  const completedProfiles = leaderRows.filter(
    (leader) =>
      leader.profileCompleted ||
      leader.profileStatus === 'SUBMITTED' ||
      leader.profileStatus === 'PUBLISHED',
  ).length;
  const completionPercent = leaderRows.length
    ? Math.round((completedProfiles / leaderRows.length) * 100)
    : 0;
  const categories = new Set(
    skillRows
      .map((skill) => skill.category?.trim())
      .filter((category): category is string => Boolean(category)),
  );
  const capability = skillRows
    .map((skill) => {
      const representedLeaders = new Set(
        skill.leaders.map((rating) => rating.leaderId),
      );
      const coveragePercent = leaderRows.length
        ? Math.round((representedLeaders.size / leaderRows.length) * 100)
        : 0;
      return {
        id: skill.id,
        name: skill.name,
        leaderCount: representedLeaders.size,
        coveragePercent,
      };
    })
    .filter((skill) => skill.leaderCount > 0)
    .sort(
      (a, b) =>
        b.coveragePercent - a.coveragePercent || a.name.localeCompare(b.name),
    )
    .slice(0, 5);

  return {
    leaderCount: leaderRows.length,
    completionPercent,
    canonicalSkillCount: skillRows.length,
    categoryCount: categories.size,
    skillsNeedingReview: skillRows.filter((skill) => skill.needsReview).length,
    capability,
    quarterlyGrowth: quarterlyGrowth(snapshots),
    recentLeaders: leaderRows.slice(0, 8),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;
