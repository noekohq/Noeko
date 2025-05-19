#!/bin/bash

./scripts/exportDB.sh

docker-compose build

docker-compose down

docker-compose up -d
