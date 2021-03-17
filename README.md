# Share Site with AWS Serverless

This repository will help you deploy an sftp share site using AWS Elastic Container Service using Fargate Containers with cloudformation

## To get started

Install:
- **aws cli**

  https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

- **rsync** (Version 3, Your mac may not have the latest version)

  Upgrade so you can sync config files and repository

#### Run AWS Configure to set up

Run:
```shell script
aws configure

```
Give:
```shell script
AWS Access Key ID [None]: <<Get from console>>
AWS Secret Access Key [None]: <<Get from console>>
Default region name [None]: ap-southeast-2
Default output format [None]: json
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Configuration

#### Base Configuration

- Name your ckd stack in `cdk.json` : `context.cloud_stack_id`
- Describe your ckd stack in `cdk.json` : `context.base.description`

#### Locations

Locations can be relative to this repository or absolute

- Specify the location of the config: `context.base.config`

#### Generate ssh key

```shell script
mkdir -p key
ssh-keygen -f key/id.rsa -t rsa -C "data" -q -N ""
chmod 644 key/id.rsa
```