import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireIdentity } from '@/lib/authz';
import { profileDraftInput, profileInput } from '@/lib/validation';
import { normalizeExperience } from '@/lib/normalization';
import { otherTaxonomyReviewRequests } from '@/lib/profile-taxonomy';
import {
  prepareCertificationFile,
  type PreparedCertificationFile,
} from '@/lib/certification-files';
import { MAX_CERTIFICATION_UPLOAD_BYTES } from '@/lib/certification-file-policy';
import {
  deleteCertificationFile,
  uploadCertificationFile,
} from '@/lib/certification-storage';
import {
  profileValidationIssues,
  type ProfileValidationIssue,
} from '@/lib/profile-validation-errors';

function validationFailure(
  leaderId: string,
  issues: ProfileValidationIssue[],
  code = 'PROFILE_VALIDATION_FAILED',
  status = 422,
) {
  console.warn(
    'Profile validation rejected',
    JSON.stringify({ leaderId, code, issues }),
  );
  return NextResponse.json(
    { error: 'Profile validation failed', code, issues },
    { status },
  );
}

async function identity() {
  try {
    return await requireIdentity();
  } catch {
    return null;
  }
}
export async function GET() {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  return NextResponse.json(
    await db.leader.findUnique({
      where: { id: user.leaderId },
      include: {
        skills: { include: { skill: true } },
        tools: { include: { tool: true } },
        projects: true,
        careerAspiration: {
          select: {
            targetCapability: true,
            targetRole: true,
            targetTimeframe: true,
            secondaryCapability: true,
            notes: true,
            targetSkills: {
              select: {
                targetProficiency: true,
                skill: { select: { name: true } },
              },
            },
          },
        },
        certifications: {
          select: {
            id: true,
            name: true,
            attachmentBlobName: true,
            attachmentFileName: true,
            attachmentContentType: true,
            attachmentSize: true,
          },
        },
      },
    }),
  );
}
export async function PATCH(req: NextRequest) {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = profileDraftInput.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid draft' }, { status: 422 });
  const body = parsed.data;
  await db.leader.update({
    where: { id: user.leaderId },
    data: {
      draftData: body,
      profileStatus: 'DRAFT',
      lastProfileUpdate: new Date(),
    },
  });
  return NextResponse.json({ saved: true });
}
export async function POST(req: NextRequest) {
  const user = await identity();
  if (!user?.leaderId)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const leaderId = user.leaderId;
  let rawProfile: unknown;
  const certificateFiles = new Map<string, File>();
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await req.formData();
      const profilePart = form.get('profile');
      if (typeof profilePart !== 'string') throw new Error('Missing profile');
      rawProfile = JSON.parse(profilePart);
      for (const [key, value] of form.entries())
        if (
          key.startsWith('certificationFile.') &&
          typeof value !== 'string'
        )
          certificateFiles.set(key.slice('certificationFile.'.length), value);
    } else rawProfile = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });
  }
  const parsed = profileInput.safeParse(rawProfile);
  if (!parsed.success)
    return validationFailure(
      leaderId,
      profileValidationIssues(parsed.error),
    );
  const d = parsed.data;
  const certificationClientIds = new Set(
    d.certifications.map((certification) => certification.clientId),
  );
  const totalFileBytes = [...certificateFiles.values()].reduce(
    (total, file) => total + file.size,
    0,
  );
  if (totalFileBytes > MAX_CERTIFICATION_UPLOAD_BYTES)
    return validationFailure(
      leaderId,
      [
        {
          path: 'certifications',
          message: 'Certificate files must total 30 MB or less.',
          code: 'certificate_total_too_large',
        },
      ],
      'CERTIFICATE_VALIDATION_FAILED',
    );
  if (
    [...certificateFiles.keys()].some(
      (clientId) => !certificationClientIds.has(clientId),
    )
  )
    return validationFailure(
      leaderId,
      [
        {
          path: 'certifications',
          message:
            'A certificate file no longer matches its certification. Re-select the file and try again.',
          code: 'certificate_file_mismatch',
        },
      ],
      'CERTIFICATE_VALIDATION_FAILED',
    );
  const preparedFiles = new Map<string, PreparedCertificationFile>();
  for (const [clientId, file] of certificateFiles) {
    try {
      preparedFiles.set(clientId, await prepareCertificationFile(file));
    } catch (error) {
      const certificationIndex = d.certifications.findIndex(
        (certification) => certification.clientId === clientId,
      );
      return validationFailure(
        leaderId,
        [
          {
            path:
              certificationIndex >= 0
                ? `certifications.${certificationIndex}.file`
                : 'certifications',
            message:
              error instanceof Error
                ? error.message
                : 'Certificate file validation failed.',
            code: 'certificate_file_invalid',
          },
        ],
        'CERTIFICATE_VALIDATION_FAILED',
      );
    }
  }

  const uploadedFiles = new Map<
    string,
    PreparedCertificationFile & { blobName: string }
  >();
  try {
    for (const [clientId, file] of preparedFiles) {
      const blobName = await uploadCertificationFile(leaderId, file);
      uploadedFiles.set(clientId, { ...file, blobName });
    }
  } catch {
    await Promise.allSettled(
      [...uploadedFiles.values()].map((file) =>
        deleteCertificationFile(file.blobName),
      ),
    );
    return validationFailure(
      leaderId,
      [
        {
          path: 'certifications',
          message:
            'Certificate files could not be stored. Your profile was not submitted; please try again.',
          code: 'certificate_storage_failed',
        },
      ],
      'CERTIFICATE_STORAGE_FAILED',
      502,
    );
  }

  let result: { certifications: Array<Record<string, unknown>> };
  const oldBlobsToDelete = new Set<string>();
  try {
    result = await db.$transaction(async (tx) => {
    const before = await tx.leader.findUniqueOrThrow({
      where: { id: leaderId },
    });
    await tx.leader.update({
      where: { id: leaderId },
      data: {
        fullName: d.fullName,
        preferredName: d.preferredName,
        department: d.department,
        jobTitle: d.jobTitle,
        experienceRaw: d.experience,
        experienceYearsEstimate: normalizeExperience(d.experience),
        leadershipBracketRaw: d.leadership,
        leadershipYearsEstimate: normalizeExperience(d.leadership),
        draftData: d,
        profileStatus: 'SUBMITTED',
        profileCompleted: true,
        submittedAt: new Date(),
        lastProfileUpdate: new Date(),
      },
    });
    await tx.careerAspiration.upsert({
      where: { leaderId },
      update: {
        targetCapability: d.careerAspiration.targetCapability,
        targetRole: d.careerAspiration.targetRole,
        targetTimeframe: d.careerAspiration.targetTimeframe,
        secondaryCapability: d.careerAspiration.secondaryCapability,
        notes: d.careerAspiration.notes,
      },
      create: {
        leaderId,
        targetCapability: d.careerAspiration.targetCapability,
        targetRole: d.careerAspiration.targetRole,
        targetTimeframe: d.careerAspiration.targetTimeframe,
        secondaryCapability: d.careerAspiration.secondaryCapability,
        notes: d.careerAspiration.notes,
      },
    });
    await tx.careerAspirationSkill.deleteMany({ where: { leaderId } });
    for (const target of d.careerAspiration.targetSkills) {
      const skill = await tx.skill.findUniqueOrThrow({
        where: { name: target.name },
      });
      await tx.careerAspirationSkill.create({
        data: {
          leaderId,
          skillId: skill.id,
          targetProficiency: target.targetProficiency,
        },
      });
    }
    await tx.project.deleteMany({ where: { leaderId } });
    for (const project of d.projects)
      await tx.project.create({
        data: {
          leaderId,
          name: project.name,
          description: project.description,
          techStack: project.techStack,
          status: 'UNKNOWN',
        },
      });
    const existingCertifications = await tx.certification.findMany({
      where: { leaderId },
      select: { id: true, attachmentBlobName: true },
    });
    const existingCertificationIds = new Set(
      existingCertifications.map((certification) => certification.id),
    );
    if (
      d.certifications.some(
        (certification) =>
          certification.id &&
          !existingCertificationIds.has(certification.id),
      )
    )
      throw new Error('Certification does not belong to this profile');
    const retainedCertificationIds = d.certifications
      .map((certification) => certification.id)
      .filter((id): id is string => Boolean(id));
    const replacedCertificationIds = new Set(
      d.certifications
        .filter(
          (certification) =>
            certification.id && uploadedFiles.has(certification.clientId),
        )
        .map((certification) => certification.id!),
    );
    for (const existing of existingCertifications)
      if (
        existing.attachmentBlobName &&
        (!retainedCertificationIds.includes(existing.id) ||
          replacedCertificationIds.has(existing.id))
      )
        oldBlobsToDelete.add(existing.attachmentBlobName);
    await tx.certification.deleteMany({
      where: {
        leaderId,
        ...(retainedCertificationIds.length
          ? { id: { notIn: retainedCertificationIds } }
          : {}),
      },
    });
    const savedCertifications = [];
    for (const certification of d.certifications) {
      const file = uploadedFiles.get(certification.clientId);
      const attachmentData = file
        ? {
            attachmentBlobName: file.blobName,
            attachmentContentType: file.contentType,
            attachmentFileName: file.fileName,
            attachmentSize: file.size,
          }
        : {};
      const saved = certification.id
        ? await tx.certification.update({
            where: { id: certification.id },
            data: { name: certification.name, ...attachmentData },
            select: {
              id: true,
              name: true,
              attachmentBlobName: true,
              attachmentFileName: true,
              attachmentContentType: true,
              attachmentSize: true,
            },
          })
        : await tx.certification.create({
            data: {
              leaderId,
              name: certification.name,
              ...attachmentData,
            },
            select: {
              id: true,
              name: true,
              attachmentBlobName: true,
              attachmentFileName: true,
              attachmentContentType: true,
              attachmentSize: true,
            },
          });
      savedCertifications.push({
        clientId: saved.id,
        id: saved.id,
        name: saved.name,
        attachmentFileName: saved.attachmentFileName || undefined,
        attachmentContentType: saved.attachmentContentType || undefined,
        attachmentSize: saved.attachmentSize || undefined,
        hasAttachment: Boolean(saved.attachmentBlobName),
      });
    }
    await tx.leader.update({
      where: { id: leaderId },
      data: { draftData: { ...d, certifications: savedCertifications } },
    });
    await tx.leaderTool.deleteMany({ where: { leaderId } });
    for (const name of d.tools || []) {
      const tool = await tx.tool.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await tx.leaderTool.create({
        data: { leaderId, toolId: tool.id },
      });
    }
    await tx.leaderSkill.deleteMany({
      where: { leaderId, source: 'SELF_REPORTED' },
    });
    for (const { name, proficiency } of d.ratedSkills) {
      const skill = await tx.skill.findUniqueOrThrow({
        where: { name },
      });
      await tx.leaderSkill.upsert({
        where: {
          leaderId_skillId_source: {
            leaderId,
            skillId: skill.id,
            source: 'SELF_REPORTED',
          },
        },
        update: { proficiency, ratingSource: 'self_rated', confidence: null },
        create: {
          leaderId,
          skillId: skill.id,
          source: 'SELF_REPORTED',
          proficiency,
          ratingSource: 'self_rated',
        },
      });
    }
    for (const request of otherTaxonomyReviewRequests(
      leaderId,
      d.otherSkills,
      d.otherTools,
    ))
      await tx.reviewItem.create({ data: request });
    await tx.auditLog.create({
      data: {
        leaderId,
        actorEmail: user.email || 'unknown',
        action: 'SUBMIT',
        entityType: 'Leader',
        entityId: leaderId,
        before: before as any,
        after: d as any,
      },
    });
      return { certifications: savedCertifications };
    });
  } catch (error) {
    await Promise.allSettled(
      [...uploadedFiles.values()].map((file) =>
        deleteCertificationFile(file.blobName),
      ),
    );
    if (
      error instanceof Error &&
      error.message === 'Certification does not belong to this profile'
    )
      return validationFailure(
        leaderId,
        [
          {
            path: 'certifications',
            message: error.message,
            code: 'certificate_ownership_invalid',
          },
        ],
        'CERTIFICATE_VALIDATION_FAILED',
      );
    throw error;
  }
  await Promise.allSettled(
    [...oldBlobsToDelete].map((blobName) =>
      deleteCertificationFile(blobName),
    ),
  );
  return NextResponse.json({ submitted: true, ...result });
}
