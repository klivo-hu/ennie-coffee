# The load balancer in front of the app replicas. Pinned to the HAProxy 3.2 LTS line.
FROM haproxy:3.2-alpine
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
COPY errors/ /usr/local/etc/haproxy/errors/
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/_lb/health || exit 1
