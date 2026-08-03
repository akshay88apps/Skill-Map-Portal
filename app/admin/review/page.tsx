'use client';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PageHeader, Empty } from '@/components/ui';
const seed = [
  {
    id: '1',
    type: 'Project',
    value: 'Cloud migration program — Solution Lead — 14 months',
    confidence: 0.64,
    person: 'Aarav Sharma',
  },
  {
    id: '2',
    type: 'Skill',
    value: 'Gen AI Architecture',
    confidence: 0.58,
    person: 'Meera Iyer',
  },
  {
    id: '3',
    type: 'Certification',
    value: 'Microsoft PL 600',
    confidence: 0.69,
    person: 'Kabir Singh',
  },
];
export default function Review() {
  const [rows, setRows] = useState(seed);
  const act = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  return (
    <>
      <PageHeader
        eyebrow="AI governance"
        title="Review queue"
        description="Human verification for extracted records below the 70% confidence threshold."
      />
      <div className="p-6 lg:p-10">
        {!rows.length ? (
          <Empty
            title="Queue cleared"
            body="All extracted records have been reviewed."
          />
        ) : (
          <div className="card overflow-hidden">
            {rows.map((r) => (
              <div
                className="flex flex-col gap-4 border-b border-forest/10 p-5 last:border-0 md:flex-row md:items-center"
                key={r.id}
              >
                <span className="pill w-fit bg-gold/20 text-ink">
                  {Math.round(r.confidence * 100)}% confidence
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-moss">
                    {r.type} · {r.person}
                  </p>
                  <input
                    aria-label={`Edit ${r.type}`}
                    className="mt-2 w-full bg-transparent font-semibold outline-none"
                    defaultValue={r.value}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(r.id)}
                    className="btn-ghost text-red-700"
                  >
                    <X size={16} className="mr-1" />
                    Reject
                  </button>
                  <button onClick={() => act(r.id)} className="btn">
                    <Check size={16} className="mr-1" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
