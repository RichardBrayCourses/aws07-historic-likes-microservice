# Photos Service Tests And Image Upload Commands

Deploy everything:

```bash
pnpm run deploy-everything
```

Run the tests. This creates or updates the Cognito test users before calling the photos service:

```bash
pnpm run photos-service:test
```

Seed the images:

```bash
pnpm run images:init
```

Print the website URL:

```bash
pnpm run ui:url
```
