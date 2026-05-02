import { expect, test, type Page } from '@playwright/test'

const getEventLogItems = (page: Page) => page.locator('[data-testid="event-log"] li')
const getEventText = async (page: Page, index: number) =>
  (await getEventLogItems(page).nth(index).textContent()) ?? ''
const getRequestId = (value: string) => value.match(/\(([^)]+)\)/)?.[1] ?? ''
const getBaseUrl = (page: Page) => new URL(page.url()).origin
const hydrationErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  hydrationErrors.set(page, errors)
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('A tree hydrated')) {
      errors.push(message.text())
    }
  })

  await page.goto('/todos')
})

test.afterEach(async ({ page }) => {
  expect(hydrationErrors.get(page) ?? []).toEqual([])
})

test('dirty todo drafts block anchor navigation until the user confirms', async ({ page }) => {
  const baseUrl = getBaseUrl(page)
  await page.getByLabel('Task title').fill('Document the route event lifecycle - edited')
  await expect(page.getByTestId('dirty-status')).toContainText('Unsaved draft')

  await page.getByRole('link', { name: 'Insights' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
  await expect(page).toHaveURL(`${baseUrl}/todos`)
  await expect(getEventLogItems(page).nth(0)).toContainText(`before anchor ${baseUrl}/insights`)

  await page.getByTestId('stay-on-page').click()
  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeHidden()
  await expect(page).toHaveURL(`${baseUrl}/todos`)

  await page.getByRole('link', { name: 'Insights' }).click()
  await page.getByTestId('discard-and-leave').click()
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()

  const complete = await getEventText(page, 0)
  const start = await getEventText(page, 1)
  const before = await getEventText(page, 2)
  const requestId = getRequestId(before)

  expect(requestId).not.toBe('')
  expect(getRequestId(start)).toBe(requestId)
  expect(getRequestId(complete)).toBe(requestId)
  expect(complete).toContain(`complete anchor ${baseUrl}/insights`)
})

test('saved drafts can navigate without the guard dialog', async ({ page }) => {
  await page.getByLabel('Task title').fill('Publish a polished hosted example')
  await page.getByLabel('Task notes').fill('A realistic app beats a bag of buttons.')
  await page.getByTestId('priority-high').click()
  await page.getByTestId('save-draft').click()

  await expect(page.getByTestId('dirty-status')).toContainText('All changes saved')
  await page.getByRole('link', { name: 'About' }).click()

  await expect(page.getByRole('heading', { name: 'Integration notes' })).toBeVisible()
  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeHidden()
  await expect(getEventLogItems(page).nth(0)).toContainText('complete anchor')
})

test('router.push and router.replace drive route events and progress state', async ({ page }) => {
  const baseUrl = getBaseUrl(page)

  await page.getByTestId('router-push-insights').click()
  await expect(page.getByTestId('route-progress')).not.toHaveAttribute('data-state', 'idle')
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()

  const pushComplete = await getEventText(page, 0)
  const pushStart = await getEventText(page, 1)
  const pushBefore = await getEventText(page, 2)
  const pushRequestId = getRequestId(pushBefore)

  expect(getRequestId(pushStart)).toBe(pushRequestId)
  expect(getRequestId(pushComplete)).toBe(pushRequestId)
  expect(pushComplete).toContain(`complete router.push ${baseUrl}/insights?via=router-push`)

  await page.getByTestId('router-replace-about').click()
  await expect(page.getByRole('heading', { name: 'Integration notes' })).toBeVisible()
  await expect(getEventLogItems(page).nth(0)).toContainText(
    `complete router.replace ${baseUrl}/about?via=router-replace`
  )
  await expect(page.getByTestId('route-progress')).toHaveAttribute('data-state', 'idle')
})

test('browser history navigation is guarded through popstate when the draft is dirty', async ({
  page,
}) => {
  const baseUrl = getBaseUrl(page)

  await page.getByRole('link', { name: 'Insights' }).click()
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Todo Studio', exact: true })).toBeVisible()

  await page.getByLabel('Task title').fill('Dirty draft before forward history')
  await page.goForward()

  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
  await expect(page).toHaveURL(`${baseUrl}/todos`)
  await page.getByTestId('discard-and-leave').click()
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()
  await expect(getEventLogItems(page).nth(0)).toContainText('complete popstate')
  await expect(getEventLogItems(page).nth(0)).toContainText('delta=1')
})

test('wrapped router back and forward preserve source metadata', async ({ page }) => {
  await page.getByRole('link', { name: 'Insights' }).click()
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'Integration notes' })).toBeVisible()

  await page.getByTestId('clear-log').click()
  await page.getByTestId('router-back').click()
  await expect(page.getByRole('heading', { name: 'Todo insights' })).toBeVisible()
  await expect(getEventLogItems(page).nth(0)).toContainText('complete router.back')
  await expect(getEventLogItems(page).nth(0)).toContainText('delta=-1')

  await page.getByTestId('router-forward').click()
  await expect(page.getByRole('heading', { name: 'Integration notes' })).toBeVisible()
  await expect(getEventLogItems(page).nth(0)).toContainText('complete router.forward')
  await expect(getEventLogItems(page).nth(0)).toContainText('delta=1')
})

test('blank links keep the current dirty draft open without route events', async ({
  page,
  context,
}) => {
  await page.getByLabel('Task title').fill('Dirty draft for ignored links')
  const initialLogCount = await getEventLogItems(page).count()

  const popupPromise = context.waitForEvent('page')
  await page.getByTestId('blank-link').click()
  const popup = await popupPromise
  await popup.close()

  await expect(getEventLogItems(page)).toHaveCount(initialLogCount)
  await expect(page.getByTestId('dirty-status')).toContainText('Unsaved draft')
})

test('ignored document links are guarded outside the package route event flow', async ({
  page,
}) => {
  const initialLogCount = await getEventLogItems(page).count()
  await page.getByLabel('Task title').fill('Dirty draft for ignored document navigation')
  await page.getByTestId('ignored-link').click()

  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
  await expect(getEventLogItems(page)).toHaveCount(initialLogCount)
  await page.getByTestId('discard-and-leave').click()
  await expect(page.getByRole('heading', { name: 'Integration notes' })).toBeVisible()
})

test('external same-tab links are guarded before leaving the app', async ({ page }) => {
  await page.route('https://example.com/', async (route) => {
    await route.fulfill({
      status: 200,
      body: '<html><body><h1>External page</h1></body></html>',
      contentType: 'text/html',
    })
  })

  await page.getByLabel('Task title').fill('Dirty draft before external navigation')
  await page.getByTestId('external-link').click()

  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
  await page.getByTestId('stay-on-page').click()
  await expect(page.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeHidden()
  await expect(page.getByTestId('dirty-status')).toContainText('Unsaved draft')

  await page.getByTestId('external-link').click()
  await page.getByTestId('discard-and-leave').click()
  await expect(page.getByRole('heading', { name: 'External page' })).toBeVisible()
})

test('refresh uses the browser beforeunload confirmation while the draft is dirty', async ({
  page,
}) => {
  await page.getByLabel('Task title').fill('Dirty draft before refresh')

  const prevented = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent

    window.dispatchEvent(event)
    return event.defaultPrevented
  })

  expect(prevented).toBe(true)
  await expect(page.getByTestId('dirty-status')).toContainText('Unsaved draft')
})
