#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PhotosServiceStack } from "../lib/photosServiceStack.js";

const app = new cdk.App();

new PhotosServiceStack(app, "photos-service-stack");
