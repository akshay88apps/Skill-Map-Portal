'use client';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge, Button, Empty, PageHeader } from '@/components/ui';
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
        eyebrow="Taxonomy governance"
        title="Review queue"
        description="Human verification for unmatched extracted terms and leader-requested additions to the HR taxonomy."
      />
      <div className="page-shell">
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
                className="flex flex-col gap-4 border-b border-neutral-200 p-5 last:border-0 md:flex-row md:items-center"
                key={r.id}
              >
                <Badge tone="warning">
                  {Math.round(r.confidence * 100)}% confidence
                </Badge>
                <div className="flex-1">
                  <p className="eyebrow">
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
                  <Button
                    variant="destructive"
                    onClick={() => act(r.id, 'reject')}
                  >
                    <X size={16} className="mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => act(r.id, 'approve', r.payload)}
                  >
                    <Check size={16} className="mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
