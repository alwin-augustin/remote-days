export async function setup() {
  // Mocking should be done in test files or by configuring mocks in vitest.config.ts
  // vi.mock('../src/services/email.service', () => ({
  //   emailService: {
  //     sendEmail: vi.fn().mockResolvedValue(true),
  //   },
  // }));
}

export async function teardown() {
  // Global teardown logic if needed
}
