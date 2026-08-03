import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Briefcase, Mail } from 'lucide-react';
import { demoLeaders } from '@/lib/demo';
export default function Profile({ params }: { params: { id: string } }) {
  const l = demoLeaders.find((x) => x.id === params.id);
  if (!l) notFound();
  return (
    <div>
      <div className="bg-forest px-6 py-10 text-white lg:px-10">
        <Link
          href="/directory"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60"
        >
          <ArrowLeft size={16} /> Directory
        </Link>
        <div className="flex flex-col gap-5 md:flex-row md:items-end">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-[#9fd9bd] text-3xl font-black text-forest">
            {l.fullName
              .split(' ')
              .map((x) => x[0])
              .join('')}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#9fd9bd]">
              {l.department}
            </p>
            <h1 className="mt-1 text-4xl font-black">{l.fullName}</h1>
            <p className="mt-2 text-white/65">{l.jobTitle}</p>
          </div>
          <a
            className="btn bg-white text-forest hover:bg-mint"
            href={`mailto:${l.email}`}
          >
            <Mail size={16} className="mr-2" /> Connect
          </a>
        </div>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-10">
        <div className="space-y-6">
          <section className="card p-7">
            <h2 className="text-xl font-bold">Capability profile</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">
              Technology leader focused on building reliable platforms, capable
              teams, and measurable business outcomes.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {l.skills.map(([s, p, source]) => (
                <div className="rounded-xl border border-forest/10 p-4" key={s}>
                  <div className="flex justify-between">
                    <b className="text-sm">{s}</b>
                    <span className="text-xs font-bold text-moss">
                      {p}/5 · {source.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded bg-mint">
                    <div
                      className="h-full rounded bg-moss"
                      style={{ width: `${p * 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-bold">Career journey</h2>
            <div className="mt-6 border-l-2 border-mint pl-6">
              <h3 className="font-bold">{l.jobTitle}</h3>
              <p className="text-sm text-moss">Current · MoreYeahs</p>
              <p className="mt-2 text-sm text-ink/55">
                Leading strategy, delivery, and capability development across{' '}
                {l.department}.
              </p>
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <div className="card p-6">
            <h2 className="font-bold">At a glance</h2>
            <div className="mt-5 space-y-4 text-sm">
              <p className="flex items-center gap-3">
                <Briefcase className="text-moss" size={18} />
                <span>
                  <b>{l.experienceYearsEstimate} years</b>
                  <br />
                  <span className="text-xs text-ink/45">
                    Relevant experience
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Award className="text-moss" size={18} />
                <span>
                  <b>{l.certs} certifications</b>
                  <br />
                  <span className="text-xs text-ink/45">
                    Verified credentials
                  </span>
                </span>
              </p>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-bold">Profile health</h2>
            <p className="mt-2 text-3xl font-black text-moss">92%</p>
            <div className="mt-2 h-2 rounded bg-mint">
              <div className="h-full w-[92%] rounded bg-moss" />
            </div>
            <p className="mt-3 text-xs text-ink/45">Updated {l.updatedAt}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
