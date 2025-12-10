import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
    test('should not access user management as employee', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'employee@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        await page.goto('/admin/users');
        // Should redirect to dashboard or show 403/NotFound or stay on dashboard
        // Current implementation redirects non-admins to /login or dashboard?
        // Assuming protection redirects to / or /login.
        // Let's check typical behavior.
        // If it redirects to /, URL should be /.
        await expect(page).not.toHaveURL('/admin/users');
    });

    test('should access user management as admin', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');

        // Verify Admin visible in sidebar (optimistic)
        // await page.click('text=Admin'); 

        await page.goto('/admin/users');
        await expect(page).toHaveURL('/admin/users');
        await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible();
    });
});
