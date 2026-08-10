'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Empty, PageHeader } from '@/components/ui';
import { useLiveLeaders } from '@/lib/use-live-leaders';
import {
  capabilityNames,
  capabilitiesForLeader,
} from '@/lib/capabilities';
export default function Directory() {
  const { leaders, loading } = useLiveLeaders();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const [capability, setCapability] = useState('All');
  const rows = useMemo(
    () =>
      leaders.filter((l) => {
        const leaderCapabilities = capabilitiesForLeader({
          id: l.id,
          skills: l.skills.map((skill) => ({
            skill: { category: skill[3] },
          })),
          additionalCapabilityTags: l.additionalCapabilityTags,
        });
        return (
          (dept === 'All' || l.department === dept) &&
          (capability === 'All' || leaderCapabilities.includes(capability)) &&
          `${l.fullName} ${l.jobTitle} ${leaderCapabilities.join(' ')} ${l.skills.flat().join(' ')}`
            .toLowerCase()
            .includes(q.toLowerCase())
        );
      }),
    [q, dept, capability, leaders],
  );
  return (
    <>
      <PageHeader
        eyebrow="People & expertise"
        title="Leader directory"
        description="Find the right leader by capability, experience, or business area."
      />
      <div className="page-shell">
        <div className="card mb-6 flex flex-col gap-3 p-4 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 text-neutral-500" size={18} />
            <input
              aria-label="Search leaders"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input pl-11"
              placeholder="Search people, skills, or roles…"
            />
          </label>
          <label className="relative">
            <SlidersHorizontal
              className="absolute left-3 top-3 text-neutral-500"
              size={18}
            />
            <select
              aria-label="Department"
              className="input pl-11"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option>All</option>
              {[...new Set(leaders.map((l) => l.department))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Capability</span>
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
          </label>
        </div>
        <p className="mb-4 text-sm text-neutral-600">
          {loading ? 'Loading live profiles…' : `${rows.length} leaders found`}
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <Link
              href={`/directory/${l.id}`}
              key={l.id}
              className="card group p-5 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-panel bg-primary-900 text-base font-semibold text-neutral-50">
                  {l.fullName
                    .split(' ')
                    .map((x) => x[0])
                    .join('')}
                </div>
                <div>
                  <h2 className="text-base font-semibold group-hover:text-moss">
                    {l.fullName}
                  </h2>
                  <p className="text-sm text-neutral-600">{l.jobTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-moss">
                    {l.department}
                  </p>
                </div>
              </div>
              <div className="my-5 h-px bg-forest/10" />
              <div className="flex flex-wrap gap-2">
                {l.skills.slice(0, 4).map(([s, p]) => (
                  <span key={s} className="pill bg-mint text-forest">
                    {s}
                    <span className="ml-1 text-primary-700">· {p}/5</span>
                  </span>
                ))}
              </div>
              <div className="mt-5 flex gap-5 text-xs text-neutral-600">
                <span>
                  <b className="text-ink">{l.experienceYearsEstimate}</b> yrs
                  experience
                </span>
                <span>
                  <b className="text-ink">{l.projects}</b> projects
                </span>
              </div>
            </Link>
          ))}
          {!loading && !rows.length && (
            <div className="md:col-span-2 xl:col-span-3">
              <Empty
                title="No matching leaders"
                body="Adjust the search, department, or capability filter to broaden the results."
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
