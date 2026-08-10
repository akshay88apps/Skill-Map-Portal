import type { ZodError } from 'zod';

export type ProfileValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export function profileValidationIssues(
  error: ZodError,
): ProfileValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function profileValidationErrorMap(
  issues: ProfileValidationIssue[],
) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path, issue.message]),
  );
}
