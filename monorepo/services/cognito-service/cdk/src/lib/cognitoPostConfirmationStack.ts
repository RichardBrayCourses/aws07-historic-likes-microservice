import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CognitoEvents } from "./cognitoEventsConstruct.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class CognitoPostConfirmationStack extends Stack {
  public readonly lambda: NodejsFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cognitoEvents = new CognitoEvents(this, "Events");

    this.lambda = new NodejsFunction(this, "PostConfirmationFunction", {
      entry: join(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "lambdas",
        "postConfirmation.ts",
      ),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      environment: {
        COGNITO_EVENT_BUS_NAME: cognitoEvents.cognitoEventBus.eventBusName,
      },
    });

    cognitoEvents.cognitoEventBus.grantPutEventsTo(this.lambda);

    new CfnOutput(this, "PostConfirmationLambdaArn", {
      value: this.lambda.functionArn,
    });
  }
}
