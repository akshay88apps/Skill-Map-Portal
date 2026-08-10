import { Badge, Empty, PageHeader, PanelHeader, Stat } from '@/components/ui';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
import {
  buildCapabilityMatrix,
  categoriesForCapability,
} from '@/lib/capabilities';
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
      select: { id: true },
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
  const capabilityMatrix = buildCapabilityMatrix(leaders);
  return (
    <>
      <PageHeader
        eyebrow="Leadership intelligence"
        title="Capability analytics"
        description="Live, published profile coverage. Inferred ratings are shown separately and are not treated as confirmed evidence."
      />
      <div className="page-shell space-y-6">
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
        <section className="card overflow-hidden">
          <PanelHeader
            eyebrow="Executive rollup"
            title="Capability Matrix"
            description="Leaders count once in every capability their published skills or approved manual tags support; totals are coverage, not allocated headcount."
          />
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Source</th>
                  <th>Mapped skill categories</th>
                  <th className="text-right">Headcount</th>
                  <th className="w-56">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {capabilityMatrix.map((row) => {
                  const percent = leaders.length
                    ? Math.round((row.headcount / leaders.length) * 100)
                    : 0;
                  const categories = categoriesForCapability(row.name);
                  return (
                    <tr key={row.name}>
                      <td className="font-semibold text-neutral-900">
                        {row.name}
                      </td>
                      <td>
                        <Badge tone={row.kind === 'manual' ? 'info' : 'neutral'}>
                          {row.kind === 'manual'
                            ? 'Manually tagged'
                            : 'Skill-derived'}
                        </Badge>
                      </td>
                      <td className="text-neutral-600">
                        {categories.length ? categories.join(' · ') : '—'}
                      </td>
                      <td className="text-right text-base font-semibold">
                        {row.headcount}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="progress-track flex-1">
                            <div
                              className="progress-value"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-neutral-600">
                            {percent}%
                          </span>
                        </div>
                        {row.name === 'Digital Trust' && row.headcount === 0 && (
                          <p className="mt-1 text-xs font-medium text-warning-700">
                            Security &amp; Cybersecurity currently has no leaders
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card p-7">
          <h2 className="text-xl font-semibold">Organisation skill coverage</h2>
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
              <Empty
                compact
                title="No published skill coverage yet"
                body="Publish leader profiles with taxonomy skills to populate this analysis."
                href="/admin"
                label="Open leader administration"
              />
            )}
          </div>
        </section>
        <p className="text-xs text-neutral-600">
          {certs.length} certifications recorded across published profiles.
        </p>
      </div>
    </>
  );
}
