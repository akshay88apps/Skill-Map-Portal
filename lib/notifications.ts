import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { db } from '@/lib/db';
export async function processNotifications(limit = 25) {
  const jobs = await db.notificationJob.findMany({
    where: {
      sentAt: null,
      scheduledAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    take: limit,
    orderBy: { scheduledAt: 'asc' },
  });
  const client = new SESv2Client({ region: process.env.AWS_REGION });
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error('SES_FROM_EMAIL is not configured');
  let sent = 0;
  for (const job of jobs) {
    try {
      const p = job.payload as { signinUrl?: string; dueAt?: string };
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [job.recipient] },
          Content: {
            Simple: {
              Subject: { Data: 'Complete your Tech Leaders Skillmap profile' },
              Body: {
                Text: {
                  Data: `You have been invited to complete your leadership skills profile. Sign in with Microsoft: ${p.signinUrl}${p.dueAt ? `\nDue: ${p.dueAt}` : ''}`,
                },
              },
            },
          },
        }),
      );
      await db.notificationJob.update({
        where: { id: job.id },
        data: { sentAt: new Date(), attempts: { increment: 1 } },
      });
      await db.invitation.updateMany({
        where: { email: job.recipient, sentAt: null },
        data: { sentAt: new Date() },
      });
      sent++;
    } catch (error) {
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
  return { processed: jobs.length, sent };
}
