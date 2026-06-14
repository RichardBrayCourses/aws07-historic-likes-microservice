#!/bin/bash

# Replace 111111111111 with your AWS Account ID
# Replace eu-west-2 with your preferred AWS region

cdk bootstrap aws://111111111111/eu-west-2

# Replace 111111111111 with your AWS Account ID
# us-east-1 is required because CloudFront SSL certificates
# must be created in the us-east-1 region

cdk bootstrap aws://111111111111/us-east-1