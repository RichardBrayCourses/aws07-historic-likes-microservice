import { deleteAllCognitoUsers } from "./lib/cognito";

async function main() {
  const deletedCognitoUsers = await deleteAllCognitoUsers();
  console.log(`Cleared ${deletedCognitoUsers} Cognito user(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
