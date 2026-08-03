'use client';
import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui';
const steps = [
  'Basic info',
  'Experience',
  'Projects',
  'Skills & tools',
  'Certifications',
  'Career journey',
];
const levels = ['', 'Novice', 'Familiar', 'Proficient', 'Advanced', 'Expert'];
type RatedSkill = { name: string; proficiency: number };
type Draft = {
  fullName?: string;
  preferredName?: string;
  department?: string;
  jobTitle?: string;
  experience?: string;
  leadership?: string;
  projects?: string;
  tools?: string;
  certs?: string;
  journey?: string;
  ratedSkills: RatedSkill[];
};
type TextKey = Exclude<keyof Draft, 'ratedSkills'>;
export default function Wizard() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [data, setData] = useState<Draft>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skillmap-draft');
      if (saved) return JSON.parse(saved);
    }
    return { ratedSkills: [{ name: '', proficiency: 3 }] };
  });
  useEffect(() => {
    fetch('/api/profile')
      .then(async (response) => {
        if (!response.ok) return;
        const profile = await response.json();
        if (profile?.draftData) setData(profile.draftData);
        else if (profile)
          setData((current) => ({
            ...current,
            fullName: profile.fullName,
            preferredName: profile.preferredName || '',
            department: profile.department || '',
            jobTitle: profile.jobTitle || '',
          }));
      })
      .catch(() => undefined);
  }, []);
  const persist = (next: Draft) => {
    setData(next);
    localStorage.setItem('skillmap-draft', JSON.stringify(next));
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };
  const set = (k: TextKey, v: string) => persist({ ...data, [k]: v });
  const skills = data.ratedSkills;
  const updateSkill = (i: number, change: Partial<RatedSkill>) =>
    persist({
      ...data,
      ratedSkills: skills.map((s, n) => (n === i ? { ...s, ...change } : s)),
    });
  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fullName: data.fullName || '',
          ratedSkills: skills.filter((s) => s.name.trim()),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Submission failed');
      setMessage('Profile submitted with self-rated skill levels.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Self service"
        title="Build your capability profile"
        description="Your draft saves automatically. Skill levels you submit are recorded as self-rated."
        action={
          <span className="text-sm font-semibold text-moss">
            {saved ? 'Saved just now' : 'Draft autosave on'}
          </span>
        }
      />
      <div className="p-6 lg:p-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="card h-fit p-4">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm ${i === step ? 'bg-forest font-bold text-white' : i < step ? 'text-moss' : 'text-ink/50'}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full ${i === step ? 'bg-white/15' : 'bg-mint'}`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </span>
                {s}
              </button>
            ))}
          </aside>
          <section className="card p-7 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-moss">
              Step {step + 1} of {steps.length}
            </p>
            <h2 className="mt-2 text-2xl font-black">{steps[step]}</h2>
            <p className="mt-2 text-sm text-ink/50">
              Help colleagues understand where you can make the greatest impact.
            </p>
            <div className="mt-8 space-y-5">
              {step === 0 && (
                <>
                  <Field
                    label="Full name"
                    value={data.fullName}
                    onChange={(v) => set('fullName', v)}
                    placeholder="Your legal or full name"
                  />
                  <Field
                    label="Preferred name"
                    value={data.preferredName}
                    onChange={(v) => set('preferredName', v)}
                    placeholder="What colleagues call you"
                  />
                  <Field
                    label="Department"
                    value={data.department}
                    onChange={(v) => set('department', v)}
                    placeholder="Your department"
                  />
                  <Field
                    label="Job title"
                    value={data.jobTitle}
                    onChange={(v) => set('jobTitle', v)}
                    placeholder="Your current role"
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <Field
                    label="Total relevant experience"
                    value={data.experience}
                    onChange={(v) => set('experience', v)}
                    placeholder="e.g. 10+ years"
                  />
                  <Field
                    label="Leadership experience"
                    value={data.leadership}
                    onChange={(v) => set('leadership', v)}
                    placeholder="e.g. 6–10 years"
                  />
                </>
              )}
              {step === 2 && (
                <Area
                  label="Past projects, duration and your role"
                  value={data.projects}
                  onChange={(v) => set('projects', v)}
                  placeholder="Describe each project in your own words. We’ll structure it for you."
                />
              )}
              {step === 3 && (
                <>
                  <div>
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="font-bold">
                          Your skills and proficiency
                        </h3>
                        <p className="mt-1 text-xs text-ink/50">
                          Rate each skill: 1 Novice · 2 Familiar · 3 Proficient
                          · 4 Advanced · 5 Expert
                        </p>
                      </div>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          persist({
                            ...data,
                            ratedSkills: [
                              ...skills,
                              { name: '', proficiency: 3 },
                            ],
                          })
                        }
                      >
                        <Plus size={16} className="mr-1" />
                        Add skill
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {skills.map((skill, i) => (
                        <div
                          className="grid gap-2 rounded-xl border border-forest/10 p-3 sm:grid-cols-[1fr_210px_40px]"
                          key={i}
                        >
                          <input
                            aria-label={`Skill ${i + 1}`}
                            className="input"
                            value={skill.name}
                            onChange={(e) =>
                              updateSkill(i, { name: e.target.value })
                            }
                            placeholder="e.g. Azure"
                          />
                          <select
                            aria-label={`Proficiency for skill ${i + 1}`}
                            className="input"
                            value={skill.proficiency}
                            onChange={(e) =>
                              updateSkill(i, {
                                proficiency: Number(e.target.value),
                              })
                            }
                          >
                            {levels.slice(1).map((label, n) => (
                              <option value={n + 1} key={label}>
                                {n + 1} — {label}
                              </option>
                            ))}
                          </select>
                          <button
                            aria-label={`Remove skill ${i + 1}`}
                            className="text-red-700"
                            onClick={() =>
                              persist({
                                ...data,
                                ratedSkills: skills.filter((_, n) => n !== i),
                              })
                            }
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Field
                    label="Tools"
                    value={data.tools}
                    onChange={(v) => set('tools', v)}
                    placeholder="Comma-separated tools"
                  />
                </>
              )}
              {step === 4 && (
                <Area
                  label="Certifications"
                  value={data.certs}
                  onChange={(v) => set('certs', v)}
                  placeholder="e.g. PL-600, DP-700"
                />
              )}
              {step === 5 && (
                <Area
                  label="Career journey"
                  value={data.journey}
                  onChange={(v) => set('journey', v)}
                  placeholder="Share the roles and turning points that shaped your leadership."
                />
              )}
            </div>
            {message && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-mint p-3 text-sm font-semibold text-forest"
              >
                {message}
              </p>
            )}
            <div className="mt-9 flex justify-between">
              <button
                className="btn-ghost"
                disabled={step === 0}
                onClick={() => setStep((x) => x - 1)}
              >
                Back
              </button>
              <button
                className="btn"
                disabled={submitting}
                onClick={() => (step < 5 ? setStep((x) => x + 1) : submit())}
              >
                {step === 5
                  ? submitting
                    ? 'Submitting…'
                    : 'Submit profile'
                  : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
function Field({
  label,
  value = '',
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (x: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
function Area(p: {
  label: string;
  value?: string;
  onChange: (x: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{p.label}</span>
      <textarea
        rows={7}
        className="input resize-y"
        value={p.value || ''}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
      />
    </label>
  );
}
