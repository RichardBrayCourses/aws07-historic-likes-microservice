import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { execSync } from "node:child_process";
import { createDbClient } from "./lib/database";
import { getParameter } from "./lib/ssm";

const SYSTEM_USER = {
  sub: "system",
  email: "system@example.com",
  nickname: "system",
};

const s3Client = new S3Client({});
const serviceRoot = process.cwd();

async function main() {
  console.log("Ensuring database schema is up to date...");
  execSync("pnpm run database:migrate", {
    stdio: "inherit",
    cwd: serviceRoot,
  });
  console.log("");

  const bucketName = await getParameter("/photos/images/bucket-name");
  const client = await createDbClient();

  try {
    const deletedLikes = await clearPostgresTable(client, "image_likes");
    console.log(`Cleared ${deletedLikes} row(s) from image_likes.`);

    const deletedImages = await clearPostgresTable(client, "images");
    console.log(`Cleared ${deletedImages} row(s) from images.`);

    const deletedUsers = await clearPostgresTable(client, "registered_user");
    console.log(`Cleared ${deletedUsers} row(s) from registered_user.`);

    await restoreSystemUser(client);
    console.log("Restored system user (post-migration baseline).");
  } finally {
    await client.end();
  }

  const deletedS3Objects = await clearBucket(bucketName);
  console.log(`Cleared ${deletedS3Objects} object(s) from S3.`);
}

async function clearPostgresTable(
  client: Awaited<ReturnType<typeof createDbClient>>,
  tableName: "image_likes" | "images" | "registered_user",
) {
  const result = await client.query(`DELETE FROM ${tableName}`);
  return result.rowCount ?? 0;
}

async function restoreSystemUser(
  client: Awaited<ReturnType<typeof createDbClient>>,
) {
  await client.query(
    `INSERT INTO registered_user (sub, email, nickname)
     VALUES ($1, $2, $3)`,
    [SYSTEM_USER.sub, SYSTEM_USER.email, SYSTEM_USER.nickname],
  );
}

async function clearBucket(bucketName: string) {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = (response.Contents ?? [])
      .filter((object) => object.Key)
      .map((object) => ({ Key: object.Key! }));

    if (objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objects },
        }),
      );
      deleted += objects.length;
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return deleted;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
