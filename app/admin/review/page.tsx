'use client';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { PageHeader, Empty } from '@/components/ui';
type Review = {
  id: string;
  entityType: string;
  payload: Record<string, unknown>;
  confidence: number;
  createdAt: string;
};
export default function Review() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () =>
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const act = async (
    id: string,
    action: 'approve' | 'reject',
    payload?: Record<string, unknown>,
  ) => {
    await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    setRows((r) => r.filter((x) => x.id !== id));
  };
  return (
    <>
      <PageHeader
        eyebrow="AI governance"
        title="Review queue"
        description="Human verification for extracted records below the 70% confidence threshold."
      />
      <div className="p-6 lg:p-10">
        {loading ? (
          <p>Loading review queue…</p>
        ) : !rows.length ? (
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
                    {r.entityType}
                  </p>
                  <textarea
                    aria-label={`Edit ${r.entityType}`}
                    className="input mt-2 min-h-20"
                    defaultValue={JSON.stringify(r.payload, null, 2)}
                    onChange={(e) => {
                      try {
                        r.payload = JSON.parse(e.target.value);
                      } catch {}
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(r.id, 'reject')}
                    className="btn-ghost text-red-700"
                  >
                    <X size={16} className="mr-1" />
                    Reject
                  </button>
                  <button
                    onClick={() => act(r.id, 'approve', r.payload)}
                    className="btn"
                  >
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
