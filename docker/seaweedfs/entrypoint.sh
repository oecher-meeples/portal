#!/bin/sh
set -eu

: "${SEAWEEDFS_ADMIN_ACCESS_KEY:?SEAWEEDFS_ADMIN_ACCESS_KEY must be set}"
: "${SEAWEEDFS_ADMIN_SECRET_KEY:?SEAWEEDFS_ADMIN_SECRET_KEY must be set}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY must be set}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY must be set}"

sed \
  -e "s|__SEAWEEDFS_ADMIN_ACCESS_KEY__|${SEAWEEDFS_ADMIN_ACCESS_KEY}|g" \
  -e "s|__SEAWEEDFS_ADMIN_SECRET_KEY__|${SEAWEEDFS_ADMIN_SECRET_KEY}|g" \
  -e "s|__S3_ACCESS_KEY__|${S3_ACCESS_KEY}|g" \
  -e "s|__S3_SECRET_KEY__|${S3_SECRET_KEY}|g" \
  /etc/seaweedfs/s3-config.json.template > /etc/seaweedfs/s3-config.json

exec weed server \
  -dir=/data \
  -ip.bind=0.0.0.0 \
  -master.volumeSizeLimitMB=1024 \
  -s3 \
  -s3.port=8333 \
  -s3.config=/etc/seaweedfs/s3-config.json
