'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Empty, PageHeader } from '@/components/ui';
import { useLiveLeaders } from '@/lib/use-live-leaders';
import {
  capabilityNames,
  capabilitiesForLeader,
} from '@/lib/capabilities';
const color: Record<number, string> = {
  5: 'bg-primary-900 text-neutral-50',
  4: 'bg-primary-800 text-neutral-50',
  3: 'bg-primary-700 text-neutral-50',
  2: 'bg-primary-300 text-primary-900',
  1: 'bg-primary-100 text-primary-900',
};
const labels = ['', 'Novice', 'Familiar', 'Proficient', 'Advanced', 'Expert'];
export default function Matrix() {
  const { leaders: allLeaders } = useLiveLeaders();
  const [dept, setDept] = useState('All');
  const [capability, setCapability] = useState('All');
  const leaders = allLeaders.filter((leader) => {
    const leaderCapabilities = capabilitiesForLeader({
      id: leader.id,
      skills: leader.skills.map((skill) => ({
        skill: { category: skill[3] },
      })),
      additionalCapabilityTags: leader.additionalCapabilityTags,
    });
    return (
      (dept === 'All' || leader.department === dept) &&
      (capability === 'All' || leaderCapabilities.includes(capability))
    );
  });
  const allSkills = [
    ...new Set(leaders.flatMap((leader) => leader.skills.map((skill) => skill[0]))),
  ];
  const csv = () => {
    const body = [
      ['Leader', ...allSkills],
      ...leaders.map((l) => [
        l.fullName,
        ...allSkills.map((s) => {
          const rating = l.skills.find((x) => x[0] === s);
          return rating ? `${rating[1]} (${rating[2]})` : '';
        }),
      ]),
    ]
      .map((r) => r.join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'skill-matrix.csv';
    a.click();
  };
  return (
    <>
      <PageHeader
        eyebrow="Capability intelligence"
        title="Skill matrix"
        description="Ratings use a 1–5 scale. Dashed cells and the ◇ marker identify inferred values that require confirmation before gap decisions."
        action={
          <Button onClick={csv}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        }
      />
      <div className="page-shell">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="grid w-full gap-3 sm:max-w-2xl sm:grid-cols-2">
            <select
              aria-label="Department"
              className="input max-w-xs"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option>All</option>
              {[...new Set(allLeaders.map((l) => l.department))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              aria-label="Capability"
              className="input min-w-56"
              value={capability}
              onChange={(event) => setCapability(event.target.value)}
            >
              <option>All</option>
              {capabilityNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 text-xs">
            <span>● self-rated</span>
            <span>◇ inferred</span>
            <span>◆ demo</span>
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="data-table min-w-[950px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-neutral-50">
                  Leader
                </th>
                {allSkills.map((s) => (
                  <th
                    className="min-w-32 border-l border-neutral-200 text-xs"
                    key={s}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.id}>
                  <th className="sticky left-0 bg-neutral-50 p-4 text-left">
                    <div>{l.fullName}</div>
                    <span className="text-xs font-normal text-neutral-600">
                      {l.department}
                    </span>
                  </th>
                  {allSkills.map((s) => {
                    const rating = l.skills.find((x) => x[0] === s);
                    if (!rating)
                      return (
                        <td
                          className="border-l border-neutral-200 p-3 text-center"
                          key={s}
                        >
                          <span className="text-neutral-500">—</span>
                        </td>
                      );
                    const [, p, source] = rating;
                    const marker =
                      source === 'self_rated'
                        ? '●'
                        : source === 'inferred'
                          ? '◇'
                          : '◆';
                    return (
                      <td
                        className="border-l border-neutral-200 p-3 text-center"
                        key={s}
                      >
                        <span
                          title={`${p} — ${labels[p]} · ${source.replace('_', ' ')}`}
                          className={`relative mx-auto block h-9 w-9 rounded-control ${color[p]} ${source === 'inferred' ? 'border-2 border-dashed border-gold' : ''} leading-9`}
                        >
                          {p}
                          <sup className="absolute -right-1 -top-2 text-[9px] text-gold">
                            {marker}
                          </sup>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!leaders.length && (
            <div className="p-4">
              <Empty
                compact
                title="No matching capability records"
                body="Adjust the department or capability filter to populate the matrix."
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
