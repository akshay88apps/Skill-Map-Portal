import { canonical, splitTerms } from '@/lib/normalization';
export type Extracted = {
  type: 'project' | 'skill' | 'tool';
  payload: Record<string, unknown>;
  confidence: number;
};
export function deterministicExtract(input: {
  projects?: string;
  primary?: string;
  secondary?: string;
  proficient?: string;
  tools?: string;
}): Extracted[] {
  const result: Extracted[] = [];
  const skills = new Map<
    string,
    {
      rawText: string;
      proficiency: number;
      tag: 'primary' | 'secondary' | 'proficient';
    }
  >();
  const add = (
    value: string | undefined,
    proficiency: number,
    tag: 'primary' | 'secondary' | 'proficient',
  ) => {
    for (const rawText of splitTerms(value)) {
      const name = canonical(rawText);
      const existing = skills.get(name);
      if (!existing || existing.proficiency < proficiency)
        skills.set(name, { rawText, proficiency, tag });
    }
  };
  add(input.secondary, 2, 'secondary');
  add(input.proficient, 3, 'proficient');
  add(input.primary, 4, 'primary');
  for (const [canonicalName, meta] of skills)
    result.push({
      type: 'skill',
      payload: { ...meta, canonicalName, ratingSource: 'inferred' },
      confidence:
        canonicalName ===
        meta.rawText
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/[._-]/g, ' ')
          ? 0.68
          : 0.93,
    });
  for (const raw of splitTerms(input.tools))
    result.push({
      type: 'tool',
      payload: { name: canonical(raw), rawText: raw },
      confidence: 0.9,
    });
  for (const raw of (input.projects || '')
    .split(/\n(?=\s*(?:[-•\d]|Project))/i)
    .map((x) => x.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean)) {
    const duration = raw.match(/(\d+)\s*(months?|years?)/i);
    const months = duration
      ? Number(duration[1]) *
        (duration[2].toLowerCase().startsWith('year') ? 12 : 1)
      : null;
    result.push({
      type: 'project',
      payload: {
        name:
          raw
            .split(/[-–|,]/)[0]
            .trim()
            .slice(0, 120) || 'Untitled project',
        rawText: raw,
        durationMonthsEstimate: months,
        status: /active|ongoing|current/i.test(raw)
          ? 'ACTIVE'
          : /closed|complete|ended/i.test(raw)
            ? 'CLOSED'
            : 'UNKNOWN',
      },
      confidence: duration?.[0] && raw.length > 20 ? 0.82 : 0.62,
    });
  }
  return result;
}
export function partitionByConfidence(records: Extracted[], threshold = 0.7) {
  return {
    accepted: records.filter((x) => x.confidence >= threshold),
    needsReview: records.filter((x) => x.confidence < threshold),
  };
}
export function safeInferredProficiency(payload: Record<string, unknown>) {
  if (payload.tag === 'primary') return 4;
  if (payload.tag === 'secondary') return 2;
  const value = Number(payload.proficiency);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 3;
}
export async function extractWithAI(
  input: Parameters<typeof deterministicExtract>[0],
) {
  if (!process.env.ANTHROPIC_API_KEY) return deterministicExtract(input);
  /* Production adapter intentionally keeps provider concerns here. */ const response =
    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `Return JSON records for projects, skills and tools with confidence 0-1. Skills have proficiency 1-5 and ratingSource=inferred. Never use self_rated: no explicit rating was provided. Default primary skills to 4 and secondary skills to 2. Input: ${JSON.stringify(input)}`,
          },
        ],
      }),
    });
  if (!response.ok) throw new Error(`AI extraction failed: ${response.status}`);
  const body = (await response.json()) as any;
  const text = body.content?.find((x: any) => x.type === 'text')?.text || '[]';
  return JSON.parse(text.replace(/^```json|```$/g, '').trim()) as Extracted[];
}
