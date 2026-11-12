import { test, expect } from '@playwright/test'

// El popup de bienvenida (OnboardingModal) tapa la app en la primera visita;
// lo marcamos como visto para que no intercepte los clics de los tests.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('semaforo-alerta:onboarding-seen:v1', '1')
  })
})

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
  // En mapa + mobile la franja de escritorio se oculta (resumen flotante);
  // la barra de Lista tiene el selector de fecha en cualquier ancho.
  await page.getByRole('button', { name: /Lista/ }).click()
  const dateSelect = page.locator('label[title="Filtrar por antigüedad del reporte"] select')
  await expect(dateSelect).toBeVisible()
  await dateSelect.selectOption('7d')
  await expect(dateSelect).toHaveValue('7d')
})

test('report form leads with photo, then Peru location dropdowns', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Reportar sem/ }).click()
  await expect(page.getByRole('heading', { name: 'Reportar semáforo' })).toBeVisible()
  // Foto primero: dos botones directos, cámara y galería.
  await expect(page.getByRole('button', { name: /Tomar foto/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Elegir de galería/ })).toBeVisible()
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

test('a flagged report shows a badge, remembers the flag, and hides at 2 flags', async ({ page }) => {
  await page.goto('/')
  page.on('dialog', (d) => d.accept())
  await page.getByRole('button', { name: /Lista/ }).click()
  // La lista va del más reciente al más antiguo: trabajamos con el primero.
  // (Varios reportes pueden compartir el mismo cruce, así que no usamos el título.)
  const firstCard = page.locator('.card').first()
  await firstCard.click()
  await page.getByRole('button', { name: /Reportar contenido/ }).click()
  await expect(page.getByText(/Gracias\. Un revisor/)).toBeVisible()

  // Cerrar y reabrir: ya no ofrece el botón, muestra el aviso.
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(firstCard.getByText('Marcado · en revisión')).toBeVisible()
  await firstCard.click()
  await expect(page.getByText('Ya reportaste este contenido · en revisión')).toBeVisible()
  await expect(page.getByRole('button', { name: /Reportar contenido/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar' }).click()

  // Simula un 2º reporte (desde otro dispositivo) directo en el almacenamiento
  // demo, sobre el reporte más reciente (el que marcamos).
  const before = await page.locator('.card').count()
  await page.evaluate(() => {
    const key = 'semaforo-alerta:incidents:v2'
    const list = JSON.parse(localStorage.getItem(key))
    const newest = list.reduce((a, b) => (new Date(b.createdAt) > new Date(a.createdAt) ? b : a))
    newest.flags = 2
    newest.hidden = true
    localStorage.setItem(key, JSON.stringify(list))
  })
  await page.reload()
  await page.getByRole('button', { name: /Lista/ }).click()
  await expect(page.locator('.card')).toHaveCount(before - 1)
  await page.getByLabel(/Mostrar ocultos por la comunidad/).check()
  await expect(page.locator('.card').first().getByText('Oculto · en revisión')).toBeVisible()
})
