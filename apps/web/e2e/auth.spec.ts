import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should redirect unauthenticated user to login', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('should allow successful login as employee', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'employee@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/');
        await expect(page.getByText("Work Status for Today")).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'employee@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        await expect(page.getByText('Invalid credentials or server error')).toBeVisible();
    });

    test('should allow logout', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[name="email"]', 'employee@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Logout
        await page.getByRole('button', { name: "Toggle user menu" }).click();
        await page.getByText('Logout').click();

        await expect(page).toHaveURL('/login');
    });
});
