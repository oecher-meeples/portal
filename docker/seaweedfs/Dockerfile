# S3-compatible blob storage server (replaces MinIO, which deleted its
# Docker Hub images in Sept. 2026 — see docs/deployment-docker.md).
# SeaweedFS's own image is Alpine-based with a shell, so the identity/IAM
# config is rendered from env vars at container start, same pattern as
# docker/cron's entrypoint.
FROM chrislusf/seaweedfs:4.48

COPY s3-config.json.template /etc/seaweedfs/s3-config.json.template
COPY entrypoint.sh /usr/local/bin/entrypoint
COPY healthcheck.sh /usr/local/bin/healthcheck
RUN chmod 0755 /usr/local/bin/entrypoint /usr/local/bin/healthcheck

ENTRYPOINT ["/usr/local/bin/entrypoint"]
