import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import {
  CfnUserPoolGroup,
  CfnManagedLoginBranding,
  OAuthScope,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

interface CognitoStackProps extends StackProps {
  postConfirmationLambda: NodejsFunction;
}

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const websiteDistributionUrl = StringParameter.valueForStringParameter(
      this,
      "/website/distribution-url",
    );

    const callbackUrls = [
      "http://localhost:5173/callback",
      `${websiteDistributionUrl}/callback`,
    ];
    const logoutUrls = ["http://localhost:5173", websiteDistributionUrl];

    const userPool = new UserPool(this, "UserPool", {
      removalPolicy: RemovalPolicy.DESTROY,
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: true,
      lambdaTriggers: {
        postConfirmation: props.postConfirmationLambda,
      },
    });

    const userPoolDomain = userPool.addDomain("UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: `monorepo-${this.account}-${this.region}`,
      },
      managedLoginVersion: 2,
    });

    const userPoolClient = userPool.addClient("UserPoolClient", {
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL],
        callbackUrls,
        logoutUrls,
      },
      generateSecret: false,
    });

    new CfnManagedLoginBranding(this, "ManagedLoginBranding", {
      userPoolId: userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    new CfnUserPoolGroup(this, "AdministratorsGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "administrators",
      description: "Administrator users",
    });

    const cognitoDomainUrl = `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    new StringParameter(this, "CognitoDomainParameter", {
      parameterName: "/cognito/domain",
      stringValue: cognitoDomainUrl,
    });

    new StringParameter(this, "CognitoClientIdParameter", {
      parameterName: "/cognito/client-id",
      stringValue: userPoolClient.userPoolClientId,
    });

    new StringParameter(this, "CognitoUserPoolIdParameter", {
      parameterName: "/cognito/user-pool-id",
      stringValue: userPool.userPoolId,
    });

    new CfnOutput(this, "CognitoDomainUrl", { value: cognitoDomainUrl });
    new CfnOutput(this, "CognitoClientId", {
      value: userPoolClient.userPoolClientId,
    });
  }
}
