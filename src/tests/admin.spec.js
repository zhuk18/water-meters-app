const { test, expect } = require('@playwright/test');

const addResident = async (page, { name, apartment, email = 'test@example.com', meters = '1' }) => {
  await page.getByRole('button', { name: /Pievienot iedzīvotāju/i }).first().click();
  await page.getByLabel('Vārds').fill(name);
  await page.getByLabel('Dzīvokļa numurs').fill(apartment);
  await page.getByLabel('E-pasts (neobligāts)').fill(email);
  await page.getByLabel('Skaitītāju skaits').fill(meters);
  await page.getByRole('button', { name: 'Pievienot' }).click();
  await expect(page.getByRole('heading', { name: `DZĪVOKLIS ${apartment}` })).toBeVisible();
};

const deleteResidentByApartment = async (page, apartment) => {
  const residentCard = page.locator('.resident-card', {
    has: page.getByText(`DZĪVOKLIS ${apartment}`)
  });
  await expect(residentCard).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await residentCard.getByRole('button', { name: 'Dzēst' }).click();
  await expect(residentCard).toHaveCount(0);
};

test('loads admin panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ADMIN PANELIS' })).toBeVisible();
});

test('add and delete resident', async ({ page }) => {
  await page.goto('/');
  const apartment = `9-${Date.now().toString().slice(-4)}`;
  await addResident(page, {
    name: 'Testa Iedzīvotājs',
    apartment
  });
  await deleteResidentByApartment(page, apartment);
});

test('export readings downloads json', async ({ page }) => {
  await page.goto('/');
  const apartment = `8-${Date.now().toString().slice(-4)}`;
  await addResident(page, {
    name: 'Eksporta Tests',
    apartment
  });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportēt datus' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/water-readings-\d{4}-\d{2}-\d{2}\.json/);

  await deleteResidentByApartment(page, apartment);
});
