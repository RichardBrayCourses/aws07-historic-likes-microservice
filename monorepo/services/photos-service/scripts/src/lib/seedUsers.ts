export const AUTHOR_COUNT = 3;
export const VIEWER_COUNT = 50;

export type SeedUser = {
  sub: string;
  email: string;
  nickname: string;
};

function buildUsers(
  prefix: string,
  count: number,
  nicknameLabel: string,
): SeedUser[] {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      sub: `${prefix}-${number}`,
      email: `${prefix}-${number}@example.com`,
      nickname: `${nicknameLabel} ${number}`,
    };
  });
}

export function buildSeedAuthors(): SeedUser[] {
  return buildUsers("author", AUTHOR_COUNT, "Author");
}

export function buildSeedViewers(): SeedUser[] {
  return buildUsers("viewer", VIEWER_COUNT, "Viewer");
}

export function buildSeedUsers(): SeedUser[] {
  return [...buildSeedAuthors(), ...buildSeedViewers()];
}

export function pickRandomSeedAuthor(authors: SeedUser[]): SeedUser {
  return authors[Math.floor(Math.random() * authors.length)]!;
}
