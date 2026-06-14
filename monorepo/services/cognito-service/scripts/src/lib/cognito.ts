import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoConfig } from "./ssm";

const cognitoClient = new CognitoIdentityProviderClient({});

export type CognitoConfig = {
  clientId: string;
  userPoolId: string;
};

async function deleteCognitoUser(config: CognitoConfig, username: string) {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: config.userPoolId,
        Username: username,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "UserNotFoundException") {
      return;
    }

    throw error;
  }
}

export async function deleteAllCognitoUsers() {
  const config = await getCognitoConfig();
  let deleted = 0;
  let paginationToken: string | undefined;

  do {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: config.userPoolId,
        PaginationToken: paginationToken,
      }),
    );

    for (const user of response.Users ?? []) {
      if (!user.Username) {
        continue;
      }

      await deleteCognitoUser(config, user.Username);
      deleted += 1;
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return deleted;
}
