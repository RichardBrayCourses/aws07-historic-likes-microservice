import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";
import { getParameter } from "./ssm";

type DbCredentials = {
  username: string;
  password: string;
  host: string;
  port?: number;
};

const DEFAULT_DATABASE_NAME = "uptickart";
const secretsClient = new SecretsManagerClient({});

export function getDatabaseName() {
  return process.env.CDK_DATABASE_NAME ?? DEFAULT_DATABASE_NAME;
}

export async function getRdsCredentials() {
  const secretArn = await getParameter("/photos/rds/secret-arn");
  const secretValue = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  if (!secretValue.SecretString) {
    throw new Error("RDS credentials secret did not contain a SecretString.");
  }

  return JSON.parse(secretValue.SecretString) as DbCredentials;
}

export async function createDbClient() {
  const credentials = await getRdsCredentials();
  const client = new Client({
    host: credentials.host,
    port: credentials.port ?? 5432,
    database: getDatabaseName(),
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

export async function deleteRegisteredUsersByEmail(emails: string[]) {
  const client = await createDbClient();

  try {
    await client.query(
      "DELETE FROM registered_user WHERE email = ANY($1::text[])",
      [emails],
    );
  } finally {
    await client.end();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRegisteredUserBySub(sub: string, email: string) {
  const timeoutMs = 30_000;
  const intervalMs = 1_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const client = await createDbClient();

    try {
      const result = await client.query(
        "SELECT 1 FROM registered_user WHERE sub = $1",
        [sub],
      );

      if (result.rowCount && result.rowCount > 0) {
        return;
      }
    } finally {
      await client.end();
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `No database row for ${email} after ${timeoutMs / 1000}s. Check the post-confirmation Lambda.`,
  );
}
