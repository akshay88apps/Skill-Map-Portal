import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Briefcase, Mail, Target } from 'lucide-react';
import { db } from '@/lib/db';
import { currentIdentity } from '@/lib/authz';
import { Empty } from '@/components/ui';
import {
  careerTimeframeLabel,
  proficiencyComparison,
} from '@/lib/career-aspiration';
import { formatExperienceYearsEstimate } from '@/lib/experience';
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
      careerAspiration: {
        include: { targetSkills: { include: { skill: true } } },
      },
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
  const isOwner = user.leaderId === row.id;
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
    row.careerAspiration?.targetRole,
    row.careerAspiration?.targetSkills.length,
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
          {isOwner && (
            <section className="card p-7">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-control bg-primary-100 text-primary-700">
                  <Target size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Career aspiration</h2>
                  <p className="text-sm text-neutral-600">
                    Your current proficiency compared with your target.
                  </p>
                </div>
              </div>
              {row.careerAspiration?.targetRole ? (
                <div className="mt-6 space-y-5">
                  <dl className="grid gap-4 rounded-panel border border-neutral-200 bg-neutral-100/60 p-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Next milestone
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {row.careerAspiration.targetRole}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Target timeframe
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {careerTimeframeLabel(
                          row.careerAspiration.targetTimeframe,
                        ) || 'Not selected'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Target capability
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {row.careerAspiration.targetCapability || 'Not selected'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Secondary interest
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {row.careerAspiration.secondaryCapability || 'None'}
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Skill targets
                    </h3>
                    <div className="mt-3 space-y-3">
                      {row.careerAspiration.targetSkills.map((target) => {
                        const current = row.skills.find(
                          (rating) =>
                            rating.skillId === target.skillId &&
                            rating.source === 'SELF_REPORTED',
                        );
                        return (
                          <div
                            className="rounded-control border border-neutral-200 p-4"
                            key={target.skillId}
                          >
                            <p className="font-semibold">{target.skill.name}</p>
                            <p className="mt-1 text-sm text-neutral-600">
                              {proficiencyComparison(
                                current?.proficiency,
                                target.targetProficiency,
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {row.careerAspiration.notes && (
                    <p className="text-sm leading-6 text-neutral-600">
                      {row.careerAspiration.notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5">
                  <Empty
                    compact
                    title="No career aspiration yet"
                    body="Complete Step 6 of your profile to define a measurable next milestone."
                    href="/my-profile"
                    label="Add career aspiration"
                  />
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold">At a glance</h2>
            <div className="mt-5 space-y-4 text-sm">
              <p className="flex items-center gap-3">
                <Briefcase className="text-moss" size={18} />
                <span>
                  <b>
                    {formatExperienceYearsEstimate(
                      l.experienceYearsEstimate,
                    )}{' '}
                    years
                  </b>
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
