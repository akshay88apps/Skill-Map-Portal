export type RatingSource = 'self_rated' | 'inferred' | 'demo';
export interface SkillRating {
  leaderEmail: string;
  skill: string;
  proficiency: number;
  target: number;
  ratingSource: RatingSource;
}
export interface SkillGap {
  leaderEmail: string;
  skill: string;
  current: number;
  target: number;
  ratingSource: RatingSource;
  decisionConfidence: 'confirmed' | 'advisory';
}
export function detectSkillGaps(
  ratings: SkillRating[],
  includeInferred = false,
): SkillGap[] {
  return ratings
    .filter(
      (r) =>
        r.proficiency < r.target &&
        (includeInferred || r.ratingSource === 'self_rated'),
    )
    .map((r) => ({
      leaderEmail: r.leaderEmail,
      skill: r.skill,
      current: r.proficiency,
      target: r.target,
      ratingSource: r.ratingSource,
      decisionConfidence:
        r.ratingSource === 'self_rated' ? 'confirmed' : 'advisory',
    }));
}
export interface LndConnector {
  pushGaps(gaps: SkillGap[]): Promise<{ batchId: string }>;
}
export class HttpLndConnector implements LndConnector {
  constructor(
    private url = process.env.LND_API_URL || 'http://localhost:4010',
  ) {}
  async pushGaps(gaps: SkillGap[]) {
    const r = await fetch(`${this.url}/skill-gaps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gaps }),
    });
    if (!r.ok) throw new Error(`L&D adapter: ${r.status}`);
    return r.json();
  }
}
