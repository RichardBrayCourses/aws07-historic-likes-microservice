#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CognitoPostConfirmationStack } from "../lib/cognitoPostConfirmationStack.js";
import { CognitoStack } from "../lib/cognitoStack.js";

const app = new cdk.App();

const postConfirmationStack = new CognitoPostConfirmationStack(
  app,
  "cognito-post-confirmation-stack",
);

const cognitoStack = new CognitoStack(app, "cognito-stack", {
  postConfirmationLambda: postConfirmationStack.lambda,
});

cognitoStack.addDependency(postConfirmationStack);
