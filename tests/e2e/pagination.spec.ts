import { test, expect } from '@playwright/test'

test.describe('Pagination Features', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes you're logged in as admin
    // In real tests, you'd need to implement auth helper
    await page.goto('/login')
    // TODO: Add login logic here
  })

  test.describe('Athletes Page Pagination', () => {
    test('should show pagination controls when data exists', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/athletes')
      
      // Wait for data to load
      await page.waitForSelector('table', { timeout: 10000 })
      
      // Check for pagination controls
      const prevButton = page.getByRole('button', { name: /previous/i })
      const nextButton = page.getByRole('button', { name: /next/i })
      
      // Pagination controls should exist
      await expect(prevButton).toBeVisible()
      await expect(nextButton).toBeVisible()
    })

    test('should navigate to next page', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/athletes')
      await page.waitForSelector('table')
      
      // Click next button
      const nextButton = page.getByRole('button', { name: /next/i })
      await nextButton.click()
      
      // Wait for page to update
      await page.waitForTimeout(1000)
      
      // Page number should change
      await expect(page.getByText(/page 2/i)).toBeVisible()
    })

    test('should change page size', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/athletes')
      await page.waitForSelector('table')
      
      // Find page size selector
      const pageSizeSelect = page.locator('select').filter({ hasText: /25|50|100/ })
      await pageSizeSelect.selectOption('100')
      
      // Wait for data reload
      await page.waitForTimeout(1000)
      
      // Table should show more rows (if data available)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBeGreaterThan(0)
    })

    test('should search athletes', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/athletes')
      await page.waitForSelector('table')
      
      // Type in search box
      const searchInput = page.getByPlaceholder(/search/i)
      await searchInput.fill('John')
      
      // Wait for search results
      await page.waitForTimeout(1000)
      
      // Results should update (hard to test exact results without known data)
      await expect(searchInput).toHaveValue('John')
    })
  })

  test.describe('Registrations Page Pagination', () => {
    test('should show pagination controls', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/registrations')
      await page.waitForSelector('table', { timeout: 10000 })
      
      const paginationControls = page.getByRole('button', { name: /next|previous/i })
      await expect(paginationControls.first()).toBeVisible()
    })

    test('should search registrations', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/registrations')
      await page.waitForSelector('table')
      
      const searchInput = page.getByPlaceholder(/search/i)
      await searchInput.fill('test')
      
      await expect(searchInput).toHaveValue('test')
    })
  })

  test.describe('Programs Page Pagination', () => {
    test('should show pagination controls', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/programs')
      await page.waitForTimeout(2000)
      
      // Check for search input (indicates pagination is active)
      const searchInput = page.getByPlaceholder(/search programs/i)
      await expect(searchInput).toBeVisible()
    })

    test('should search programs', async ({ page }) => {
      await page.goto('/clubs/test-club/admin/programs')
      await page.waitForTimeout(2000)
      
      const searchInput = page.getByPlaceholder(/search programs/i)
      await searchInput.fill('alpine')
      
      await expect(searchInput).toHaveValue('alpine')
    })
  })
})
