import { test, expect } from '@playwright/test';

test.describe('Employee Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'employee@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should display dashboard correctly', async ({ page }) => {
        await expect(page.getByText("Work Status for Today")).toBeVisible();
        await expect(page.getByText("Remote Days")).toBeVisible();
    });

    test('should navigate to calendar', async ({ page }) => {
        await page.click('a[href="/calendar"]'); // Assuming Sidebar link
        await expect(page).toHaveURL('/calendar');
        await expect(page.getByText('Monthly Overview')).toBeVisible();
        await expect(page.locator('.rdp-month')).toBeVisible(); // Check for calendar grid
    });
});
