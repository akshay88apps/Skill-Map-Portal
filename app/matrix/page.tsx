'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { allSkills, demoLeaders } from '@/lib/demo';
const color: Record<number, string> = {
  5: 'bg-forest text-white',
  4: 'bg-[#2f6653] text-white',
  3: 'bg-moss text-white',
  2: 'bg-[#a8cfbb] text-forest',
  1: 'bg-mint text-forest',
};
const labels = ['', 'Novice', 'Familiar', 'Proficient', 'Advanced', 'Expert'];
export default function Matrix() {
  const [dept, setDept] = useState('All');
  const leaders = demoLeaders.filter(
    (l) => dept === 'All' || l.department === dept,
  );
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
          <button onClick={csv} className="btn">
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        }
      />
      <div className="p-6 lg:p-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <select
            className="input max-w-xs"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option>All</option>
            {[...new Set(demoLeaders.map((l) => l.department))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <div className="flex gap-3 text-xs">
            <span>● self-rated</span>
            <span>◇ inferred</span>
            <span>◆ demo</span>
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white p-4 text-left">
                  Leader
                </th>
                {allSkills.map((s) => (
                  <th
                    className="min-w-32 border-l border-forest/5 p-3 text-xs"
                    key={s}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaders.map((l) => (
                <tr className="border-t border-forest/10" key={l.id}>
                  <th className="sticky left-0 bg-white p-4 text-left">
                    <div>{l.fullName}</div>
                    <span className="text-xs font-normal text-ink/40">
                      {l.department}
                    </span>
                  </th>
                  {allSkills.map((s) => {
                    const rating = l.skills.find((x) => x[0] === s);
                    if (!rating)
                      return (
                        <td
                          className="border-l border-forest/5 p-3 text-center"
                          key={s}
                        >
                          <span className="text-ink/15">—</span>
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
                        className="border-l border-forest/5 p-3 text-center"
                        key={s}
                      >
                        <span
                          title={`${p} — ${labels[p]} · ${source.replace('_', ' ')}`}
                          className={`relative mx-auto block h-9 w-9 rounded-lg ${color[p]} ${source === 'inferred' ? 'border-2 border-dashed border-gold' : ''} leading-9`}
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
        </div>
      </div>
    </>
  );
}
