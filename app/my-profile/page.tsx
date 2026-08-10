'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Plus, Trash2, Upload } from 'lucide-react';
import {
  OTHER_TAXONOMY_VALUE,
  TaxonomyCombobox,
} from '@/components/taxonomy-combobox';
import { Button, PageHeader } from '@/components/ui';
import { departmentOptions, isDepartment } from '@/lib/departments';
import {
  CERTIFICATION_PDF_TYPE,
  isCertificationFileType,
  isCertificationImageType,
  MAX_CERTIFICATION_IMAGE_BYTES,
  MAX_CERTIFICATION_PDF_BYTES,
} from '@/lib/certification-file-policy';
import { isTaxonomyName, resolveTaxonomyTerm } from '@/lib/taxonomy';
import {
  canonicalExperienceDuration,
  formatExperienceDuration,
  isExperienceDuration,
  parseExperienceDuration,
} from '@/lib/experience';
import {
  careerTimeframeOptions,
  isCareerTimeframe,
  type CareerTimeframe,
} from '@/lib/career-aspiration';
const steps = [
  'Basic info',
  'Experience',
  'Projects',
  'Skills',
  'Certifications',
  'Career Aspiration',
];
const levels = ['', 'Novice', 'Familiar', 'Proficient', 'Advanced', 'Expert'];
type RatedSkill = { name: string; proficiency: number; otherName?: string };
export type DraftAspirationSkill = {
  name: string;
  targetProficiency: number;
};
export type DraftCareerAspiration = {
  targetCapability?: string;
  targetRole?: string;
  targetSkills: DraftAspirationSkill[];
  targetTimeframe?: CareerTimeframe | '';
  secondaryCapability?: string;
  notes?: string;
};
export type DraftProject = {
  name: string;
  description: string;
  techStack: string[];
};
export type DraftCertification = {
  clientId: string;
  id?: string;
  name: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  attachmentSize?: number;
  hasAttachment?: boolean;
};
type Draft = {
  fullName?: string;
  preferredName?: string;
  department?: string;
  jobTitle?: string;
  experience?: string;
  leadership?: string;
  projects: DraftProject[];
  certifications: DraftCertification[];
  careerAspiration: DraftCareerAspiration;
  ratedSkills: RatedSkill[];
};
type TextKey = Exclude<
  keyof Draft,
  'ratedSkills' | 'projects' | 'certifications'
>;

type LegacyDraft = Omit<Partial<Draft>, 'projects'> & {
  tools?: unknown;
  otherTools?: unknown;
  projects?: unknown;
  certs?: unknown;
  journey?: unknown;
};

function newCertificationId() {
  return `cert-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function certificationsFromProfile(profile: {
  certifications?: Array<{
    id: string;
    name: string;
    attachmentFileName?: string | null;
    attachmentContentType?: string | null;
    attachmentSize?: number | null;
    attachmentBlobName?: string | null;
  }>;
}): DraftCertification[] {
  return (profile.certifications || []).map((certification) => ({
    clientId: certification.id,
    id: certification.id,
    name: certification.name,
    attachmentFileName: certification.attachmentFileName || undefined,
    attachmentContentType: certification.attachmentContentType || undefined,
    attachmentSize: certification.attachmentSize || undefined,
    hasAttachment: Boolean(certification.attachmentBlobName),
  }));
}

function careerAspirationFromProfile(profile: {
  careerAspiration?: {
    targetCapability?: string | null;
    targetRole?: string | null;
    targetTimeframe?: string | null;
    secondaryCapability?: string | null;
    notes?: string | null;
    targetSkills?: Array<{
      targetProficiency: number;
      skill: { name: string };
    }>;
  } | null;
}): DraftCareerAspiration {
  const aspiration = profile.careerAspiration;
  return {
    targetCapability: isDepartment(aspiration?.targetCapability)
      ? aspiration.targetCapability
      : '',
    targetRole: aspiration?.targetRole || '',
    targetSkills: (aspiration?.targetSkills || [])
      .filter((target) => isTaxonomyName(target.skill.name))
      .map((target) => ({
        name: target.skill.name,
        targetProficiency: target.targetProficiency,
      })),
    targetTimeframe: isCareerTimeframe(aspiration?.targetTimeframe)
      ? aspiration.targetTimeframe
      : '',
    secondaryCapability: isDepartment(aspiration?.secondaryCapability)
      ? aspiration.secondaryCapability
      : '',
    notes: aspiration?.notes || '',
  };
}

export function normalizedDraft(raw: LegacyDraft): Draft {
  const profileDraft = { ...raw };
  delete profileDraft.tools;
  delete profileDraft.otherTools;
  delete profileDraft.certs;
  delete profileDraft.journey;
  const ratedSkills = (raw.ratedSkills || []).map((skill) => {
    if (isTaxonomyName(skill.name))
      return skill;
    if (skill.name === OTHER_TAXONOMY_VALUE && skill.otherName?.trim())
      return skill;
    const match = resolveTaxonomyTerm(skill.name);
    return match
      ? { ...skill, name: match.name }
      : { ...skill, name: '', otherName: undefined };
  });
  const projects: DraftProject[] = Array.isArray(raw.projects)
    ? raw.projects.map((project) => {
        const value = project as Partial<DraftProject>;
        return {
          name: value.name || '',
          description: value.description || '',
          techStack: (value.techStack || []).filter(isTaxonomyName),
        };
      })
    : typeof raw.projects === 'string' && raw.projects.trim()
      ? [
          {
            name: 'Previous project',
            description: raw.projects.trim(),
            techStack: [],
          },
        ]
      : [];
  const certifications: DraftCertification[] = Array.isArray(
    raw.certifications,
  )
    ? raw.certifications.map((certification) => ({
        clientId: certification.clientId || certification.id || newCertificationId(),
        id: certification.id,
        name: certification.name || '',
        attachmentFileName: certification.attachmentFileName,
        attachmentContentType: certification.attachmentContentType,
        attachmentSize: certification.attachmentSize,
        hasAttachment: certification.hasAttachment,
      }))
    : typeof raw.certs === 'string'
      ? raw.certs
          .split(/[,;|\n]+/)
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ clientId: newCertificationId(), name }))
      : [];
  const rawAspiration: Partial<DraftCareerAspiration> =
    raw.careerAspiration || {
      notes:
        typeof raw.journey === 'string'
          ? raw.journey.trim().slice(0, 300)
          : '',
    };
  const careerAspiration: DraftCareerAspiration = {
    targetCapability: isDepartment(rawAspiration.targetCapability)
      ? rawAspiration.targetCapability
      : '',
    targetRole: rawAspiration.targetRole || '',
    targetSkills: (rawAspiration.targetSkills || [])
      .filter(
        (target) =>
          isTaxonomyName(target.name) &&
          Number.isInteger(target.targetProficiency) &&
          target.targetProficiency >= 1 &&
          target.targetProficiency <= 5,
      )
      .map((target) => ({
        name: target.name,
        targetProficiency: target.targetProficiency,
      })),
    targetTimeframe: isCareerTimeframe(rawAspiration.targetTimeframe)
      ? rawAspiration.targetTimeframe
      : '',
    secondaryCapability: isDepartment(rawAspiration.secondaryCapability)
      ? rawAspiration.secondaryCapability
      : '',
    notes: (rawAspiration.notes || '').slice(0, 300),
  };
  return {
    ...profileDraft,
    experience: canonicalExperienceDuration(raw.experience),
    department: isDepartment(raw.department) ? raw.department : '',
    projects,
    certifications,
    careerAspiration,
    ratedSkills: ratedSkills.length
      ? ratedSkills
      : [{ name: '', proficiency: 3 }],
  } as Draft;
}
export default function Wizard() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [certificationFiles, setCertificationFiles] = useState<
    Record<string, File>
  >({});
  const [data, setData] = useState<Draft>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skillmap-draft');
      if (saved) return normalizedDraft(JSON.parse(saved));
    }
    return {
      projects: [],
      certifications: [],
      careerAspiration: { targetSkills: [] },
      ratedSkills: [{ name: '', proficiency: 3 }],
    };
  });
  useEffect(() => {
    fetch('/api/profile')
      .then(async (response) => {
        if (!response.ok) return;
        const profile = await response.json();
        if (profile?.draftData) {
          const draft = normalizedDraft(profile.draftData);
          if (
            !Object.prototype.hasOwnProperty.call(
              profile.draftData,
              'certifications',
            )
          )
            draft.certifications = certificationsFromProfile(profile);
          setData(draft);
        }
        else if (profile)
          setData((current) => ({
            ...current,
            fullName: profile.fullName,
            preferredName: profile.preferredName || '',
            department: isDepartment(profile.department)
              ? profile.department
              : '',
            jobTitle: profile.jobTitle || '',
            experience: canonicalExperienceDuration(profile.experienceRaw),
            leadership: profile.leadershipBracketRaw || '',
            projects: (profile.projects || []).map(
              (project: {
                name: string;
                description?: string | null;
                rawText?: string | null;
                techStack?: string[];
              }) => ({
                name: project.name,
                description: project.description || project.rawText || '',
                techStack: (project.techStack || []).filter(isTaxonomyName),
              }),
            ),
            certifications: certificationsFromProfile(profile),
            careerAspiration: careerAspirationFromProfile(profile),
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
      const payload = {
        ...data,
        fullName: data.fullName || '',
        ratedSkills: skills
          .filter((skill) => isTaxonomyName(skill.name))
          .map(({ name, proficiency }) => ({ name, proficiency })),
        otherSkills: skills
          .filter(
            (skill) =>
              skill.name === OTHER_TAXONOMY_VALUE && skill.otherName?.trim(),
          )
          .map((skill) => ({
            name: skill.otherName!.trim(),
            proficiency: skill.proficiency,
          })),
      };
      const form = new FormData();
      form.append('profile', JSON.stringify(payload));
      for (const [clientId, file] of Object.entries(certificationFiles))
        form.append(`certificationFile.${clientId}`, file, file.name);

      const response = await fetch('/api/profile', {
        method: 'POST',
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Submission failed');
      if (Array.isArray(body.certifications)) {
        const next = { ...data, certifications: body.certifications };
        setData(next);
        localStorage.setItem('skillmap-draft', JSON.stringify(next));
      }
      setCertificationFiles({});
      setMessage(
        'Profile submitted. Taxonomy skills were saved and any “Other” skill was sent for HR review.',
      );
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
      <div className="page-shell">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="card h-fit p-4">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 rounded-control p-3 text-left text-sm transition-colors ${i === step ? 'bg-primary-900 font-semibold text-neutral-50' : i < step ? 'text-primary-700 hover:bg-primary-50' : 'text-neutral-500 hover:bg-neutral-100'}`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${i === step ? 'bg-neutral-50/15' : 'bg-primary-100'}`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </span>
                {s}
              </button>
            ))}
          </aside>
          <section className="card p-6 lg:p-8">
            <p className="eyebrow">
              Step {step + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{steps[step]}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Help colleagues understand where you can make the greatest impact.
            </p>
            {(step === 0 || step === 3) && (
              <a
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 underline-offset-4 hover:underline"
                href="/#capability-map"
                target="_blank"
                rel="noreferrer"
              >
                How this works: view the capability map
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
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
                  <DepartmentField
                    label="Department"
                    value={data.department}
                    onChange={(v) => set('department', v)}
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
                  <ExperienceDurationField
                    value={data.experience}
                    onChange={(v) => set('experience', v)}
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
                <ProjectsField
                  projects={data.projects}
                  onChange={(projects) => persist({ ...data, projects })}
                />
              )}
              {step === 3 && (
                <div>
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="font-semibold">
                          Your skills and proficiency
                        </h3>
                        <p className="mt-1 text-xs text-neutral-600">
                          Rate each skill: 1 Novice · 2 Familiar · 3 Proficient
                          · 4 Advanced · 5 Expert
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
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
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {skills.map((skill, i) => (
                        <div
                          className="grid gap-2 rounded-panel border border-neutral-200 bg-neutral-100/60 p-3 sm:grid-cols-[1fr_210px_40px]"
                          key={i}
                        >
                          <div className="space-y-2">
                            <TaxonomyCombobox
                              label={`Skill ${i + 1}`}
                              value={skill.name}
                              excluded={skills
                                .filter((_, index) => index !== i)
                                .map((selected) => selected.name)
                                .filter(isTaxonomyName)}
                              onSelect={(name) =>
                                updateSkill(i, {
                                  name,
                                  otherName:
                                    name === OTHER_TAXONOMY_VALUE
                                      ? skill.otherName || ''
                                      : undefined,
                                })
                              }
                            />
                            {skill.name === OTHER_TAXONOMY_VALUE && (
                              <input
                                aria-label={`Other skill ${i + 1}`}
                                className="input"
                                value={skill.otherName || ''}
                                onChange={(event) =>
                                  updateSkill(i, {
                                    otherName: event.target.value,
                                  })
                                }
                                placeholder="Specify the missing skill for HR review"
                              />
                            )}
                          </div>
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
                            type="button"
                            aria-label={`Remove skill ${i + 1}`}
                            className="icon-button-destructive"
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
              )}
              {step === 4 && (
                <CertificationsField
                  certifications={data.certifications}
                  files={certificationFiles}
                  onChange={(certifications) =>
                    persist({ ...data, certifications })
                  }
                  onFileChange={(clientId, file) =>
                    setCertificationFiles((current) => {
                      const next = { ...current };
                      if (file) next[clientId] = file;
                      else delete next[clientId];
                      return next;
                    })
                  }
                />
              )}
              {step === 5 && (
                <CareerAspirationField
                  value={data.careerAspiration}
                  onChange={(careerAspiration) =>
                    persist({ ...data, careerAspiration })
                  }
                />
              )}
            </div>
            {message && (
              <p
                role="status"
                className="mt-6 rounded-control border border-success-700/20 bg-success-50 p-3 text-sm font-semibold text-success-700"
              >
                {message}
              </p>
            )}
            <div className="mt-8 flex justify-between">
              <Button
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep((x) => x - 1)}
              >
                Back
              </Button>
              <Button
                disabled={
                  submitting ||
                  (step === 1 && !isExperienceDuration(data.experience)) ||
                  (step === 4 &&
                    data.certifications.some(
                      (certification) => !certification.name.trim(),
                    )) ||
                  (step === 5 &&
                    (!data.careerAspiration.targetRole?.trim() ||
                      !isCareerTimeframe(
                        data.careerAspiration.targetTimeframe,
                      ) ||
                      !data.careerAspiration.targetSkills.length ||
                      data.careerAspiration.targetSkills.some(
                        (target) =>
                          !isTaxonomyName(target.name) ||
                          target.targetProficiency < 1 ||
                          target.targetProficiency > 5,
                      )))
                }
                onClick={() => (step < 5 ? setStep((x) => x + 1) : submit())}
              >
                {step === 5
                  ? submitting
                    ? 'Submitting…'
                    : 'Submit profile'
                  : 'Continue'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
const experienceYears = Array.from({ length: 41 }, (_, year) => year);
const experienceMonths = Array.from({ length: 13 }, (_, month) => month);

export function ExperienceDurationField({
  value = '',
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const initial = parseExperienceDuration(canonicalExperienceDuration(value));
  const [years, setYears] = useState(initial ? String(initial.years) : '');
  const [months, setMonths] = useState(initial ? String(initial.months) : '');
  const previousValue = useRef(value);

  useEffect(() => {
    if (value === previousValue.current) return;
    previousValue.current = value;
    const parsed = parseExperienceDuration(canonicalExperienceDuration(value));
    setYears(parsed ? String(parsed.years) : '');
    setMonths(parsed ? String(parsed.months) : '');
  }, [value]);

  const update = (nextYears: string, nextMonths: string) => {
    setYears(nextYears);
    setMonths(nextMonths);
    onChange(
      nextYears !== '' && nextMonths !== ''
        ? formatExperienceDuration(Number(nextYears), Number(nextMonths))
        : '',
    );
  };

  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-neutral-800">
        Total relevant experience <span className="text-error-700">*</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-neutral-600">
            Years
          </span>
          <select
            required
            aria-label="Total relevant experience years"
            className="input"
            value={years}
            onChange={(event) => update(event.target.value, months)}
          >
            <option value="" disabled>
              Select years
            </option>
            {experienceYears.map((year) => (
              <option value={year} key={year}>
                {year} {year === 1 ? 'year' : 'years'}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-neutral-600">
            Months
          </span>
          <select
            required
            aria-label="Total relevant experience months"
            className="input"
            value={months}
            onChange={(event) => update(years, event.target.value)}
          >
            <option value="" disabled>
              Select months
            </option>
            {experienceMonths.map((month) => (
              <option value={month} key={month}>
                {month} {month === 1 ? 'month' : 'months'}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export function ProjectsField({
  projects,
  onChange,
}: {
  projects: DraftProject[];
  onChange: (projects: DraftProject[]) => void;
}) {
  const update = (index: number, change: Partial<DraftProject>) =>
    onChange(
      projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, ...change } : project,
      ),
    );

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-semibold">Project experience</h3>
          <p className="mt-1 text-xs text-neutral-600">
            Add each project separately and select every technology used.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange([
              ...projects,
              { name: '', description: '', techStack: [] },
            ])
          }
        >
          <Plus size={16} className="mr-1" />
          Add project
        </Button>
      </div>

      {!projects.length && (
        <div className="mt-4 rounded-panel border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-600">
          No projects added yet. Select “Add project” to get started.
        </div>
      )}

      <div className="mt-4 space-y-4">
        {projects.map((project, index) => (
          <fieldset
            className="rounded-panel border border-neutral-200 bg-neutral-100/50 p-4"
            key={index}
          >
            <div className="flex items-center justify-between gap-3">
              <legend className="font-semibold">Project {index + 1}</legend>
              <button
                type="button"
                aria-label={`Remove project ${index + 1}`}
                className="icon-button-destructive"
                onClick={() =>
                  onChange(
                    projects.filter(
                      (_, projectIndex) => projectIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <Field
                label="Project name"
                value={project.name}
                onChange={(name) => update(index, { name })}
                placeholder="Enter the project name"
              />
              <Area
                label="Project description"
                value={project.description}
                onChange={(description) => update(index, { description })}
                placeholder="Describe the project, your contribution and the outcome."
                rows={4}
              />
              <div>
                <ProjectTechnologyPicker
                  projectNumber={index + 1}
                  technologies={project.techStack}
                  onChange={(techStack) => update(index, { techStack })}
                />
              </div>
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
export function CertificationsField({
  certifications,
  files,
  onChange,
  onFileChange,
}: {
  certifications: DraftCertification[];
  files: Record<string, File>;
  onChange: (certifications: DraftCertification[]) => void;
  onFileChange: (clientId: string, file: File | null) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (
    index: number,
    change: Partial<DraftCertification>,
  ) =>
    onChange(
      certifications.map((certification, certificationIndex) =>
        certificationIndex === index
          ? { ...certification, ...change }
          : certification,
      ),
    );

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-semibold">Certifications</h3>
          <p className="mt-1 text-xs text-neutral-600">
            Add each certification separately and attach its certificate file.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={certifications.length >= 30}
          onClick={() =>
            onChange([
              ...certifications,
              { clientId: newCertificationId(), name: '' },
            ])
          }
        >
          <Plus size={16} className="mr-1" />
          Add certification
        </Button>
      </div>

      {!certifications.length && (
        <div className="mt-4 rounded-panel border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-600">
          No certifications added yet. Select “Add certification” to get
          started.
        </div>
      )}

      <div className="mt-4 space-y-4">
        {certifications.map((certification, index) => {
          const pendingFile = files[certification.clientId];
          return (
            <fieldset
              className="rounded-panel border border-neutral-200 bg-neutral-100/50 p-4"
              key={certification.clientId}
            >
              <div className="flex items-center justify-between gap-3">
                <legend className="font-semibold">
                  Certification {index + 1}
                </legend>
                <button
                  type="button"
                  aria-label={`Remove certification ${index + 1}`}
                  className="icon-button-destructive"
                  onClick={() => {
                    onFileChange(certification.clientId, null);
                    onChange(
                      certifications.filter(
                        (_, certificationIndex) =>
                          certificationIndex !== index,
                      ),
                    );
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
                <Field
                  label="Certification name"
                  value={certification.name}
                  onChange={(name) => update(index, { name })}
                  placeholder="e.g. Microsoft Certified: Azure Solutions Architect"
                />
                <div>
                  <span className="mb-2 block text-sm font-semibold text-neutral-800">
                    Certificate file
                  </span>
                  <label className="flex min-h-10 cursor-pointer items-center justify-center rounded-control border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-semibold text-primary-700 shadow-control transition-colors hover:bg-primary-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-700">
                    <Upload size={16} className="mr-2" />
                    {pendingFile || certification.hasAttachment
                      ? 'Replace file'
                      : 'Upload file'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      aria-label={`Upload certificate file ${index + 1}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        let error = '';
                        if (!isCertificationFileType(file.type))
                          error = 'Choose a PDF, JPEG, PNG, or WebP file.';
                        else if (
                          isCertificationImageType(file.type) &&
                          file.size > MAX_CERTIFICATION_IMAGE_BYTES
                        )
                          error = 'Choose an image no larger than 5 MB.';
                        else if (
                          file.type === CERTIFICATION_PDF_TYPE &&
                          file.size > MAX_CERTIFICATION_PDF_BYTES
                        )
                          error = 'Choose a PDF no larger than 10 MB.';
                        setErrors((current) => ({
                          ...current,
                          [certification.clientId]: error,
                        }));
                        if (error) {
                          event.target.value = '';
                          return;
                        }
                        onFileChange(certification.clientId, file);
                        update(index, {
                          attachmentFileName: file.name,
                          attachmentContentType: file.type,
                          attachmentSize: file.size,
                        });
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-neutral-600">
                    PDF up to 10 MB · JPEG, PNG, or WebP up to 5 MB
                  </p>
                  {errors[certification.clientId] && (
                    <p className="mt-2 text-xs font-semibold text-error-700">
                      {errors[certification.clientId]}
                    </p>
                  )}
                  {(pendingFile || certification.attachmentFileName) && (
                    <p className="mt-2 truncate text-xs font-semibold text-neutral-700">
                      {pendingFile?.name || certification.attachmentFileName}
                    </p>
                  )}
                  {certification.id &&
                    certification.hasAttachment &&
                    !pendingFile && (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                      href={`/api/certifications/${certification.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View uploaded certificate <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
function ProjectTechnologyPicker({
  projectNumber,
  technologies,
  onChange,
}: {
  projectNumber: number;
  technologies: string[];
  onChange: (technologies: string[]) => void;
}) {
  const [pendingTechnology, setPendingTechnology] = useState('');

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        Tech stack used
      </span>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <TaxonomyCombobox
          key={pendingTechnology || 'empty'}
          label={`Tech stack for project ${projectNumber}`}
          value={pendingTechnology}
          excluded={technologies}
          includeOther={false}
          onSelect={setPendingTechnology}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!isTaxonomyName(pendingTechnology)}
          onClick={() => {
            if (
              isTaxonomyName(pendingTechnology) &&
              !technologies.includes(pendingTechnology)
            )
              onChange([...technologies, pendingTechnology]);
            setPendingTechnology('');
          }}
        >
          <Plus size={16} className="mr-1" />
          Add tech
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {technologies.map((technology) => (
          <span className="pill gap-2 bg-mint text-forest" key={technology}>
            {technology}
            <button
              type="button"
              aria-label={`Remove ${technology} from project ${projectNumber}`}
              className="rounded-full px-1 text-error-700 hover:bg-error-50"
              onClick={() =>
                onChange(
                  technologies.filter((selected) => selected !== technology),
                )
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
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
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        {label}
      </span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function DepartmentField({
  label,
  value = '',
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        {label}
      </span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          Select your department
        </option>
        {departmentOptions.map((department) => (
          <option value={department} key={department}>
            {department}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CareerAspirationField({
  value,
  onChange,
}: {
  value: DraftCareerAspiration;
  onChange: (value: DraftCareerAspiration) => void;
}) {
  const targetSkills = value.targetSkills || [];
  const updateTargetSkill = (
    index: number,
    change: Partial<DraftAspirationSkill>,
  ) =>
    onChange({
      ...value,
      targetSkills: targetSkills.map((target, targetIndex) =>
        targetIndex === index ? { ...target, ...change } : target,
      ),
    });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Define your next measurable milestone
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          These targets compare your current skills with where you want to be
          and can be included in future quarterly KPI handovers.
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-neutral-800">
          Target Capability <span className="font-normal text-neutral-500">(recommended)</span>
        </span>
        <select
          aria-label="Target Capability"
          className="input"
          value={value.targetCapability || ''}
          onChange={(event) =>
            onChange({
              ...value,
              targetCapability: event.target.value,
              secondaryCapability:
                event.target.value === value.secondaryCapability
                  ? ''
                  : value.secondaryCapability,
            })
          }
        >
          <option value="">Select a target capability</option>
          {departmentOptions.map((capability) => (
            <option value={capability} key={capability}>
              {capability}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-neutral-800">
          <span>
            Target Role / Next Milestone{' '}
            <span className="text-error-700">*</span>
          </span>
          <span className="text-xs font-normal text-neutral-500">
            {(value.targetRole || '').length}/60
          </span>
        </span>
        <input
          aria-label="Target Role / Next Milestone"
          className="input"
          maxLength={60}
          value={value.targetRole || ''}
          onChange={(event) =>
            onChange({ ...value, targetRole: event.target.value })
          }
          placeholder="e.g. Lead a platform modernisation programme"
        />
      </label>

      <fieldset>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <legend className="text-sm font-semibold text-neutral-800">
              Target Skills to Develop <span className="text-error-700">*</span>
            </legend>
            <p className="mt-1 text-xs text-neutral-600">
              Choose HR-taxonomy skills and the proficiency you intend to reach.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={targetSkills.some((target) => !target.name)}
            onClick={() =>
              onChange({
                ...value,
                targetSkills: [
                  ...targetSkills,
                  { name: '', targetProficiency: 3 },
                ],
              })
            }
          >
            <Plus size={16} className="mr-1" />
            Add target skill
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {targetSkills.map((target, index) => (
            <div
              className="grid gap-2 rounded-panel border border-neutral-200 bg-neutral-100/60 p-3 sm:grid-cols-[1fr_210px_40px]"
              key={index}
            >
              <TaxonomyCombobox
                label={`Target skill ${index + 1}`}
                value={target.name}
                excluded={targetSkills
                  .filter((_, targetIndex) => targetIndex !== index)
                  .map((other) => other.name)
                  .filter(isTaxonomyName)}
                includeOther={false}
                onSelect={(name) => updateTargetSkill(index, { name })}
              />
              <select
                aria-label={`Target proficiency for skill ${index + 1}`}
                className="input"
                value={target.targetProficiency}
                onChange={(event) =>
                  updateTargetSkill(index, {
                    targetProficiency: Number(event.target.value),
                  })
                }
              >
                {levels.slice(1).map((label, levelIndex) => (
                  <option value={levelIndex + 1} key={label}>
                    {levelIndex + 1} — {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Remove target skill ${index + 1}`}
                className="icon-button-destructive"
                onClick={() =>
                  onChange({
                    ...value,
                    targetSkills: targetSkills.filter(
                      (_, targetIndex) => targetIndex !== index,
                    ),
                  })
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {!targetSkills.length && (
            <p className="rounded-control border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
              Add at least one skill to make this aspiration measurable.
            </p>
          )}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-neutral-800">
          Target Timeframe <span className="text-error-700">*</span>
        </span>
        <select
          aria-label="Target Timeframe"
          className="input"
          value={value.targetTimeframe || ''}
          onChange={(event) =>
            onChange({
              ...value,
              targetTimeframe: event.target.value as CareerTimeframe | '',
            })
          }
        >
          <option value="" disabled>
            Select a timeframe
          </option>
          {careerTimeframeOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-neutral-800">
          Secondary Capability Interest{' '}
          <span className="font-normal text-neutral-500">(optional)</span>
        </span>
        <select
          aria-label="Secondary Capability Interest"
          className="input"
          value={value.secondaryCapability || ''}
          onChange={(event) =>
            onChange({ ...value, secondaryCapability: event.target.value })
          }
        >
          <option value="">No secondary capability</option>
          {departmentOptions
            .filter((capability) => capability !== value.targetCapability)
            .map((capability) => (
              <option value={capability} key={capability}>
                {capability}
              </option>
            ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-neutral-800">
          <span>
            Notes <span className="font-normal text-neutral-500">(optional)</span>
          </span>
          <span className="text-xs font-normal text-neutral-500">
            {(value.notes || '').length}/300
          </span>
        </span>
        <textarea
          aria-label="Career aspiration notes"
          className="input resize-y"
          maxLength={300}
          rows={4}
          value={value.notes || ''}
          onChange={(event) =>
            onChange({ ...value, notes: event.target.value })
          }
          placeholder="Add context that is not captured by the structured targets."
        />
      </label>
    </div>
  );
}

function Area(p: {
  label: string;
  value?: string;
  onChange: (x: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        {p.label}
      </span>
      <textarea
        rows={p.rows || 7}
        className="input resize-y"
        value={p.value || ''}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
      />
    </label>
  );
}
