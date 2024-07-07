npm run build && docker buildx build --platform linux/amd64,linux/arm64 -t slayoffer/chatpad:latest --push --no-cache .

git checkout --orphan newBranch
git add -A && git commit -am "Initial commit"
git branch -D main
git branch -m main
git push -f origin main
