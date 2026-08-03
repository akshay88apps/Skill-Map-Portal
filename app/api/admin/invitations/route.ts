import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/authz';
const input = z.object({
  emails: z.array(z.string().email()).min(1).max(200),
  dueAt: z.string().datetime().optional(),
});
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = input.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid invitation request', issues: parsed.error.flatten() },
      { status: 422 },
    );
  const base = process.env.APP_BASE_URL;
  if (!base)
    return NextResponse.json(
      { error: 'APP_BASE_URL is not configured' },
      { status: 503 },
    );
  for (const raw of parsed.data.emails) {
    const email = raw.toLowerCase();
    await db.leader.upsert({
      where: { email },
      update: { invitedAt: new Date(), profileStatus: 'INVITED' },
      create: {
        email,
        fullName: email.split('@')[0],
        invitedAt: new Date(),
        profileStatus: 'INVITED',
      },
    });
    await db.invitation.create({
      data: {
        email,
        invitedBy: admin.email || 'admin',
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
    });
    await db.notificationJob.create({
      data: {
        kind: 'INVITATION',
        recipient: email,
        payload: { signinUrl: `${base}/signin`, dueAt: parsed.data.dueAt },
        scheduledAt: new Date(),
      },
    });
  }
  return NextResponse.json(
    { queued: parsed.data.emails.length },
    { status: 201 },
  );
}
