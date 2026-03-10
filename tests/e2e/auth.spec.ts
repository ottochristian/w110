import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login or show login form
    await expect(page).toHaveURL(/\/(login|$)/)
    
    // Login page should have email and password fields
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByLabel(/password/i)
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('textbox', { name: /email/i }).fill('invalid-email')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    
    // Should show validation error
    await expect(page.getByText(/invalid email|email address/i)).toBeVisible()
  })

  test('should require password', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('textbox', { name: /email/i }).fill('user@example.com')
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    
    // Should show password required error
    await expect(page.getByText(/password.*required/i)).toBeVisible()
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing admin routes', async ({ page }) => {
    // Try accessing admin page without auth
    await page.goto('/admin/athletes')
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('should redirect to login when accessing parent routes', async ({ page }) => {
    await page.goto('/clubs/test-club/parent/athletes')
    
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.checks).toBeDefined()
    expect(data.checks.environment).toBeDefined()
  })
})
