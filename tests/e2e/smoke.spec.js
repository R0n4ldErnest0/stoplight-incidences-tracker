import { test, expect } from '@playwright/test'

test('loads in demo mode with the seeded map', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/SemáforoAlerta/)
  // No Supabase creds locally -> falls back to the local demo backend.
  await expect(page.getByText('Demo local')).toBeVisible()
})

test('can switch between all views including About', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Lista/ }).click()
  await page.getByRole('button', { name: /Transparencia/ }).click()
  await page.getByRole('button', { name: /Acerca de/ }).click()
  await expect(page.getByText('Quién está detrás')).toBeVisible()
  await page.getByRole('button', { name: /Mapa/ }).click()
})

test('date-range filter is available', async ({ page }) => {
  await page.goto('/')
  const dateSelect = page.locator('.date-select')
  await expect(dateSelect).toBeVisible()
  await dateSelect.selectOption('7d')
  await expect(dateSelect).toHaveValue('7d')
})

test('opens the report form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Reportar sem/ }).click()
  await expect(page.getByRole('heading', { name: 'Reportar semáforo' })).toBeVisible()
})
