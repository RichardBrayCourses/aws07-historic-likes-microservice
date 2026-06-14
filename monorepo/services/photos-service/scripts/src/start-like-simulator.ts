import { getPhotosServiceBaseUrl, getParameter } from "./lib/ssm";

const SIMULATOR_TICKS = 300;
const TICK_INTERVAL_MS = 250;

async function main() {
  const [
    photosServiceBaseUrl,
    simulatorSecret,
  ] = await Promise.all([
    getPhotosServiceBaseUrl(),
    getParameter("/simulator/secret"),
  ]);

  const deletedLikes = await deleteAllLikes(photosServiceBaseUrl, simulatorSecret);
  console.log(`Requested a full like reset. Deleted ${deletedLikes} like(s).`);
  console.log(`Running ${SIMULATOR_TICKS} simulator ticks.`);

  for (let tick = 1; tick <= SIMULATOR_TICKS; tick += 1) {
    const response = await fetch(
      `${photosServiceBaseUrl}/public/simulation/tick`,
      {
        method: "POST",
        headers: {
          "x-simulator-secret": simulatorSecret,
        },
      },
    );

    if (response.status === 409) {
      console.log(
        `Simulator stopped early at tick ${tick}: no unliked pairs remain.`,
      );
      break;
    }

    if (!response.ok) {
      throw new Error(
        `Simulator tick ${tick} failed with status ${response.status}.`,
      );
    }

    console.log(`Tick ${tick}/${SIMULATOR_TICKS}`);

    if (tick < SIMULATOR_TICKS) {
      await sleep(TICK_INTERVAL_MS);
    }
  }

  console.log("Simulator run complete.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteAllLikes(
  photosServiceBaseUrl: string,
  simulatorSecret: string,
) {
  const response = await fetch(
    `${photosServiceBaseUrl}/public/simulation/likes`,
    {
      method: "DELETE",
      headers: {
        "x-simulator-secret": simulatorSecret,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not reset simulator likes. Status: ${response.status}.`,
    );
  }

  const body = (await response.json()) as { deletedLikes: number };
  return body.deletedLikes;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
