import {
  AdminAddUserToGroupCommand,
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  deleteRegisteredUsersByEmail,
  waitForRegisteredUserBySub,
} from "./database";
import { getCognitoConfig } from "./ssm";
import { testUsers, type TestUser } from "./testUsers";

const cognitoClient = new CognitoIdentityProviderClient({});

export type CognitoConfig = {
  clientId: string;
  userPoolId: string;
};

async function deleteCognitoUser(config: CognitoConfig, email: string) {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: config.userPoolId,
        Username: email,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "UserNotFoundException") {
      return;
    }

    throw error;
  }
}

async function signUpTestUser(config: CognitoConfig, user: TestUser) {
  await cognitoClient.send(
    new SignUpCommand({
      ClientId: config.clientId,
      Username: user.email,
      Password: user.password,
      UserAttributes: [{ Name: "email", Value: user.email }],
    }),
  );
}

async function confirmTestUser(config: CognitoConfig, email: string) {
  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: config.userPoolId,
      Username: email,
    }),
  );
}

async function verifyTestUserEmail(config: CognitoConfig, email: string) {
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: config.userPoolId,
      Username: email,
      UserAttributes: [{ Name: "email_verified", Value: "true" }],
    }),
  );
}

async function addTestUserToGroup(
  config: CognitoConfig,
  email: string,
  groupName: string,
) {
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: config.userPoolId,
      Username: email,
      GroupName: groupName,
    }),
  );
}

async function getCognitoSub(config: CognitoConfig, email: string) {
  const response = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: config.userPoolId,
      Username: email,
    }),
  );

  const sub = response.UserAttributes?.find((attribute) => attribute.Name === "sub")
    ?.Value;

  if (!sub) {
    throw new Error(`Could not read Cognito sub for ${email}.`);
  }

  return sub;
}

async function createTestUser(config: CognitoConfig, user: TestUser) {
  console.log(`  Creating ${user.email}...`);

  await signUpTestUser(config, user);
  await confirmTestUser(config, user.email);
  await verifyTestUserEmail(config, user.email);

  if (user.groupName) {
    await addTestUserToGroup(config, user.email, user.groupName);
  }

  const sub = await getCognitoSub(config, user.email);

  console.log(`  Waiting for database row for ${user.email}...`);
  await waitForRegisteredUserBySub(sub, user.email);
}

export async function prepareTestUsers() {
  const config = await getCognitoConfig();

  console.log("Preparing test users...");
  console.log("  Deleting old Cognito users...");

  for (const user of testUsers) {
    await deleteCognitoUser(config, user.email);
  }

  console.log("  Deleting old database rows...");
  await deleteRegisteredUsersByEmail(testUsers.map((user) => user.email));

  for (const user of testUsers) {
    await createTestUser(config, user);
  }

  console.log("Test users are ready.");
  console.log("");

  return config;
}

export async function getIdToken(config: CognitoConfig, user: TestUser) {
  const response = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: user.email,
        PASSWORD: user.password,
      },
    }),
  );

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error(`Could not get an ID token for ${user.email}.`);
  }

  return idToken;
}
