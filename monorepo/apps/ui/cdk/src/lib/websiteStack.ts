import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export class WebsiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const distribution = new Distribution(this, "WebsiteDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Saved SSM Parameters

    new StringParameter(this, "CloudfrontWebsiteBucketNameParameter", {
      parameterName: "/website/bucket-name",
      stringValue: websiteBucket.bucketName,
    });

    new StringParameter(this, "CloudfrontWebsiteDistributionIdParameter", {
      parameterName: "/website/distribution-id",
      stringValue: distribution.distributionId,
    });

    new StringParameter(this, "CloudfrontWebsiteDistributionUrlParameter", {
      parameterName: "/website/distribution-url",
      stringValue: `https://${distribution.distributionDomainName}`,
    });

    // Outputs

    new CfnOutput(this, "CloudfrontWebsiteDistributionDomainName", {
      value: distribution.distributionDomainName,
    });

    new CfnOutput(this, "CloudfrontWebsiteDistributionUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
