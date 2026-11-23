#!/bin/sh
# An unauthenticated GET on the S3 API correctly returns 403 once the server
# is up — busybox wget's exit code is 1 for both that and a real connection
# failure, so distinguish by matching the actual error text instead.
output=$(wget -q -O /dev/null http://127.0.0.1:8333/ 2>&1)
case "$output" in
*"can't connect"*) exit 1 ;;
*) exit 0 ;;
esac
