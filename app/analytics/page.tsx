import { PageHeader, Stat } from '@/components/ui';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
export const dynamic = 'force-dynamic';
export default async function Analytics() {
  await requireAdmin();
  const [leaders, certs, staleRows] = await Promise.all([
    db.leader.findMany({
      where: { profileStatus: 'PUBLISHED' },
      include: { skills: { include: { skill: true } } },
    }),
    db.certification.findMany({
      where: { leader: { profileStatus: 'PUBLISHED' } },
    }),
    db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) AS count FROM "Leader" WHERE "profileStatus" = 'PUBLISHED' AND ("lastProfileUpdate" IS NULL OR "lastProfileUpdate" < NOW() - INTERVAL '180 days')`,
  ]);
  const ratings = leaders.flatMap((l) => l.skills);
  const selfRated = ratings.filter((r) => r.ratingSource === 'self_rated');
  const avg = selfRated.length
    ? selfRated.reduce((n, r) => n + r.proficiency, 0) / selfRated.length
    : 0;
  const bySkill = new Map<
    string,
    { count: number; total: number; inferred: number }
  >();
  for (const r of ratings) {
    const v = bySkill.get(r.skill.name) || { count: 0, total: 0, inferred: 0 };
    v.count++;
    v.total += r.proficiency;
    if (r.ratingSource === 'inferred') v.inferred++;
    bySkill.set(r.skill.name, v);
  }
  const coverage = [...bySkill]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);
  const stale = Number(staleRows[0]?.count || 0);
  return (
    <>
      <PageHeader
        eyebrow="Leadership intelligence"
        title="Capability analytics"
        description="Live, published profile coverage. Inferred ratings are shown separately and are not treated as confirmed evidence."
      />
      <div className="space-y-6 p-6 lg:p-10">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            label="Published leaders"
            value={leaders.length}
            detail="HR-approved profiles"
          />
          <Stat
            label="Self-rated average"
            value={avg ? `${avg.toFixed(1)}/5` : '—'}
            detail={`${selfRated.length} confirmed ratings`}
          />
          <Stat
            label="Inferred ratings"
            value={ratings.length - selfRated.length}
            detail="Require leader confirmation"
          />
          <Stat
            label="Stale profiles"
            value={stale}
            detail="Not updated in 2 quarters"
          />
        </div>
        <section className="card p-7">
          <h2 className="text-xl font-bold">Organisation skill coverage</h2>
          <div className="mt-6 space-y-5">
            {coverage.map(([skill, v]) => (
              <div key={skill}>
                <div className="mb-2 flex justify-between text-sm">
                  <b>{skill}</b>
                  <span>
                    {v.count} leaders · {(v.total / v.count).toFixed(1)}/5 avg
                    {v.inferred ? ` · ${v.inferred} inferred` : ''}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-mint">
                  <div
                    className="h-full rounded-full bg-moss"
                    style={{
                      width: `${Math.min(100, (v.count / Math.max(1, leaders.length)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {!coverage.length && (
              <p className="text-sm text-ink/45">
                Publish leader profiles to populate analytics.
              </p>
            )}
          </div>
        </section>
        <p className="text-xs text-ink/40">
          {certs.length} certifications recorded across published profiles.
        </p>
      </div>
    </>
  );
}
