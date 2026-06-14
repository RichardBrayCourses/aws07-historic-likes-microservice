import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class PhotosRds extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Aurora needs subnets in at least 2 AZs, so keep maxAzs: 2.
    const vpc = new ec2.Vpc(this, "RdsVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "PublicSubnet", subnetType: ec2.SubnetType.PUBLIC },
      ],
    });

    const rdsSecurityGroup = new ec2.SecurityGroup(this, "RdsSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description:
        "Security group for publicly accessible Aurora cluster (development only)",
    });

    rdsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL access from anywhere (development only)",
    );

    const dbUsername = "uptick_admin";
    const dbCredentials = rds.Credentials.fromGeneratedSecret(dbUsername, {
      secretName: `${Stack.of(this).stackName}/rds-credentials`,
      excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\",
    });

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_17_4,
    });

    this.cluster = new rds.DatabaseCluster(this, "AuroraPgServerlessV2", {
      engine,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [rdsSecurityGroup],
      credentials: dbCredentials,
      writer: rds.ClusterInstance.serverlessV2("writer", {
        availabilityZone: vpc.availabilityZones[0],
        publiclyAccessible: true,
        enablePerformanceInsights: false,
      }),
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 1,
      serverlessV2AutoPauseDuration: Duration.seconds(300),
      backup: {
        retention: Duration.days(1),
      },
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new StringParameter(this, "DbSecretArnParam", {
      parameterName: "/photos/rds/secret-arn",
      stringValue: this.cluster.secret!.secretArn,
      description: "ARN of the Aurora credentials secret in Secrets Manager",
    });
  }
}
