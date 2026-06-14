#!/bin/bash

# Delete the CDK bootstrap stack from your main region

aws cloudformation delete-stack --stack-name "CDKToolkit" --region "eu-west-2"

# Delete the CDK bootstrap stack from us-east-1
# This region is commonly used for CloudFront SSL certificates

aws cloudformation delete-stack --stack-name "CDKToolkit" --region "us-east-1"

# -----------------------------------------------------------------------------
# ADVANCED CLEANUP (OPTIONAL)
# -----------------------------------------------------------------------------
#
# The CDK bootstrap process may leave behind:
#
# - Versioned S3 buckets containing old deployment assets
# - ECR repositories containing container images
#
# These resources can incur small ongoing storage costs.
#
# The following scripts permanently delete those resources and should only
# be used if you fully understand what they do.
#
# DANGEROUS:
# - Permanently deletes versioned S3 objects
# - Permanently deletes ECR container images
# - Cannot be undone
#
# Uncomment to run:
#
./bootstrap-delete-buckets.sh
./bootstrap-delete-containers.sh
#
# -----------------------------------------------------------------------------