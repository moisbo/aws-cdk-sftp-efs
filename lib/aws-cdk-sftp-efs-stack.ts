import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as efs from "@aws-cdk/aws-efs";
import * as ecs from "@aws-cdk/aws-ecs";
import * as logs from "@aws-cdk/aws-logs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as elb2 from "@aws-cdk/aws-elasticloadbalancingv2";

import DataIngest from "./dataingest";


export class AwsCdkSftpEfsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const base = scope.node.tryGetContext("base");
    const vpc = new ec2.Vpc(this, "share-vpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const dataFileSystem = new efs.FileSystem(this, "data-fs", {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
    });
    new cdk.CfnOutput(this, 'dataFileSystemId', {value: dataFileSystem.fileSystemId});

    const dataVolumeConfig = {
      name: "data-vol",
      efsVolumeConfiguration: {
        fileSystemId: dataFileSystem.fileSystemId,
      }
    };

    const cluster = new ecs.Cluster(this, "share-cluster", {
      vpc: vpc
    });

    const logging = new ecs.AwsLogDriver({streamPrefix: "share", logRetention: logs.RetentionDays.ONE_MONTH})

    const dataIngest = new DataIngest(this, "data-ingest-task-definition", {
      volumes: [dataVolumeConfig],
      memoryLimitMiB: base["data_service"]["memory"],
      cpu: base["data_service"]["cpu"]
    }, {
      logging,
      base,
      dataVolumeConfig
    });

    const sshSecurityGroup = new ec2.SecurityGroup(this, 'ssh-security-group', {
      vpc: vpc,
      description: 'allow ssh access to ecs',
      allowAllOutbound: true
    });
    sshSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'allow ingress ssh traffic'
    );
    const sshApp = new ecs.FargateService(this, 'ssh-service', {
      cluster: cluster, // Required
      desiredCount: 1, // Default is 1
      taskDefinition: dataIngest,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      assignPublicIp: true,
      securityGroups: [sshSecurityGroup]
    });
    const sshLb = new elb2.NetworkLoadBalancer(this, 'ssh-lb', {
      vpc: vpc,
      internetFacing: true
    });
    const listener = sshLb.addListener('ssh-listener', {
      port: 22,
      protocol: elb2.Protocol.TCP,
    });

    sshApp.registerLoadBalancerTargets({
      containerName: 'ssh',
      containerPort: 2222,
      newTargetGroupId: 'ecs',
      listener: ecs.ListenerConfig.networkListener(listener, {
        port: 22,
        protocol: elb2.Protocol.TCP
      }),
      protocol: ecs.Protocol.TCP
    });
    new cdk.CfnOutput(this, 'sshLoadBalancer', {value: sshLb.loadBalancerDnsName});

    sshApp.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'ssh-allow');
    sshApp.connections.allowFromAnyIpv4(ec2.Port.tcp(2222), 'ssh-docker-allow');
    sshApp.connections.allowFrom(sshSecurityGroup, ec2.Port.tcp(22));
    sshApp.connections.allowTo(sshSecurityGroup, ec2.Port.tcp(2222));
    sshApp.connections.allowFrom(dataFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowTo(dataFileSystem, ec2.Port.tcp(2049));

  }
}
