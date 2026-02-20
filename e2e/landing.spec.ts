import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads successfully and shows hero content', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    // Page title should contain the app name
    await expect(page).toHaveTitle(/ChessRx|Chess/i)
  })

  test('displays the hero headline', async ({ page }) => {
    await page.goto('/')

    // Check hero headline text is visible
    const headline = page.locator('h1')
    await expect(headline).toBeVisible()
    await expect(headline).toContainText('Your games')
    await expect(headline).toContainText('Your training')
  })

  test('CTA button links to /train', async ({ page }) => {
    await page.goto('/')

    // Find the primary CTA link that goes to /train
    const ctaLink = page.locator('a[href="/train"]').first()
    await expect(ctaLink).toBeVisible()
    await expect(ctaLink).toContainText(/Get Started|Start Training/i)
  })

  test('navigates to /train when CTA is clicked', async ({ page }) => {
    await page.goto('/')

    const ctaLink = page.locator('a[href="/train"]').first()
    await ctaLink.click()

    await expect(page).toHaveURL('/train')
    // Train page should load without error
    await expect(page.locator('h1')).toContainText(/Puzzle/i)
  })

  test('shows the "Early Preview" badge', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Early Preview')).toBeVisible()
  })

  test('subtitle text is present', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText(/AI chess coaching that learns from your actual games/i)
    ).toBeVisible()
  })
})
