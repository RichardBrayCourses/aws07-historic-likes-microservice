#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WebsiteStack } from "../lib/websiteStack.js";

const app = new cdk.App();

new WebsiteStack(app, "website-stack");
