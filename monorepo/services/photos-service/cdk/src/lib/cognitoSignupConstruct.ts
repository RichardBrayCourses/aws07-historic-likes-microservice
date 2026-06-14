import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { EVENT_DETAIL_TYPES, EVENT_SOURCES } from "@uptick/events";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class CognitoSignup extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const cognitoEventBusName = StringParameter.valueForStringParameter(
      this,
      "/cognito/events/event-bus-name",
    );
    const cognitoEventBus = events.EventBus.fromEventBusName(
      this,
      "ImportedCognitoEventBus",
      cognitoEventBusName,
    );

    const queue = new sqs.Queue(this, "CognitoSignupQueue", {
      visibilityTimeout: Duration.seconds(60),
      retentionPeriod: Duration.days(4),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new events.Rule(this, "CognitoSignupRule", {
      eventBus: cognitoEventBus,
      eventPattern: {
        source: [EVENT_SOURCES.cognito],
        detailType: [EVENT_DETAIL_TYPES.userCreated],
      },
      targets: [new targets.SqsQueue(queue)],
    });

    const consumer = new NodejsFunction(this, "CognitoSignupConsumer", {
      entry: join(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "consumers",
        "cognitoSignupConsumer.ts",
      ),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      environment: {
        DATABASE_NAME: process.env.CDK_DATABASE_NAME ?? "uptickart",
      },
    });

    consumer.addEventSource(
      new sources.SqsEventSource(queue, {
        batchSize: 10,
      }),
    );
    queue.grantConsumeMessages(consumer);
    consumer.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter/core/rds/*`,
        ],
      }),
    );
    consumer.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );

    new StringParameter(this, "CognitoSignupQueueUrlParameter", {
      parameterName: "/core/cognito-signup/queue-url",
      stringValue: queue.queueUrl,
    });
  }
}
