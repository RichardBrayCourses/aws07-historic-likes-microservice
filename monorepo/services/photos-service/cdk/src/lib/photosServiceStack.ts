import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CognitoSignup } from "./cognitoSignupConstruct.js";
import { PhotosEvents } from "./eventsConstruct.js";
import { PhotosImages } from "./imagesConstruct.js";
import { PhotosRds } from "./rdsConstruct.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class PhotosServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const events = new PhotosEvents(this, "Events");
    const images = new PhotosImages(this, "Images");
    new PhotosRds(this, "Rds");
    new CognitoSignup(this, "CognitoSignup");

    const userPoolId = StringParameter.valueForStringParameter(
      this,
      "/cognito/user-pool-id",
    );
    const databaseName = process.env.CDK_DATABASE_NAME ?? "uptickart";
    const simulatorSecret = "dev-simulator-secret";

    const photosServiceFunction = new NodejsFunction(this, "PhotosServiceFunction", {
      entry: join(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "index.ts",
      ),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(30),
      environment: {
        DATABASE_NAME: databaseName,
        IMAGES_BUCKET_NAME: images.imagesBucket.bucketName,
        IMAGES_CLOUDFRONT_URL: images.distributionUrl,
        PHOTOS_EVENT_BUS_NAME: events.photosEventBus.eventBusName,
        LIKES_EVENTS_TOPIC_ARN: events.likesEventsTopic.topicArn,
        SIMULATOR_SECRET: simulatorSecret,
      },
    });

    events.photosEventBus.grantPutEventsTo(photosServiceFunction);
    events.likesEventsTopic.grantPublish(photosServiceFunction);

    images.imagesBucket.grantRead(photosServiceFunction);
    images.imagesBucket.grantPut(photosServiceFunction);
    images.imagesBucket.grantDelete(photosServiceFunction);

    photosServiceFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/rds/*`,
          `arn:aws:ssm:${this.region}:${this.account}:parameter/photos/rds/*`,
        ],
      }),
    );

    photosServiceFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );

    const restApi = new RestApi(this, "PhotosServiceGateway", {
      restApiName: "photos-service",
      cloudWatchRole: false,
      deployOptions: {
        stageName: "photos",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const photosServiceIntegration = new LambdaIntegration(photosServiceFunction, {
      proxy: true,
    });
    const userPool = UserPool.fromUserPoolId(
      this,
      "ImportedUserPool",
      userPoolId,
    );
    const authorizer = new CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [userPool],
        identitySource: "method.request.header.Authorization",
      },
    );

    const publicResource = restApi.root.addResource("public");
    publicResource.addProxy({
      anyMethod: true,
      defaultIntegration: photosServiceIntegration,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.NONE,
      },
    });

    const authResource = restApi.root.addResource("auth");
    authResource.addProxy({
      anyMethod: true,
      defaultIntegration: photosServiceIntegration,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
      },
    });

    restApi.addGatewayResponse("UnauthorizedGatewayResponse", {
      type: ResponseType.UNAUTHORIZED,
      statusCode: "401",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    restApi.addGatewayResponse("AccessDeniedGatewayResponse", {
      type: ResponseType.ACCESS_DENIED,
      statusCode: "403",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    new StringParameter(this, "PhotosServiceBaseUrlParameter", {
      parameterName: "/services/photos-service/base-url",
      stringValue: restApi.url,
    });
    new StringParameter(this, "SimulatorSecretParameter", {
      parameterName: "/simulator/secret",
      stringValue: simulatorSecret,
    });

    new CfnOutput(this, "PhotosServiceGatewayUrl", {
      value: restApi.url,
    });
  }
}
