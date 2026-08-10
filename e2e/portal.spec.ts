import { expect, test } from '@playwright/test';

test('overview presents the capability map before dashboard metrics', async ({
  page,
}) => {
  await page.goto('/');

  const capabilityMap = page.locator('#capability-map');
  const leaderProfiles = page.getByText('Leader profiles', { exact: true });
  await expect(
    capabilityMap.getByRole('heading', { name: 'Capability map' }),
  ).toBeVisible();
  await expect(capabilityMap.getByRole('rowheader')).toHaveCount(10);

  const mapBox = await capabilityMap.boundingBox();
  const metricsBox = await leaderProfiles.boundingBox();
  expect(mapBox).not.toBeNull();
  expect(metricsBox).not.toBeNull();
  expect(mapBox!.y).toBeLessThan(metricsBox!.y);
});

test('leader can discover expertise', async ({ page }) => {
  await page.goto('/directory');
  await page.getByLabel('Search leaders').fill('TypeScript');
  await expect(page.getByText('Aarav Sharma')).toBeVisible();
  await page.getByText('Aarav Sharma').click();
  await expect(page.getByText('Capability profile')).toBeVisible();
});

test('profile wizard captures a taxonomy skill and explicit rating', async ({
  page,
}) => {
  await page.goto('/my-profile');
  await page.getByPlaceholder('Your legal or full name').fill('Test Leader');
  await page.getByRole('button', { name: /Skills$/ }).click();

  const skill = page.getByRole('combobox', {
    name: 'Skill 1',
    exact: true,
  });
  await skill.fill('Azure Functions');
  await page.getByRole('option', { name: 'Azure Functions', exact: true }).click();
  await expect(skill).toHaveValue('Azure Functions');

  const proficiency = page.getByLabel('Proficiency for skill 1');
  await proficiency.selectOption('4');
  await expect(proficiency).toHaveValue('4');
});

test('profile wizard captures repeatable certification evidence', async ({
  page,
}) => {
  await page.goto('/my-profile');
  await page.getByRole('button', { name: /Certifications$/ }).click();
  await page.getByRole('button', { name: 'Add certification' }).click();
  await page
    .getByLabel('Certification name')
    .fill('Azure Solutions Architect');
  await page.getByLabel('Upload certificate file 1').setInputFiles({
    name: 'azure-certificate.png',
    mimeType: 'image/png',
    buffer: Buffer.from('certificate-preview'),
  });

  await expect(page.getByText('azure-certificate.png')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
});

test('profile wizard captures a structured career aspiration', async ({
  page,
}) => {
  await page.goto('/my-profile');
  await page.getByRole('button', { name: /Career Aspiration$/ }).click();

  await page
    .getByLabel('Target Role / Next Milestone')
    .fill('Platform Engineering Lead');
  await page.getByLabel('Target Capability').selectOption('Platform Engineering');
  await page.getByRole('button', { name: 'Add target skill' }).click();
  const targetSkill = page.getByRole('combobox', { name: 'Target skill 1' });
  await targetSkill.fill('Azure Functions');
  await page
    .getByRole('option', { name: 'Azure Functions', exact: true })
    .click();
  await page
    .getByLabel('Target proficiency for skill 1')
    .selectOption('4');
  await page.getByLabel('Target Timeframe').selectOption('SIX_TO_TWELVE_MONTHS');

  await expect(targetSkill).toHaveValue('Azure Functions');
  await expect(
    page
      .getByLabel('Secondary Capability Interest')
      .locator('option[value="Platform Engineering"]'),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Submit profile' })).toBeEnabled();
});
