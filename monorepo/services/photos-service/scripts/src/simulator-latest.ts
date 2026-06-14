import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createDbClient } from "./lib/database";
import { getParameter } from "./lib/ssm";

type SimulatorLikeSummary = {
  simulator_users: string;
  active_likes: string;
  latest_like_created_at: Date | null;
};

type RecentLikeRow = {
  user_sub: string;
  image_id: number;
  image_name: string;
  created_at: Date;
};

type LikeBucketRow = {
  imageId?: string;
  userId?: string;
  bucketId?: number;
  likesDelta?: number;
};

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function main() {
  const [
    simulatorSummary,
    recentLikes,
    photoLikesTableName,
    authorLikesTableName,
  ] = await Promise.all([
    getSimulatorSummary(),
    getRecentSimulatorLikes(),
    getParameter("/historic-likes/photo-bucket-likes-table-name"),
    getParameter("/historic-likes/author-bucket-likes-table-name"),
  ]);

  const [photoBuckets, authorBuckets] = await Promise.all([
    getLatestBuckets(photoLikesTableName),
    getLatestBuckets(authorLikesTableName),
  ]);

  printReport({
    simulatorSummary,
    recentLikes,
    photoLikesTableName,
    authorLikesTableName,
    photoBuckets,
    authorBuckets,
  });
}

async function getSimulatorSummary() {
  const client = await createDbClient();

  try {
    const result = await client.query<SimulatorLikeSummary>(
      `SELECT
          (SELECT COUNT(*) FROM registered_user WHERE sub LIKE 'viewer-%') AS simulator_users,
          (SELECT COUNT(*) FROM image_likes WHERE user_sub LIKE 'viewer-%') AS active_likes,
          (SELECT MAX(created_at AT TIME ZONE 'UTC') FROM image_likes WHERE user_sub LIKE 'viewer-%') AS latest_like_created_at`,
    );

    return result.rows[0];
  } finally {
    await client.end();
  }
}

async function getRecentSimulatorLikes() {
  const client = await createDbClient();

  try {
    const result = await client.query<RecentLikeRow>(
      `SELECT l.user_sub,
              l.image_id,
              i.image_name,
              l.created_at AT TIME ZONE 'UTC' AS created_at
         FROM image_likes l
         JOIN images i ON i.id = l.image_id
        WHERE l.user_sub LIKE 'viewer-%'
        ORDER BY l.created_at DESC
        LIMIT 5`,
    );

    return result.rows;
  } finally {
    await client.end();
  }
}

async function getLatestBuckets(tableName: string) {
  const rows: LikeBucketRow[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    rows.push(...((response.Items ?? []) as LikeBucketRow[]));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  const sortedRows = rows
    .filter((row) => row.bucketId !== undefined)
    .sort((left, right) => Number(right.bucketId) - Number(left.bucketId));
  const latestBucket = sortedRows[0]?.bucketId;

  if (latestBucket === undefined) {
    return {
      latestBucket: null,
      rows: [] as LikeBucketRow[],
      netLikesDelta: 0,
    };
  }

  const latestRows = sortedRows.filter((row) => row.bucketId === latestBucket);

  return {
    latestBucket,
    rows: latestRows,
    netLikesDelta: latestRows.reduce(
      (total, row) => total + Number(row.likesDelta ?? 0),
      0,
    ),
  };
}

function printReport(report: {
  simulatorSummary: SimulatorLikeSummary;
  recentLikes: RecentLikeRow[];
  photoLikesTableName: string;
  authorLikesTableName: string;
  photoBuckets: Awaited<ReturnType<typeof getLatestBuckets>>;
  authorBuckets: Awaited<ReturnType<typeof getLatestBuckets>>;
}) {
  console.log("Latest simulator data");
  console.log("");
  console.log("Simulator users:");
  console.log(`  ${report.simulatorSummary.simulator_users} rows found`);
  console.log("");
  console.log("Current Postgres likes:");
  console.log(`  ${report.simulatorSummary.active_likes} active simulator likes`);
  console.log(
    `  latest active like: ${
      report.simulatorSummary.latest_like_created_at?.toISOString() ?? "none"
    }`,
  );
  printRecentLikes(report.recentLikes);
  console.log("");
  printBucketSummary(
    "Historic photo bucket likes",
    report.photoLikesTableName,
    "imageId",
    report.photoBuckets,
  );
  console.log("");
  printBucketSummary(
    "Historic author bucket likes",
    report.authorLikesTableName,
    "userId",
    report.authorBuckets,
  );
}

function printRecentLikes(recentLikes: RecentLikeRow[]) {
  if (recentLikes.length === 0) {
    return;
  }

  console.log("  latest active rows:");
  for (const like of recentLikes) {
    console.log(
      `    ${like.user_sub} -> image ${like.image_id} (${like.image_name}) at ${like.created_at.toISOString()}`,
    );
  }
}

function printBucketSummary(
  title: string,
  tableName: string,
  keyName: "imageId" | "userId",
  buckets: Awaited<ReturnType<typeof getLatestBuckets>>,
) {
  console.log(`${title}:`);
  console.log(`  table: ${tableName}`);

  if (!buckets.latestBucket) {
    console.log("  latest bucket: none");
    return;
  }

  console.log(`  latest bucket: ${buckets.latestBucket}`);
  console.log(`  rows in latest bucket: ${buckets.rows.length}`);
  console.log(`  net likesDelta in latest bucket: ${buckets.netLikesDelta}`);
  console.log("  latest bucket rows:");

  for (const row of buckets.rows.slice(0, 5)) {
    console.log(
      `    ${keyName}=${row[keyName]} likesDelta=${Number(row.likesDelta ?? 0)}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
