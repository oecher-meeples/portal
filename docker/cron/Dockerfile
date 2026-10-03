# Cron sidecar replacing Vercel Cron (see docs/deployment-docker.md).
# Uses busybox crond, which ships with alpine — no extra cron package needed.
FROM alpine:3.22

# curl: the HTTP calls; su-exec: run curl as an unprivileged user
# (crond itself must stay root to read /etc/crontabs and switch users).
RUN apk add --no-cache curl su-exec

COPY crontab /etc/crontabs/root
COPY run-cron-job.sh /usr/local/bin/run-cron-job
COPY entrypoint.sh /usr/local/bin/entrypoint
RUN chmod 0755 /usr/local/bin/run-cron-job /usr/local/bin/entrypoint \
 && chmod 0600 /etc/crontabs/root

# Vercel Cron schedules are UTC; alpine without tzdata runs in UTC as well.
ENV TZ=UTC \
    APP_URL=http://app:3000

ENTRYPOINT ["/usr/local/bin/entrypoint"]
