set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list --unsorted

dev:
    npm run dev

build:
    npm run build

preview:
    npm run build && npm run preview

check:
    npm run typecheck
    npm test
    npm run build

test:
    npm test

icons:
    npm run icons

offline:
    npm run offline

deploy:
    npm run deploy
