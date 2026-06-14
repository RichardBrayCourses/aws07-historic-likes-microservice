import type { Client } from "pg";

export type UserRow = {
  sub: string;
  email: string;
  nickname: string | null;
};

export async function getUserBySub(client: Client, sub: string) {
  const result = await client.query<UserRow>(
    "SELECT sub, email, nickname FROM registered_user WHERE sub = $1",
    [sub],
  );

  return result.rows[0] ?? null;
}

export async function updateUserNickname(
  client: Client,
  sub: string,
  nickname: string | null,
) {
  const result = await client.query<UserRow>(
    "UPDATE registered_user SET nickname = $1 WHERE sub = $2 RETURNING sub, email, nickname",
    [nickname, sub],
  );

  return result.rows[0] ?? null;
}
