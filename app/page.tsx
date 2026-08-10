import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Empty, PanelHeader, RoleBadge, Stat } from '@/components/ui';
import { currentIdentity } from '@/lib/authz';
import { loadDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentIdentity();
  if (!user) redirect('/signin');

  const dashboard = await loadDashboardData(user);
  const currentLeader = dashboard.recentLeaders.find(
    (leader) => leader.id === user.leaderId,
  );
  const displayName =
    currentLeader?.preferredName ||
    currentLeader?.fullName ||
    user.name ||
    user.email?.split('@')[0] ||
    'there';
  const topCapability = dashboard.capability[0];

  return (
    <>
      <DashboardHeader name={displayName} />
      <div className="page-shell space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Leader profiles"
            value={dashboard.leaderCount}
            detail={`${dashboard.completionPercent}% complete`}
          />
          <Stat
            label="Canonical skills"
            value={dashboard.canonicalSkillCount}
            detail={
              dashboard.categoryCount
                ? `Across ${dashboard.categoryCount} ${dashboard.categoryCount === 1 ? 'category' : 'categories'}`
                : 'No categories assigned'
            }
          />
          <Stat
            label="Skills needing review"
            value={dashboard.skillsNeedingReview}
            detail="Flagged for taxonomy review"
          />
          <Stat
            label="Quarterly growth"
            value={dashboard.quarterlyGrowth.value}
            detail={dashboard.quarterlyGrowth.detail}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <div className="card overflow-hidden">
            <PanelHeader
              eyebrow="Capability pulse"
              title="Skills across the organisation"
              action={
                <Link href="/matrix" className="btn-ghost">
                  View matrix →
                </Link>
              }
            />
            <div className="space-y-5 px-6 pb-7">
              {dashboard.capability.map((skill) => (
                <div key={skill.id}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">{skill.name}</span>
                    <span className="text-neutral-600">
                      {skill.coveragePercent}% coverage
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-value"
                      style={{ width: `${skill.coveragePercent}%` }}
                    />
                  </div>
                </div>
              ))}
              {!dashboard.capability.length && (
                <Empty
                  compact
                  title="No skill coverage yet"
                  body="Add skills to leader profiles to populate this capability view."
                  href="/my-profile"
                  label="Add profile skills"
                />
              )}
            </div>
          </div>

          <div className="card insight-card p-7">
            <Sparkles className="text-mint" aria-hidden="true" />
            <p className="mt-7 text-xs font-semibold uppercase tracking-widest text-mint">
              Insight of the week
            </p>
            {topCapability ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-50">
                  {topCapability.name} has the broadest coverage.
                </h2>
                <p className="mt-3 text-sm leading-6 text-neutral-50/80">
                  {topCapability.leaderCount} of {dashboard.leaderCount}{' '}
                  visible leader profiles currently record this skill.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-50">
                  No insight yet
                </h2>
                <p className="mt-3 text-sm leading-6 text-neutral-50/80">
                  Insights will appear after leader profiles contain skill
                  data.
                </p>
              </>
            )}
            <Link
              href={topCapability ? '/analytics' : '/my-profile'}
              className="mt-7 inline-flex font-semibold text-mint underline-offset-4 hover:underline"
            >
              {topCapability ? 'Open analytics' : 'Add profile skills'} →
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex justify-between">
            <h2 className="text-xl font-semibold">Recently updated</h2>
            <Link href="/directory" className="text-sm font-semibold text-moss">
              See everyone
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.recentLeaders.map((leader) => (
              <Link
                key={leader.id}
                href={`/directory/${leader.id}`}
                className="card p-5 transition-colors hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100"
              >
                <div className="grid h-10 w-10 place-items-center rounded-control bg-primary-100 font-semibold text-primary-900">
                  {leader.fullName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <h3 className="mt-4 font-semibold">{leader.fullName}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                  <RoleBadge
                    role={leader.id === user.leaderId ? user.role : leader.role}
                  />
                  {leader.jobTitle ? <span>{leader.jobTitle}</span> : null}
                </p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {leader.skills.slice(0, 2).map((rating) => (
                    <span
                      className="pill bg-cream text-forest"
                      key={rating.id}
                    >
                      {rating.skill.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
            {!dashboard.recentLeaders.length && (
              <div className="md:col-span-2 xl:col-span-4">
                <Empty
                  compact
                  title="No leader profiles yet"
                  body="Published leader profiles will appear here after HR approval."
                  href="/my-profile"
                  label="Build your profile"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
