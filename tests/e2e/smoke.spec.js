import { test, expect } from '@playwright/test'

test('loads in demo mode with the seeded data', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/SemáforoAlerta/)
  // La config de Playwright fuerza el modo demo -> aparece la etiqueta "Demo".
  await expect(page.getByText(/Demo/)).toBeVisible()
})

test('can switch between the three main views', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Lista/ }).click()
  await expect(page.getByText(/incidencia\(s\)/)).toBeVisible()
  await page.getByRole('button', { name: /Transparencia/ }).click()
  await page.getByRole('button', { name: /Mapa/ }).click()
})

test('opens the "Acerca de" modal from the topbar', async ({ page }) => {
  await page.goto('/')
  // Acerca de ya no es una pestaña: es un modal que abre el ícono ⓘ.
  await page.getByRole('button', { name: 'Acerca de' }).click()
  await expect(page.getByRole('heading', { name: 'Acerca de' })).toBeVisible()
  await expect(page.getByText('Quién está detrás')).toBeVisible()
  // El enlace de LinkedIn ahora es público.
  await expect(page.getByRole('link', { name: /LinkedIn/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('heading', { name: 'Acerca de' })).toBeHidden()
})

test('date-range filter is available', async ({ page }) => {
  await page.goto('/')
  const dateSelect = page.locator('.date-select')
  await expect(dateSelect).toBeVisible()
  await dateSelect.selectOption('7d')
  await expect(dateSelect).toHaveValue('7d')
})

test('report form leads with photo, then Peru location dropdowns', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Reportar sem/ }).click()
  await expect(page.getByRole('heading', { name: 'Reportar semáforo' })).toBeVisible()
  // Foto primero: un solo botón que sirve para cámara o galería.
  await expect(page.getByRole('button', { name: /Añadir foto/ })).toBeVisible()
  // Ubicación a nivel país: desplegable de Departamento con datos del Perú.
  const depto = page.getByLabel('Departamento')
  await expect(depto).toBeVisible()
  await depto.selectOption('LIMA')
  const prov = page.getByLabel('Provincia')
  await prov.selectOption('LIMA')
  const dist = page.getByLabel('Distrito')
  await dist.selectOption('MIRAFLORES')
  await expect(dist).toHaveValue('MIRAFLORES')
})

test('phone back button closes an open modal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Reportar sem/ }).click()
  await expect(page.getByRole('heading', { name: 'Reportar semáforo' })).toBeVisible()
  // El botón "atrás" del navegador/teléfono debe cerrar el modal, no salir.
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Reportar semáforo' })).toBeHidden()
})

test('can flag an incident as abuse from its detail', async ({ page }) => {
  await page.goto('/')
  // Aceptamos el diálogo de confirmación del navegador.
  page.on('dialog', (d) => d.accept())
  await page.getByRole('button', { name: /Lista/ }).click()
  await page.locator('.card').first().click()
  const flagBtn = page.getByRole('button', { name: /Reportar contenido/ })
  await expect(flagBtn).toBeVisible() // el detalle abrió
  await flagBtn.click()
  await expect(page.getByText(/Gracias\. Un revisor/)).toBeVisible()
})
