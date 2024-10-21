# petrio-io

An agar.io variant written in NodeJS.

## Overview

This project consists of 3 parts.

1. Client

- This is the user interface served to players

2. Server

- This is the server that manages the multiplayer game state. Clients connect to the server.

3. Operator Extension

- This is a Chrome extension for administrators who want to manage the game state remotely.

## TODO

- All the collisions need to be based on the server. Client sends the desired pull direction, server sends the output movement.
- Create chrome extension with deployments list and options to
  1. Create and deploy new server (input ports)
  2. Delete deployment

For Dockerfile with client, might want to look into: https://stackoverflow.com/a/74185824
