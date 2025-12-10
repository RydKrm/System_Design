#!/bin/bash
CONTAINER_NAME=$1

echo "=== DOCKER CONTAINER LAYER INSPECTION ==="
echo "Container: $CONTAINER_NAME"
echo ""

# Get container ID and PID
CONTAINER_ID=$(docker inspect $CONTAINER_NAME --format '{{.Id}}' | cut -c1-12)
CONTAINER_PID=$(docker inspect $CONTAINER_NAME --format '{{.State.Pid}}')

echo "1. BASIC INFO:"
echo "   Container ID: $CONTAINER_ID"
echo "   Host PID: $CONTAINER_PID"
echo "   Status: $(docker inspect $CONTAINER_NAME --format '{{.State.Status}}')"
echo ""

echo "2. PROCESS LAYER:"
echo "   Container processes:"
docker exec $CONTAINER_NAME ps aux 2>/dev/null || echo "   Cannot exec into container"
echo "   Namespace IDs:"
ls -la /proc/$CONTAINER_PID/ns/ 2>/dev/null | awk '{print "   "$0}'
echo ""

echo "3. FILESYSTEM LAYER:"
echo "   Root FS: $(docker inspect $CONTAINER_NAME --format '{{.GraphDriver.Data.MergedDir}}')"
echo "   Image: $(docker inspect $CONTAINER_NAME --format '{{.Config.Image}}')"
echo "   Changed files:"
docker container diff $CONTAINER_NAME 2>/dev/null | head -10 | awk '{print "   "$0}'
echo ""

echo "4. NETWORK LAYER:"
echo "   IP Address: $(docker inspect $CONTAINER_NAME --format '{{.NetworkSettings.IPAddress}}')"
echo "   Ports: $(docker inspect $CONTAINER_NAME --format '{{.NetworkSettings.Ports}}')"
echo "   Network Mode: $(docker inspect $CONTAINER_NAME --format '{{.HostConfig.NetworkMode}}')"
echo ""

echo "5. RESOURCE LAYER (cgroups):"
echo "   CGroup: $(cat /proc/$CONTAINER_PID/cgroup 2>/dev/null | head -1)"
echo "   Memory Usage: $(docker stats $CONTAINER_NAME --no-stream --format '{{.MemUsage}}')"
echo "   CPU Usage: $(docker stats $CONTAINER_NAME --no-stream --format '{{.CPUPerc}}')"
echo ""

echo "6. SECURITY LAYER:"
echo "   Capabilities: $(sudo grep CapEff /proc/$CONTAINER_PID/status 2>/dev/null | cut -f2)"
echo "   AppArmor: $(docker inspect $CONTAINER_NAME --format '{{.AppArmorProfile}}')"
echo "   Read-only FS: $(docker inspect $CONTAINER_NAME --format '{{.HostConfig.ReadonlyRootfs}}')"
echo ""

echo "7. METADATA LAYER:"
echo "   Entrypoint: $(docker inspect $CONTAINER_NAME --format '{{.Config.Entrypoint}}')"
echo "   Cmd: $(docker inspect $CONTAINER_NAME --format '{{.Config.Cmd}}')"
echo "   Env vars: $(docker inspect $CONTAINER_NAME --format '{{.Config.Env}}' | tr ' ' '\n' | head -3 | tr '\n' ' ')"
echo ""