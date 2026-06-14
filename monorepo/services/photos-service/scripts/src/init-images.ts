import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  EVENT_DETAIL_TYPES,
  EVENT_SOURCES,
  type PhotosImageProjectionEvent,
  type PhotosUserProjectionEvent,
} from "@uptick/events";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDbClient } from "./lib/database";
import {
  buildSeedAuthors,
  buildSeedUsers,
  pickRandomSeedAuthor,
  type SeedUser,
} from "./lib/seedUsers";
import { getParameter } from "./lib/ssm";

const DEFAULT_DESCRIPTION = "Seed artwork";

const s3Client = new S3Client({});
const eventBridgeClient = new EventBridgeClient({});

function contentTypeFor(fileName: string) {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function titleFor(fileName: string) {
  return parse(fileName)
    .name.replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 40);
}

function keyFor(fileName: string, index: number) {
  const safeName = parse(fileName)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = `seed-${String(index + 1).padStart(2, "0")}-`;

  return `${prefix}${safeName}`.slice(0, 36);
}

export async function initImages() {
  const bucketName = await getParameter("/photos/images/bucket-name");
  const eventBusName = await getParameter("/photos/events/event-bus-name");
  const photosDir = resolve(
    process.env.PHOTOS_DIR ?? "../../../photos-to-upload",
  );
  const photoNames = (await readdir(photosDir))
    .filter((name) => !name.startsWith("."))
    .sort();

  if (photoNames.length === 0) {
    throw new Error(`No photos found in ${photosDir}.`);
  }

  const seedUsers = buildSeedUsers();
  const seedAuthors = buildSeedAuthors();
  const client = await createDbClient();

  try {
    await seedUsersInDatabase(client, eventBusName, seedUsers);

    for (const [index, photoName] of photoNames.entries()) {
      const author = pickRandomSeedAuthor(seedAuthors);
      const key = keyFor(photoName, index);
      const title = titleFor(photoName);
      const contentType = contentTypeFor(photoName);
      const body = await readFile(join(photosDir, photoName));

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      const imageResult = await client.query<{ id: number }>(
        `INSERT INTO images (sub, uuid_filename, image_name, image_description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (uuid_filename) DO UPDATE
         SET sub = EXCLUDED.sub,
             image_name = EXCLUDED.image_name,
             image_description = EXCLUDED.image_description
         RETURNING id`,
        [author.sub, key, title, DEFAULT_DESCRIPTION],
      );
      const imageId = String(imageResult.rows[0].id);
      await publishEvent(
        eventBusName,
        EVENT_SOURCES.photos,
        EVENT_DETAIL_TYPES.imageCreated,
        {
          eventType: EVENT_DETAIL_TYPES.imageCreated,
          imageId,
          authorUserId: author.sub,
          title,
          description: DEFAULT_DESCRIPTION,
          occurredAt: new Date().toISOString(),
        } satisfies PhotosImageProjectionEvent,
      );

      console.log(`Seeded ${photoName} as ${key} (author: ${author.sub})`);
    }

    console.log(
      `Seeded ${photoNames.length} image(s) across ${seedAuthors.length} author(s).`,
    );
  } finally {
    await client.end();
  }
}

async function seedUsersInDatabase(
  client: Awaited<ReturnType<typeof createDbClient>>,
  eventBusName: string,
  seedUsers: SeedUser[],
) {
  for (const user of seedUsers) {
    await client.query(
      `INSERT INTO registered_user (sub, email, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (sub) DO UPDATE
       SET email = EXCLUDED.email,
           nickname = EXCLUDED.nickname`,
      [user.sub, user.email, user.nickname],
    );
    await publishEvent(
      eventBusName,
      EVENT_SOURCES.photos,
      EVENT_DETAIL_TYPES.userCreated,
      {
        eventType: EVENT_DETAIL_TYPES.userCreated,
        userId: user.sub,
        email: user.email,
        nickname: user.nickname,
        occurredAt: new Date().toISOString(),
      } satisfies PhotosUserProjectionEvent,
    );
  }

  console.log(`Seeded ${seedUsers.length} seed user(s).`);
}

async function publishEvent(
  eventBusName: string,
  source: string,
  detailType: string,
  detail: unknown,
) {
  await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
        },
      ],
    }),
  );
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  initImages().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
