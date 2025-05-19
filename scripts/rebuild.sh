#!/bin/bash

./scripts/exportDB.sh

docker-compose down

docker-compose up --build -d
