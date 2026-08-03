'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Stat } from '@/components/ui';
type Leader = {
  id: string;
  fullName: string;
  email: string;
  department?: string;
  role: 'ADMIN' | 'LEADER' | 'VIEWER';
  profileStatus: string;
  skills: unknown[];
  updatedAt: string;
};
export default function Admin() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const load = () =>
    fetch('/api/admin/leaders')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLeaders)
      .catch(() =>
        setMessage(
          'Could not load HR workspace. Confirm your admin group assignment.',
        ),
      );
  useEffect(() => {
    void load();
  }, []);
  const counts = useMemo(
    () => ({
      invited: leaders.filter((x) => x.profileStatus === 'INVITED').length,
      draft: leaders.filter((x) => x.profileStatus === 'DRAFT').length,
      submitted: leaders.filter((x) => x.profileStatus === 'SUBMITTED').length,
      published: leaders.filter((x) => x.profileStatus === 'PUBLISHED').length,
    }),
    [leaders],
  );
  const invite = async () => {
    const list = emails.split(/[\s,;]+/).filter(Boolean);
    const r = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: list }),
    });
    const body = await r.json();
    setMessage(
      r.ok ? `${body.queued} invitation(s) queued for email.` : body.error,
    );
    if (r.ok) {
      setEmails('');
      load();
    }
  };
  const update = async (id: string, profileStatus: string) => {
    await fetch(`/api/admin/leaders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileStatus }),
    });
    load();
  };
  return (
    <>
      <PageHeader
        eyebrow="HR governance"
        title="Leader onboarding"
        description="Invite leaders, track completion, review submissions, and publish trusted profiles."
        action={
          <Link href="/admin/review" className="btn">
            Open AI review queue
          </Link>
        }
      />
      <div className="space-y-7 p-6 lg:p-10">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Invited" value={counts.invited} detail="Not started" />
          <Stat
            label="In progress"
            value={counts.draft}
            detail="Draft profiles"
          />
          <Stat
            label="Awaiting HR"
            value={counts.submitted}
            detail="Ready for review"
          />
          <Stat
            label="Published"
            value={counts.published}
            detail="Visible in directory"
          />
        </div>
        <section className="card p-6">
          <h2 className="text-lg font-bold">Invite leaders</h2>
          <p className="mt-1 text-sm text-ink/50">
            Enter work emails separated by commas. Each leader signs in with
            Microsoft SSO.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <textarea
              className="input min-h-24 flex-1"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="leader1@company.com, leader2@company.com"
            />
            <button
              className="btn md:self-end"
              onClick={invite}
              disabled={!emails.trim()}
            >
              Queue invitations
            </button>
          </div>
          {message && (
            <p role="status" className="mt-3 text-sm font-semibold text-moss">
              {message}
            </p>
          )}
        </section>
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b border-forest/10 text-left">
                <th className="p-4">Leader</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Skills</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.id} className="border-b border-forest/10">
                  <td className="p-4">
                    <b>{l.fullName}</b>
                    <br />
                    <span className="text-xs text-ink/45">{l.email}</span>
                  </td>
                  <td>{l.department || '—'}</td>
                  <td>{l.role.toLowerCase()}</td>
                  <td>
                    <span className="pill bg-mint text-forest">
                      {l.profileStatus.toLowerCase()}
                    </span>
                  </td>
                  <td>{l.skills.length}</td>
                  <td>
                    {l.profileStatus === 'SUBMITTED' ? (
                      <div className="flex gap-2">
                        <button
                          className="btn px-3 py-2"
                          onClick={() => update(l.id, 'PUBLISHED')}
                        >
                          Publish
                        </button>
                        <button
                          className="btn-ghost px-3 py-2"
                          onClick={() => update(l.id, 'RETURNED')}
                        >
                          Return
                        </button>
                      </div>
                    ) : l.profileStatus === 'PUBLISHED' ? (
                      <button
                        className="btn-ghost px-3 py-2"
                        onClick={() => update(l.id, 'DEACTIVATED')}
                      >
                        Deactivate
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leaders.length && (
            <p className="p-8 text-center text-sm text-ink/45">
              No leader records are available yet.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
