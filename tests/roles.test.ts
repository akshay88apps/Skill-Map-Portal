import { describe, expect, it } from 'vitest';
import { roleFromGroups, roleLabel } from '@/lib/roles';

const env = {
  AUTH_ADMIN_GROUP_ID: '1353375d-4bbc-45a7-aa31-fac6d3b0564e',
  AUTH_LEADER_GROUP_ID: '9879fb2d-d8aa-47cc-849f-4bc6ec07096f',
};

describe('Microsoft Entra group role resolution', () => {
  it('maps the confirmed administrator group to Admin', () => {
    expect(roleFromGroups([env.AUTH_ADMIN_GROUP_ID], env)).toBe('ADMIN');
    expect(roleLabel('ADMIN')).toBe('Admin');
  });

  it('maps the confirmed leader group to Leader', () => {
    expect(roleFromGroups([env.AUTH_LEADER_GROUP_ID], env)).toBe('LEADER');
    expect(roleLabel('LEADER')).toBe('Leader');
  });

  it('gives the administrator group precedence when both are present', () => {
    expect(
      roleFromGroups(
        [env.AUTH_LEADER_GROUP_ID, env.AUTH_ADMIN_GROUP_ID],
        env,
      ),
    ).toBe('ADMIN');
  });

  it('fails closed to Viewer when neither configured group is present', () => {
    expect(roleFromGroups(['unrelated-group'], env)).toBe('VIEWER');
    expect(roleFromGroups([], env)).toBe('VIEWER');
  });
});
