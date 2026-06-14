import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { EVENT_DETAIL_TYPES, EVENT_SOURCES } from "@uptick/events";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class HistoricLikesServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const photosEventBusName = StringParameter.valueForStringParameter(
      this,
      "/photos/events/event-bus-name",
    );
    const likesEventsTopicArn = StringParameter.valueForStringParameter(
      this,
      "/photos/events/likes-topic-arn",
    );
    const photosEventBus = events.EventBus.fromEventBusName(
      this,
      "ImportedPhotosEventBus",
      photosEventBusName,
    );
    const likesEventsTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedLikesEventsTopic",
      likesEventsTopicArn,
    );

    const usersTable = projectionTable(this, "UsersProjectionTable", "userId");
    const imagesTable = projectionTable(
      this,
      "ImagesProjectionTable",
      "imageId",
    );
    imagesTable.addGlobalSecondaryIndex({
      indexName: "authorUserId-index",
      partitionKey: {
        name: "authorUserId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
    });
    const photoLikesTable = likesTable(
      this,
      "HistoricPhotoBucketLikes",
      "imageId",
      "bucketId",
    );
    const authorLikesTable = likesTable(
      this,
      "HistoricAuthorBucketLikes",
      "userId",
      "bucketId",
    );
    const historicLikesServiceFunction = new NodejsFunction(
      this,
      "HistoricLikesServiceFunction",
      {
        entry: join(
          __dirname,
          "..",
          "..",
          "..",
          "src",
          "handlers",
          "publicHttp.ts",
        ),
        handler: "handler",
        runtime: Runtime.NODEJS_24_X,
        timeout: Duration.seconds(30),
        environment: {
          PHOTO_LIKES_TABLE_NAME: photoLikesTable.tableName,
          AUTHOR_LIKES_TABLE_NAME: authorLikesTable.tableName,
        },
      },
    );

    const restApi = new RestApi(this, "HistoricLikesServiceGateway", {
      restApiName: "historic-likes-service",
      cloudWatchRole: false,
      deployOptions: {
        stageName: "historic-likes",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });
    const historicLikesServiceIntegration = new LambdaIntegration(
      historicLikesServiceFunction,
      {
        proxy: true,
      },
    );

    const publicResource = restApi.root.addResource("public");
    publicResource
      .addResource("health")
      .addMethod("GET", historicLikesServiceIntegration);
    publicResource
      .addResource("photo-likes")
      .addMethod("GET", historicLikesServiceIntegration);
    publicResource
      .addResource("author-likes")
      .addMethod("GET", historicLikesServiceIntegration);

    const usersQueue = sqsQueue(this, "UsersProjectionQueue");
    const imagesQueue = sqsQueue(this, "ImagesProjectionQueue");
    const likesQueue = sqsQueue(this, "HistoricLikesQueue");
    likesEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(likesQueue),
    );

    new events.Rule(this, "UsersProjectionRule", {
      eventBus: photosEventBus,
      eventPattern: {
        source: [EVENT_SOURCES.photos],
        detailType: [
          EVENT_DETAIL_TYPES.userCreated,
          EVENT_DETAIL_TYPES.userUpdated,
          EVENT_DETAIL_TYPES.userDeleted,
        ],
      },
      targets: [new targets.SqsQueue(usersQueue)],
    });
    new events.Rule(this, "ImagesProjectionRule", {
      eventBus: photosEventBus,
      eventPattern: {
        source: [EVENT_SOURCES.photos],
        detailType: [
          EVENT_DETAIL_TYPES.imageCreated,
          EVENT_DETAIL_TYPES.imageUpdated,
          EVENT_DETAIL_TYPES.imageDeleted,
        ],
      },
      targets: [new targets.SqsQueue(imagesQueue)],
    });

    const serviceRoot = join(
      __dirname,
      "..",
      "..",
      "..",
      "src",
    );
    const usersConsumer = new NodejsFunction(this, "UsersProjectionConsumer", {
      entry: join(serviceRoot, "consumers", "usersProjectionConsumer.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
      },
    });
    usersConsumer.addEventSource(
      new sources.SqsEventSource(usersQueue, {
        batchSize: 10,
      }),
    );

    const imagesConsumer = new NodejsFunction(
      this,
      "ImagesProjectionConsumer",
      {
        entry: join(serviceRoot, "consumers", "imagesProjectionConsumer.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_24_X,
        timeout: Duration.seconds(30),
        environment: {
          IMAGES_TABLE_NAME: imagesTable.tableName,
        },
      },
    );
    imagesConsumer.addEventSource(
      new sources.SqsEventSource(imagesQueue, {
        batchSize: 10,
      }),
    );

    const likesConsumer = new NodejsFunction(this, "LikesConsumer", {
      entry: join(serviceRoot, "consumers", "likesConsumer.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      environment: {
        PHOTO_LIKES_TABLE_NAME: photoLikesTable.tableName,
        AUTHOR_LIKES_TABLE_NAME: authorLikesTable.tableName,
      },
    });
    likesConsumer.addEventSource(
      new sources.SqsEventSource(likesQueue, {
        batchSize: 10,
      }),
    );

    usersTable.grantReadWriteData(usersConsumer);
    imagesTable.grantReadWriteData(imagesConsumer);
    photoLikesTable.grantReadWriteData(likesConsumer);
    authorLikesTable.grantReadWriteData(likesConsumer);
    photoLikesTable.grantReadData(historicLikesServiceFunction);
    authorLikesTable.grantReadData(historicLikesServiceFunction);
    likesQueue.grantConsumeMessages(likesConsumer);

    new StringParameter(this, "HistoricLikesUsersTableNameParameter", {
      parameterName: "/historic-likes/users-table-name",
      stringValue: usersTable.tableName,
    });
    new StringParameter(this, "HistoricLikesImagesTableNameParameter", {
      parameterName: "/historic-likes/images-table-name",
      stringValue: imagesTable.tableName,
    });
    new StringParameter(this, "HistoricPhotoBucketLikesTableNameParameter", {
      parameterName: "/historic-likes/photo-bucket-likes-table-name",
      stringValue: photoLikesTable.tableName,
    });
    new StringParameter(this, "HistoricAuthorBucketLikesTableNameParameter", {
      parameterName: "/historic-likes/author-bucket-likes-table-name",
      stringValue: authorLikesTable.tableName,
    });
    new StringParameter(this, "HistoricLikesQueueUrlParameter", {
      parameterName: "/historic-likes/queue-url",
      stringValue: likesQueue.queueUrl,
    });
    new StringParameter(this, "HistoricLikesServiceBaseUrlParameter", {
      parameterName: "/services/historic-likes-service/base-url",
      stringValue: restApi.url,
    });

    new CfnOutput(this, "HistoricLikesUsersTableName", {
      value: usersTable.tableName,
    });
    new CfnOutput(this, "HistoricLikesImagesTableName", {
      value: imagesTable.tableName,
    });
    new CfnOutput(this, "HistoricPhotoBucketLikesTableName", {
      value: photoLikesTable.tableName,
    });
    new CfnOutput(this, "HistoricAuthorBucketLikesTableName", {
      value: authorLikesTable.tableName,
    });
    new CfnOutput(this, "HistoricLikesQueueUrl", {
      value: likesQueue.queueUrl,
    });
    new CfnOutput(this, "HistoricLikesServiceGatewayUrl", {
      value: restApi.url,
    });
  }
}

function projectionTable(scope: Construct, id: string, partitionKey: string) {
  return new dynamodb.Table(scope, id, {
    partitionKey: { name: partitionKey, type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: RemovalPolicy.DESTROY,
  });
}

function likesTable(
  scope: Construct,
  id: string,
  partitionKey: string,
  sortKey: string,
) {
  return new dynamodb.Table(scope, id, {
    partitionKey: { name: partitionKey, type: dynamodb.AttributeType.STRING },
    sortKey: { name: sortKey, type: dynamodb.AttributeType.NUMBER },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: RemovalPolicy.DESTROY,
  });
}

function sqsQueue(scope: Construct, id: string) {
  return new sqs.Queue(scope, id, {
    visibilityTimeout: Duration.seconds(60),
    retentionPeriod: Duration.days(4),
    removalPolicy: RemovalPolicy.DESTROY,
  });
}
