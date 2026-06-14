import { CfnOutput } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Topic } from "aws-cdk-lib/aws-sns";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class PhotosEvents extends Construct {
  readonly photosEventBus: EventBus;
  readonly likesEventsTopic: Topic;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.photosEventBus = new EventBus(this, "PhotosEventBus", {
      eventBusName: "photos-events",
    });
    this.likesEventsTopic = new Topic(this, "LikesEventsTopic", {
      topicName: "photos-likes-events",
    });

    new StringParameter(this, "PhotosEventBusNameParameter", {
      parameterName: "/photos/events/event-bus-name",
      stringValue: this.photosEventBus.eventBusName,
    });
    new StringParameter(this, "LikesEventsTopicArnParameter", {
      parameterName: "/photos/events/likes-topic-arn",
      stringValue: this.likesEventsTopic.topicArn,
    });

    new CfnOutput(this, "PhotosEventBusName", {
      value: this.photosEventBus.eventBusName,
    });
    new CfnOutput(this, "LikesEventsTopicArn", {
      value: this.likesEventsTopic.topicArn,
    });
  }
}
