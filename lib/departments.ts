export const departmentOptions = [
  'Product Engineering',
  'Enterprise Platforms',
  'AI & Autonomous Systems',
  'Data Platforms & Intelligence',
  'Platform Engineering',
  'Experience Engineering',
  'Digital Trust',
  'Customer Engineering',
  'Innovation Lab',
  'Product Strategy & Venture Studio',
] as const;

export type Department = (typeof departmentOptions)[number];

export function isDepartment(value: unknown): value is Department {
  return departmentOptions.includes(value as Department);
}
