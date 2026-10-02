#!/bin/sh
# Runs via nginx's own docker-entrypoint.d/ mechanism, before nginx starts. Overwrites the
# committed public/config.js (normally hand-edited for native `ng serve`) with whichever backend
# this container was started against -- see ../../hotelapp-context/docker/docker-compose.yml.
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__HOTELAPP_CONFIG__ = { apiBaseUrl: "${API_BASE_URL:-}" };
EOF
