#!/bin/bash

HERE=`dirname ${0}`
export XTRACE_BASE=`cd "$HERE"/../.. >/dev/null; pwd`
LAUNCHER_DIR=$XTRACE_BASE/java/target/appassembler/bin

if [ $# != 0 ]; then
  if [ $1 == "-h" ]; then
    echo -e "Usage: backend.sh [X-Trace/data/dir]\nNOTE: default directory is $XTRACE_BASE/data"
    exit
  else
    if [ -d $1 ]; then  
      DATA_DIR=$1
    else
      echo "WARNING: Invalid data directory provided, using default ($XTRACE_BASE/data) instead"
      DATA_DIR=$XTRACE_BASE/data
    fi
  fi
else
  echo "Using default data directory: $XTRACE_BASE/data"
  DATA_DIR=$XTRACE_BASE/data
fi

$LAUNCHER_DIR/backend $DATA_DIR
