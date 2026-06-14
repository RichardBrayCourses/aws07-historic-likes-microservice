import type { Client } from "pg";

export type PhotoRow = {
  id: number;
  sub: string;
  uuid_filename: string;
  image_name: string;
  image_description: string | null;
  author_nickname: string | null;
  created_at: string;
};

export type LikeToggleRow = {
  liked: boolean;
  image_id: number;
  author_user_id: string;
};

export type UserImagePairRow = {
  user_sub: string;
  image_id: number;
};

export async function listAllPhotos(client: Client) {
  const result = await client.query<PhotoRow>(
    `SELECT id,
            sub,
            uuid_filename,
            image_name,
            image_description,
            NULL AS author_nickname,
            created_at
       FROM images
      ORDER BY created_at DESC`,
  );

  return result.rows;
}

export async function listPhotos(client: Client, search: string) {
  // Trim whitespace so blank or padded searches behave consistently in SQL.
  const term = search.trim();
  const result = await client.query<PhotoRow>(
    `SELECT i.id,
            i.sub,
            i.uuid_filename,
            i.image_name,
            i.image_description,
            u.nickname AS author_nickname,
            i.created_at
       FROM images i
       -- Keep photos even when the uploader profile row is missing.
       LEFT JOIN registered_user u ON i.sub = u.sub
      WHERE $1 = ''
         -- ILIKE '%' || $1 || '%'   matches the term $1 anywhere, ignoring case.
         OR i.image_name ILIKE '%' || $1 || '%'
         OR COALESCE(i.image_description, '') ILIKE '%' || $1 || '%'
         OR COALESCE(u.nickname, '') ILIKE '%' || $1 || '%'
      ORDER BY i.created_at DESC`,
    [term],
  );

  return result.rows;
}

export async function listPhotosForUser(
  client: Client,
  search: string,
  userSub: string,
) {
  // This query adds the current user's like state to each photo row.
  const term = search.trim();
  const result = await client.query<
    PhotoRow & { liked_by_current_user: boolean }
  >(
    `SELECT i.id,
            i.sub,
            i.uuid_filename,
            i.image_name,
            i.image_description,
            u.nickname AS author_nickname,
            i.created_at,
            (l.user_sub IS NOT NULL) AS liked_by_current_user
       FROM images i
       LEFT JOIN registered_user u ON i.sub = u.sub
       -- Match only likes created by the signed-in user.
       LEFT JOIN image_likes l
         ON l.image_id = i.id
        AND l.user_sub = $2
      WHERE $1 = ''
         OR i.image_name ILIKE '%' || $1 || '%'
         OR COALESCE(i.image_description, '') ILIKE '%' || $1 || '%'
         OR COALESCE(u.nickname, '') ILIKE '%' || $1 || '%'
      ORDER BY i.created_at DESC`,
    [term, userSub],
  );

  return result.rows;
}

export async function insertPhoto(
  client: Client,
  photo: {
    sub: string;
    uuidFilename: string;
    imageName: string;
    imageDescription: string | null;
  },
) {
  // Store the metadata after S3 has been assigned a unique object key.
  const result = await client.query<PhotoRow>(
    `INSERT INTO images (sub, uuid_filename, image_name, image_description, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, sub, uuid_filename, image_name, image_description, NULL AS author_nickname, created_at`,
    [photo.sub, photo.uuidFilename, photo.imageName, photo.imageDescription],
  );

  return result.rows[0];
}

export async function toggleLike(
  client: Client,
  userSub: string,
  imageId: number,
) {
  // Keep the delete-or-insert toggle as one database transaction.
  await client.query("BEGIN");

  try {
    // Verify the image exists before touching the likes table.
    const imageResult = await client.query<{ id: number; sub: string }>(
      "SELECT id, sub FROM images WHERE id = $1",
      [imageId],
    );
    const image = imageResult.rows[0];

    if (!image) {
      await client.query("ROLLBACK");
      return null;
    }

    // If a like already exists, deleting it means the photo is now unliked.
    const deleted = await client.query(
      "DELETE FROM image_likes WHERE user_sub = $1 AND image_id = $2",
      [userSub, imageId],
    );

    if ((deleted.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      return {
        liked: false,
        image_id: image.id,
        author_user_id: image.sub,
      } satisfies LikeToggleRow;
    }

    // No existing like was deleted, so create one.
    await client.query(
      "INSERT INTO image_likes (user_sub, image_id, created_at) VALUES ($1, $2, NOW())",
      [userSub, imageId],
    );
    await client.query("COMMIT");

    return {
      liked: true,
      image_id: image.id,
      author_user_id: image.sub,
    } satisfies LikeToggleRow;
  } catch (error) {
    // Any failure should leave the likes table as it was before the toggle.
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function createLike(
  client: Client,
  userSub: string,
  imageId: number,
) {
  await client.query("BEGIN");

  try {
    const imageResult = await client.query<{ id: number; sub: string }>(
      "SELECT id, sub FROM images WHERE id = $1",
      [imageId],
    );
    const image = imageResult.rows[0];

    if (!image) {
      await client.query("ROLLBACK");
      return null;
    }

    const inserted = await client.query(
      `INSERT INTO image_likes (user_sub, image_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_sub, image_id) DO NOTHING`,
      [userSub, imageId],
    );

    await client.query("COMMIT");

    return {
      liked: (inserted.rowCount ?? 0) > 0,
      image_id: image.id,
      author_user_id: image.sub,
    } satisfies LikeToggleRow;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function getRandomSimulatorUserImagePair(client: Client) {
  const result = await client.query<UserImagePairRow>(
    `SELECT u.sub AS user_sub,
            i.id AS image_id
       FROM (
              SELECT sub
                FROM registered_user
               WHERE sub LIKE 'viewer-%'
               ORDER BY RANDOM()
               LIMIT 1
            ) u
       CROSS JOIN (
              SELECT id
                FROM images
               ORDER BY RANDOM()
               LIMIT 1
            ) i`,
  );

  return result.rows[0] ?? null;
}

export async function getRandomUnlikedSimulatorUserImagePair(client: Client) {
  const result = await client.query<UserImagePairRow>(
    `SELECT u.sub AS user_sub,
            i.id AS image_id
       FROM registered_user u
       CROSS JOIN images i
       LEFT JOIN image_likes l
         ON l.user_sub = u.sub
        AND l.image_id = i.id
      WHERE u.sub LIKE 'viewer-%'
        AND l.user_sub IS NULL
      ORDER BY RANDOM()
      LIMIT 1`,
  );

  return result.rows[0] ?? null;
}

export async function deleteAllPhotos(client: Client) {
  const result = await client.query("DELETE FROM images");
  return result.rowCount ?? 0;
}

export async function deleteAllLikes(client: Client) {
  const result = await client.query("DELETE FROM image_likes");
  return result.rowCount ?? 0;
}
