# Minimal Supabase CLI image, built locally since Supabase doesn't publish an
# official one on Docker Hub. Pulls the official binary release from GitHub.
#
# Build once:
#   docker build -f supabase/cli.Dockerfile -t supabase-cli .
# Then reuse for any supabase CLI command, e.g.:
#   docker run --rm --env-file .env -v "$PWD":/workspace -w /workspace supabase-cli \
#     functions deploy xau-price --project-ref "$PROJECT_REF"

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) sb_arch=amd64 ;; \
      arm64) sb_arch=arm64 ;; \
      *) echo "unsupported arch: $arch" && exit 1 ;; \
    esac; \
    url=$(curl -s https://api.github.com/repos/supabase/cli/releases/latest \
      | tr ',' '\n' \
      | grep "browser_download_url" \
      | grep "linux_${sb_arch}\.tar\.gz" \
      | cut -d '"' -f4 \
      | head -n 1); \
    echo "Downloading: $url"; \
    curl -L "$url" | tar -xz -C /usr/local/bin supabase

ENTRYPOINT ["supabase"]
