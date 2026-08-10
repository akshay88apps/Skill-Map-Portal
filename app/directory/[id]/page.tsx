import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Briefcase, Mail } from 'lucide-react';
import { db } from '@/lib/db';
import { currentIdentity } from '@/lib/authz';
import { Empty } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Profile(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await currentIdentity();
  if (!user) notFound();
  const row = await db.leader.findFirst({
    where: {
      id: params.id,
      ...(user.role === 'ADMIN' ? {} : { profileStatus: 'PUBLISHED' }),
    },
    include: {
      skills: { include: { skill: true } },
      projects: true,
      certifications: {
        select: {
          id: true,
          name: true,
          attachmentFileName: true,
          attachmentContentType: true,
          attachmentBlobName: true,
        },
      },
    },
  });
  if (!row) notFound();
  const l = {
    ...row,
    preferredName: row.preferredName || row.fullName,
    department: row.department || 'Unassigned',
    jobTitle: row.jobTitle || 'Leader',
    experienceYearsEstimate: row.experienceYearsEstimate || 0,
    leadershipBracketRaw: row.leadershipBracketRaw || '',
    skills: row.skills.map(
      (x) => [x.skill.name, x.proficiency, x.ratingSource] as const,
    ),
    projects: row.projects.length,
    certs: row.certifications.length,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
  const profileSignals = [
    row.fullName,
    row.email,
    row.department,
    row.jobTitle,
    row.experienceRaw,
    row.careerJourneyRaw,
    row.skills.length,
    row.projects.length,
    row.certifications.length,
  ];
  const profileHealth = Math.round(
    (profileSignals.filter(Boolean).length / profileSignals.length) * 100,
  );
  return (
    <div>
      <div className="bg-primary-900 text-neutral-50">
        <div className="mx-auto max-w-[var(--page-max-width)] px-5 py-8 md:px-6 lg:px-8">
        <Link
          href="/directory"
          className="mb-6 inline-flex items-center gap-2 rounded-control text-sm text-neutral-50/75 hover:text-neutral-50"
        >
          <ArrowLeft size={16} /> Directory
        </Link>
        <div className="flex flex-col gap-5 md:flex-row md:items-end">
          <div className="grid h-20 w-20 place-items-center rounded-panel bg-primary-300 text-2xl font-semibold text-primary-900">
            {l.fullName
              .split(' ')
              .map((x) => x[0])
              .join('')}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-300">
              {l.department}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{l.fullName}</h1>
            <p className="mt-1 text-neutral-50/75">{l.jobTitle}</p>
          </div>
          <a
            className="btn-secondary border-neutral-50 bg-neutral-50 text-primary-900 hover:bg-primary-50"
            href={`mailto:${l.email}`}
          >
            <Mail size={16} className="mr-2" /> Connect
          </a>
        </div>
        </div>
      </div>
      <div className="page-shell grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-7">
            <h2 className="text-xl font-semibold">Capability profile</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Technology leader focused on building reliable platforms, capable
              teams, and measurable business outcomes.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {l.skills.map(([s, p, source]) => (
                <div className="rounded-control border border-neutral-200 p-4" key={s}>
                  <div className="flex justify-between">
                    <b className="text-sm">{s}</b>
                    <span className="text-xs font-bold text-moss">
                      {p}/5 · {source.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="progress-track mt-3">
                    <div
                      className="progress-value"
                      style={{ width: `${p * 20}%` }}
                    />
                  </div>
                </div>
              ))}
              {!l.skills.length && (
                <div className="sm:col-span-2">
                  <Empty
                    compact
                    title="No skills published"
                    body="This leader’s capability evidence has not been published yet."
                  />
                </div>
              )}
            </div>
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-semibold">Certifications</h2>
            {row.certifications.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {row.certifications.map((certification) => (
                  <article
                    className="overflow-hidden rounded-panel border border-neutral-200 bg-neutral-50"
                    key={certification.id}
                  >
                    {certification.attachmentBlobName &&
                    certification.attachmentContentType?.startsWith(
                      'image/',
                    ) ? (
                      <a
                        href={`/api/certifications/${certification.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View certificate for ${certification.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="h-40 w-full bg-neutral-100 object-contain"
                          src={`/api/certifications/${certification.id}/file`}
                          alt={`Certificate for ${certification.name}`}
                        />
                      </a>
                    ) : (
                      <div className="grid h-40 place-items-center bg-neutral-100 text-neutral-500">
                        <Award size={28} aria-hidden="true" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold">
                        {certification.name}
                      </h3>
                      {certification.attachmentBlobName && (
                        <a
                          className="mt-2 inline-flex text-xs font-semibold text-primary-700 hover:underline"
                          href={`/api/certifications/${certification.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View certificate
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <Empty
                  compact
                  title="No certifications published"
                  body="This leader has not added certification evidence yet."
                />
              </div>
            )}
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-semibold">Career journey</h2>
            <div className="mt-6 border-l-2 border-mint pl-6">
              <h3 className="font-semibold">{l.jobTitle}</h3>
              <p className="text-sm text-moss">Current · MoreYeahs</p>
              <p className="mt-2 text-sm text-neutral-600">
                Leading strategy, delivery, and capability development across{' '}
                {l.department}.
              </p>
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold">At a glance</h2>
            <div className="mt-5 space-y-4 text-sm">
              <p className="flex items-center gap-3">
                <Briefcase className="text-moss" size={18} />
                <span>
                  <b>{l.experienceYearsEstimate} years</b>
                  <br />
                  <span className="text-xs text-neutral-600">
                    Relevant experience
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Award className="text-moss" size={18} />
                <span>
                  <b>{l.certs} certifications</b>
                  <br />
                  <span className="text-xs text-neutral-600">
                    Verified credentials
                  </span>
                </span>
              </p>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold">Profile health</h2>
            <p className="mt-2 text-3xl font-semibold text-primary-700">
              {profileHealth}%
            </p>
            <div className="progress-track mt-2">
              <div
                className="progress-value"
                style={{ width: `${profileHealth}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-neutral-600">
              Updated {l.updatedAt}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
