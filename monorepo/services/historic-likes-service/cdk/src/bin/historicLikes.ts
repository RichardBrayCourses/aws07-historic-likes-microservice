#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { HistoricLikesServiceStack } from "../lib/historicLikesServiceStack.js";

const app = new cdk.App();

new HistoricLikesServiceStack(app, "historic-likes-service-stack");
