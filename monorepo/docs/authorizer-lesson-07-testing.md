# Authorizer Lesson 07: Testing

This lesson keeps the completed authorizer implementation and adds scripts that test the deployed security behavior.

The application still uses:

```text
/public/{proxy+}
  Anonymous access allowed

/auth/{proxy+}
  Cognito login required
```

Inside the `/auth` zone, Express also checks Cognito group claims for administrator routes.

## Runtime Security Model

API Gateway checks authentication:

```text
/public/*
  No Cognito token required

/auth/*
  Valid Cognito token required
```

Express checks application authorization:

```text
/auth/photos/*
  Any signed-in user

/auth/admin/*
  Signed-in user in the administrators group
```

The administrator group comes from Cognito:

```ts
new CfnUserPoolGroup(this, "AdministratorsGroup", {
  userPoolId: userPool.userPoolId,
  groupName: "administrators",
  description: "Administrator users",
});
```

The Express middleware reads the claims that API Gateway provides to Lambda:

```ts
const claims = invoke?.event?.requestContext?.authorizer?.claims;
```

Then it checks the `cognito:groups` claim for administrator access.

## Test Tooling

This lesson adds TypeScript command-line scripts under:

```text
scripts/src
```

The root package exposes:

```json
"photos-service:test": "tsx scripts/src/photos-service-test.ts"
```

The scripts use SSM parameters to discover the deployed photos service and Cognito resources:

```text
/services/photos-service/base-url
/cognito/client-id
/cognito/user-pool-id
```

## Test Users

The test scripts create two Cognito users:

```text
test-user@example.com
test-admin@example.com
```

The regular user is not placed in the `administrators` group.

The admin user is placed in the `administrators` group.

That gives the tests two identities:

```text
regular user
  Can call signed-in user endpoints
  Cannot call administrator endpoints

admin user
  Can call signed-in user endpoints
  Can call administrator endpoints
```

## CLI Auth Flow

The browser application still uses the hosted UI authorization-code flow.

The test scripts need to obtain tokens from the shell, so this lesson enables additional Cognito app-client auth flows:

```ts
authFlows: {
  adminUserPassword: true,
  userSrp: true,
},
```

This is why these flows exist in the testing lesson but not in the previous lesson. They support shell-based test automation, not the browser login flow.

## Photos Service Security Tests

`pnpm run photos-service:test` verifies the deployed photos service from a security point of view.

It checks:

```text
GET /public/health
  anonymous access succeeds

GET /public/gallery-photos
  anonymous access succeeds

POST /auth/photos/presigned-url
  anonymous access fails
  regular user invalid request returns validation failure

GET /auth/admin/member
  anonymous access fails
  regular user access fails
  admin user access succeeds

DELETE /auth/admin/photos
  regular user access fails
```

The important point is that these are not unit tests of Express in isolation. They test the deployed service behavior:

```text
SSM parameters
API Gateway routes
Cognito authorizer
Cognito test users
Cognito group claims
Lambda and Express route handling
```

So a failure can reveal either an application bug or an infrastructure wiring bug.

## Seed Image Script

`pnpm run images:init` uploads sample images through local AWS credentials and records them in the database as the stable `system` user.

The seed flow is:

```text
Read the image bucket name from SSM
Upload fixed-key seed images to S3
Upsert image metadata rows owned by registered_user.sub = system
```

## What This Lesson Teaches

This lesson shows how to verify the whole authorizer system after deployment.

The tests prove that:

```text
Public routes are public.
Authenticated routes require Cognito login.
Administrator routes require the administrators group claim.
```

It also shows a common production lesson: integration tests often need their own controlled users and auth helpers, separate from the normal browser login experience.
