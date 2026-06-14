export const ADMIN_GROUP_NAME = "administrators";

export type TestUser = {
  email: string;
  password: string;
  groupName?: string;
};

export const regularTestUser: TestUser = {
  email: process.env.COGNITO_TEST_USER_EMAIL ?? "test-user@example.com",
  password: process.env.COGNITO_TEST_USER_PASSWORD ?? "TestUserPassword123!",
};

export const adminTestUser: TestUser = {
  email: process.env.COGNITO_TEST_ADMIN_EMAIL ?? "test-admin@example.com",
  password: process.env.COGNITO_TEST_ADMIN_PASSWORD ?? "TestAdminPassword123!",
  groupName: ADMIN_GROUP_NAME,
};

export const testUsers = [regularTestUser, adminTestUser];
