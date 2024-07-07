docker buildx build -f server/Dockerfile --platform linux/amd64,linux/arm64 -t slayoffer/openai-proxy:latest --push --no-cache ./server
