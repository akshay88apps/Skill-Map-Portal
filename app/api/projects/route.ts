import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectInput } from '@/lib/validation';
export async function GET(req: NextRequest) {
  return NextResponse.json(
    await db.project.findMany({
      where: req.nextUrl.searchParams.get('leaderId')
        ? { leaderId: req.nextUrl.searchParams.get('leaderId')! }
        : {},
    }),
  );
}
export async function POST(req: NextRequest) {
  const p = projectInput.safeParse(await req.json());
  return p.success
    ? NextResponse.json(await db.project.create({ data: p.data }), {
        status: 201,
      })
    : NextResponse.json(
        { error: 'Validation failed', issues: p.error.flatten() },
        { status: 422 },
      );
}
