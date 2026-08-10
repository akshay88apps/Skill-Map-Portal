'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CapabilityTagMultiSelect } from '@/components/capability-tag-multiselect';
import {
  Button,
  Empty,
  PageHeader,
  PanelHeader,
  RoleBadge,
  Stat,
  StatusBadge,
} from '@/components/ui';
type Leader = {
  id: string;
  fullName: string;
  email: string;
  department?: string;
  role: 'ADMIN' | 'LEADER' | 'VIEWER';
  profileStatus: string;
  skills: unknown[];
  additionalCapabilityTags: string[];
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
  const update = async (
    id: string,
    change: { profileStatus?: string; additionalCapabilityTags?: string[] },
  ) => {
    await fetch(`/api/admin/leaders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(change),
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
      <div className="page-shell space-y-6">
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
        <section className="card overflow-hidden">
          <PanelHeader
            title="Invite leaders"
            description="Enter work emails separated by commas. Each leader signs in with Microsoft SSO."
          />
          <div className="p-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                aria-label="Leader email addresses"
                className="input min-h-24 flex-1"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="leader1@company.com, leader2@company.com"
              />
              <Button
                className="md:self-end"
                onClick={invite}
                disabled={!emails.trim()}
              >
                Queue invitations
              </Button>
            </div>
            {message && (
              <p
                role="status"
                className="mt-4 rounded-control border border-info-700/20 bg-info-50 p-3 text-sm font-semibold text-info-700"
              >
                {message}
              </p>
            )}
          </div>
        </section>
        <section className="card overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th className="p-4">Leader</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Skills</th>
                <th className="min-w-64">Additional capability tags</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.id}>
                  <td className="p-4">
                    <b>{l.fullName}</b>
                    <br />
                    <span className="text-xs text-neutral-500">{l.email}</span>
                  </td>
                  <td>{l.department || '—'}</td>
                  <td>
                    <RoleBadge role={l.role} />
                  </td>
                  <td>
                    <StatusBadge status={l.profileStatus} />
                  </td>
                  <td>{l.skills.length}</td>
                  <td className="py-3 pr-4 align-top">
                    <CapabilityTagMultiSelect
                      value={l.additionalCapabilityTags || []}
                      onChange={(additionalCapabilityTags) => {
                        setLeaders((current) =>
                          current.map((leader) =>
                            leader.id === l.id
                              ? { ...leader, additionalCapabilityTags }
                              : leader,
                          ),
                        );
                        void update(l.id, { additionalCapabilityTags });
                      }}
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      Manually tagged · admin only
                    </p>
                  </td>
                  <td>
                    {l.profileStatus === 'SUBMITTED' ? (
                      <div className="flex gap-2">
                        <Button
                          className="px-3 py-2"
                          onClick={() =>
                            update(l.id, { profileStatus: 'PUBLISHED' })
                          }
                        >
                          Publish
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3 py-2"
                          onClick={() =>
                            update(l.id, { profileStatus: 'RETURNED' })
                          }
                        >
                          Return
                        </Button>
                      </div>
                    ) : l.profileStatus === 'PUBLISHED' ? (
                      <Button
                        variant="destructive"
                        className="px-3 py-2"
                        onClick={() =>
                          update(l.id, { profileStatus: 'DEACTIVATED' })
                        }
                      >
                        Deactivate
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leaders.length && (
            <div className="p-5">
              <Empty
                compact
                title="No leader records"
                body="Invite leaders to begin onboarding and capability tagging."
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
