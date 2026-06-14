# AWS 07 - Historic Likes Microservice

This version is the architecture reset. The application moves from shared backend ownership into independently deployable services and apps, with each CDK stack living beside the service or app that owns it.

## What changed in this version

- `services/photos-service` owns the photo API, S3 image storage, RDS schema, Cognito signup consumer, simulator, and photo like event publishing.
- `services/historic-likes-service` owns historic like projections and chart APIs.
- `services/cognito-service` owns Cognito infrastructure and user test/bootstrap scripts.
- `apps/ui` owns the website hosting stack and UI deployment scripts.
- The old central `cdk` folder is removed; each deployable unit has its own `cdk` folder.
- The old API/core service is now named `photos-service`.
- Realtime likes are not present yet; that is introduced in version 08.

## Deployable units

- `apps/ui`
- `services/cognito-service`
- `services/photos-service`
- `services/historic-likes-service`

Each unit can be deployed independently:

```bash
pnpm -C services/photos-service run deploy
pnpm -C services/historic-likes-service run deploy
pnpm -C services/cognito-service run deploy
pnpm -C apps/ui run deploy
```

Or deploy the full version:

```bash
pnpm run deploy-everything
pnpm run generate-env
pnpm run website:deploy
```

## Local workflow

```bash
pnpm install
pnpm run type-check
pnpm run bootstrap-up
pnpm run data:seed
pnpm run simulator:start
```

The UI reads service endpoints from SSM via:

```bash
pnpm -C apps/ui run generate-env
```

## Structure

```text
apps/ui/cdk
services/cognito-service/cdk
services/photos-service/cdk
services/historic-likes-service/cdk
packages/events
scripts
```

