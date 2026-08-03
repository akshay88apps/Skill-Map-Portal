'use client';
import { useEffect, useState } from 'react';
import { demoLeaders, DemoSkill } from '@/lib/demo';
export type LiveLeader = (typeof demoLeaders)[number];
export function useLiveLeaders() {
  const [leaders, setLeaders] = useState<readonly LiveLeader[]>(
    process.env.NODE_ENV === 'development' ? demoLeaders : [],
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/leaders?size=100')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load leaders');
        const { items } = await r.json();
        setLeaders(
          items.map((l: any) => ({
            id: l.id,
            fullName: l.fullName,
            preferredName: l.preferredName || l.fullName,
            email: l.email,
            department: l.department || 'Unassigned',
            jobTitle: l.jobTitle || 'Leader',
            experienceYearsEstimate: l.experienceYearsEstimate || 0,
            leadershipBracketRaw: l.leadershipBracketRaw || '',
            skills: l.skills.map(
              (x: any) =>
                [x.skill.name, x.proficiency, x.ratingSource] as DemoSkill,
            ),
            projects: l.projects.length,
            certs: l.certifications.length,
            updatedAt: String(l.updatedAt).slice(0, 10),
          })),
        );
      })
      .catch(() => {
        if (process.env.NODE_ENV === 'production') setLeaders([]);
      })
      .finally(() => setLoading(false));
  }, []);
  return { leaders, loading };
}
