import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processNotifications } from '@/lib/notifications';
function valid(req: NextRequest) {
  const supplied =
    req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const expected = process.env.CRON_SECRET || '';
  if (!supplied || !expected || supplied.length !== expected.length)
    return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
export async function POST(req: NextRequest) {
  if (!valid(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await processNotifications());
}
