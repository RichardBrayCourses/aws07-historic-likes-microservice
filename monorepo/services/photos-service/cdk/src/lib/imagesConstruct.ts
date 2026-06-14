import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class PhotosImages extends Construct {
  readonly imagesBucket: Bucket;
  readonly distributionUrl: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.imagesBucket = new Bucket(this, "ImagesBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const distribution = new Distribution(this, "ImagesDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.imagesBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    this.distributionUrl = `https://${distribution.distributionDomainName}`;

    new StringParameter(this, "PhotosImagesBucketNameParameter", {
      parameterName: "/photos/images/bucket-name",
      stringValue: this.imagesBucket.bucketName,
    });

    new StringParameter(this, "PhotosImagesUrlParameter", {
      parameterName: "/photos/images/distribution-url",
      stringValue: this.distributionUrl,
    });

    new CfnOutput(this, "PhotosImagesBucketName", {
      value: this.imagesBucket.bucketName,
    });

    new CfnOutput(this, "PhotosImagesDistributionUrl", {
      value: this.distributionUrl,
    });
  }
}
