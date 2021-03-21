#! /bin/bash

SSH_PUBLIC_KEY=$(cat ../../key/id.rsa.pub)
USER_NAME=data
USER_PWD=$(cat ../../key/passwordfile)

docker run -d \
  --name=openssh-server \
  --hostname=openssh-server \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=Europe/London \
  -e PUBLIC_KEY=${SSH_PUBLIC_KEY} \
  -e SUDO_ACCESS=true \
  -e PASSWORD_ACCESS=true \
  -e USER_NAME=${USER_NAME} \
  -e USER_PASSWORD=${USER_PWD} \
  -p 2222:2222 \
  --restart unless-stopped \
  ssh-server
