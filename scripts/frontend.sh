#!/usr/bin/env bash
set -e

COMMAND=${1:-run}

case "$COMMAND" in
    install)  cd frontend && npm install ;;
    run)      cd frontend && npm run dev ;;
esac
