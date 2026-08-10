import { EmailClient } from '@azure/communication-email';
import { db } from '@/lib/db';

export type AzureEmailConfig = {
  connectionString: string;
  senderAddress: string;
};

export function azureEmailConfig(
  env: NodeJS.ProcessEnv = process.env,
): AzureEmailConfig {
  const connectionString = env.ACS_EMAIL_CONNECTION_STRING?.trim();
  const senderAddress = env.ACS_EMAIL_SENDER_ADDRESS?.trim();
  if (!connectionString)
    throw new Error('ACS_EMAIL_CONNECTION_STRING is not configured');
  if (!senderAddress)
    throw new Error('ACS_EMAIL_SENDER_ADDRESS is not configured');
  return { connectionString, senderAddress };
}

export function invitationEmailContent(payload: {
  signinUrl?: string;
  dueAt?: string;
}) {
  if (!payload.signinUrl)
    throw new Error('Invitation payload has no sign-in URL');
  return {
    subject: 'Complete your Tech Leaders Skillmap profile',
    plainText: `You have been invited to complete your leadership skills profile. Sign in with Microsoft: ${payload.signinUrl}${payload.dueAt ? `\nDue: ${payload.dueAt}` : ''}`,
  };
}

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
  if (!jobs.length) return { processed: 0, sent: 0 };
  const config = azureEmailConfig();
  const client = new EmailClient(config.connectionString);
  let sent = 0;
  for (const job of jobs) {
    try {
      const p = job.payload as { signinUrl?: string; dueAt?: string };
      const content = invitationEmailContent(p);
      const poller = await client.beginSend({
        senderAddress: config.senderAddress,
        recipients: {
          to: [{ address: job.recipient }],
        },
        content: {
          subject: content.subject,
          plainText: content.plainText,
        },
      });
      const result = await poller.pollUntilDone();
      if (result.status !== 'Succeeded') {
        throw new Error(
          `Azure Communication Services Email failed: ${result.error?.message || result.status}`,
        );
      }
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
