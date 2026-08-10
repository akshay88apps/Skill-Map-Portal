'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui';

function localHeading(now: Date, name: string) {
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${name}.`;
}

export function DashboardHeader({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now)
    : 'Today';
  const title = now ? localHeading(now, name) : `Hello, ${name}.`;

  return (
    <PageHeader
      eyebrow={date}
      title={title}
      description="A clear view of your organisation’s expertise, capability gaps, and momentum."
      action={
        <Link href="/directory" className="btn">
          Explore people <ArrowRight size={16} className="ml-2" />
        </Link>
      }
    />
  );
}
