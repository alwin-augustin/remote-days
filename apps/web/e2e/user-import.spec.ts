import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('User Import', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@example.com');
        await page.fill('input[type="password"]', 'admin123'); // Assuming standard seed pass
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test('should navigate to import page and upload csv', async ({ page }) => {
        await page.goto('/admin/users');
        await page.click('text=Import CSV');
        await expect(page).toHaveURL('/admin/users/import');

        // Create a dummy CSV file
        const uploadDir = 'test-uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        const filePath = path.join(uploadDir, 'users.csv');
        fs.writeFileSync(filePath, 'email,first_name,last_name,country_of_residence,work_country\ne2e.test@example.com,E2E,Test,FR,FR');

        // Upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Click Import
        await page.click('button:has-text("Import Users")');

        // Check for success
        await expect(page.locator('text=Successfully Imported')).toBeVisible();
        await expect(page.locator('text=1')).toBeVisible(); // Total Processed: 1

        // Cleanup
        fs.unlinkSync(filePath);
        fs.rmdirSync(uploadDir);
    });

    test('should display errors for invalid csv', async ({ page }) => {
        await page.goto('/admin/users/import');

        const uploadDir = 'test-uploads-err';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        const filePath = path.join(uploadDir, 'invalid.csv');
        fs.writeFileSync(filePath, 'email,first_name,last_name,country_of_residence,work_country\ninvalid-email,Bad,User,FR,FR');

        await page.locator('input[type="file"]').setInputFiles(filePath);
        await page.click('button:has-text("Import Users")');

        // Check for error
        await expect(page.locator('text=Import completed with errors')).toBeVisible();
        await expect(page.locator('text=Errors')).toBeVisible();
        await expect(page.locator('td:has-text("invalid-email")')).toBeVisible();

        // Cleanup
        fs.unlinkSync(filePath);
        fs.rmdirSync(uploadDir);
    });
});
