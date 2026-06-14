import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Client } from "pg";

type DbCredentials = {
  username: string;
  password: string;
  host: string;
  port?: number;
};

const secretsClient = new SecretsManagerClient({});
const ssmClient = new SSMClient({});

let credentials: DbCredentials | undefined;

async function getRdsCredentials() {
  if (credentials) return credentials;

  const parameterResponse = await ssmClient.send(
    new GetParameterCommand({ Name: "/photos/rds/secret-arn" }),
  );
  const secretArn = parameterResponse.Parameter?.Value;

  if (!secretArn) {
    throw new Error("SSM parameter /photos/rds/secret-arn did not contain a value.");
  }

  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  if (!secretResponse.SecretString) {
    throw new Error("RDS credentials secret did not contain a SecretString.");
  }

  credentials = JSON.parse(secretResponse.SecretString) as DbCredentials;
  return credentials;
}

export async function createDbClient() {
  const databaseName = process.env.DATABASE_NAME;

  if (!databaseName) {
    throw new Error("DATABASE_NAME environment variable is not configured.");
  }

  const rdsCredentials = await getRdsCredentials();
  const client = new Client({
    host: rdsCredentials.host,
    port: rdsCredentials.port ?? 5432,
    database: databaseName,
    user: rdsCredentials.username,
    password: rdsCredentials.password,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}
