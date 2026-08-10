import { NextRequest, NextResponse } from 'next/server';
import { currentIdentity } from '@/lib/authz';
import { db } from '@/lib/db';
import { signedCertificationUrl } from '@/lib/certification-storage';

export async function GET(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const user = await currentIdentity();
  if (!user)
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await props.params;
  const certification = await db.certification.findUnique({
    where: { id },
    select: {
      leaderId: true,
      name: true,
      attachmentBlobName: true,
      attachmentContentType: true,
      attachmentFileName: true,
      leader: { select: { profileStatus: true } },
    },
  });
  if (
    !certification?.attachmentBlobName ||
    !certification.attachmentContentType
  )
    return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const canView =
    user.role === 'ADMIN' ||
    user.leaderId === certification.leaderId ||
    certification.leader.profileStatus === 'PUBLISHED';
  if (!canView)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const fileName =
    certification.attachmentFileName ||
    certification.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  try {
    return NextResponse.redirect(
      await signedCertificationUrl(
        certification.attachmentBlobName,
        fileName,
        certification.attachmentContentType,
      ),
      302,
    );
  } catch {
    return NextResponse.json(
      { error: 'Certificate file is temporarily unavailable' },
      { status: 503 },
    );
  }
}
