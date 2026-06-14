import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

export async function getParameter(name: string) {
  const response = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
    }),
  );

  const value = response.Parameter?.Value;
  if (!value) {
    throw new Error(`SSM parameter ${name} did not contain a value.`);
  }

  return value;
}

export async function getPhotosServiceBaseUrl() {
  const value = process.env.PHOTOS_SERVICE_BASE_URL
    ?? await getParameter("/services/photos-service/base-url");
  return value.replace(/\/+$/, "");
}

export async function getCognitoConfig() {
  const [clientId, userPoolId] = await Promise.all([
    getParameter("/cognito/client-id"),
    getParameter("/cognito/user-pool-id"),
  ]);

  return {
    clientId,
    userPoolId,
  };
}
