import { clearDynamoTable, purgeHistoricLikesQueue } from "./lib/dynamoCleanup";
import { getParameter } from "./lib/ssm";

async function main() {
  const [
    historicLikesQueueUrl,
    usersTableName,
    imagesTableName,
    photoLikesTableName,
    authorLikesTableName,
  ] = await Promise.all([
    getParameter("/historic-likes/queue-url"),
    getParameter("/historic-likes/users-table-name"),
    getParameter("/historic-likes/images-table-name"),
    getParameter("/historic-likes/photo-bucket-likes-table-name"),
    getParameter("/historic-likes/author-bucket-likes-table-name"),
  ]);

  await purgeHistoricLikesQueue(historicLikesQueueUrl);

  const [userProjections, imageProjections, photoRows, authorRows] =
    await Promise.all([
      clearDynamoTable(usersTableName, ["userId"]),
      clearDynamoTable(imagesTableName, ["imageId"]),
      clearDynamoTable(photoLikesTableName, ["imageId", "bucketId"]),
      clearDynamoTable(authorLikesTableName, ["userId", "bucketId"]),
    ]);

  console.log(`Cleared ${userProjections} user projection row(s).`);
  console.log(`Cleared ${imageProjections} image projection row(s).`);
  console.log(
    `Cleared ${photoRows + authorRows} historic like bucket row(s).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
