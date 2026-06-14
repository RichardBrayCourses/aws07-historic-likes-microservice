import { CfnOutput } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class CognitoEvents extends Construct {
  readonly cognitoEventBus: EventBus;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.cognitoEventBus = new EventBus(this, "CognitoEventBus", {
      eventBusName: "cognito-events",
    });

    new StringParameter(this, "CognitoEventBusNameParameter", {
      parameterName: "/cognito/events/event-bus-name",
      stringValue: this.cognitoEventBus.eventBusName,
    });

    new CfnOutput(this, "CognitoEventBusName", {
      value: this.cognitoEventBus.eventBusName,
    });
  }
}
