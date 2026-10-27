#!/usr/bin/env bash
# Commit a built registry (the r/ directory Pages serves) to the registry-dist
# branch, so a consumer can pin the registry by commit:
#
#   https://raw.githubusercontent.com/constructive-io/blocks/<dist commit>/r/{name}.json
#
# Each run adds one commit, "registry from <blocks sha>", whose tree is r/ and
# nothing else, on top of the branch's head; the first run creates the branch.
# The push is a plain fast-forward, so the branch's history only grows: if the
# branch moved meanwhile, the push fails rather than rewriting it. A registry
# identical to the branch's head makes no commit.
#
# Usage: scripts/publish-registry-dist.sh <registry dir> <blocks sha> [remote] [branch]
# Run it inside a clone of the repository that can push to <remote>.

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <registry dir> <blocks sha> [remote] [branch]" >&2
  exit 2
fi
registry_dir=$1
blocks_sha=$2
remote=${3:-origin}
branch=${4:-registry-dist}

if [ ! -f "$registry_dir/registry.json" ]; then
  echo "No registry.json in $registry_dir: build the registry first." >&2
  exit 1
fi

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/tree/r"
cp -R "$registry_dir/." "$scratch/tree/r/"

# The dist commit's tree, from a scratch index so the clone's own index and
# working tree are never touched.
git_dir=$(git rev-parse --absolute-git-dir)
tree=$(
  cd "$scratch/tree"
  export GIT_DIR="$git_dir" GIT_WORK_TREE="$scratch/tree" GIT_INDEX_FILE="$scratch/index"
  git add --all --force .
  git write-tree
)

parent=()
set +e
git ls-remote --exit-code --heads "$remote" "refs/heads/$branch" > /dev/null
found=$?
set -e
case $found in
  0)
    git fetch --quiet --no-tags --depth=1 "$remote" "refs/heads/$branch"
    head=$(git rev-parse FETCH_HEAD)
    if [ "$(git rev-parse "$head^{tree}")" = "$tree" ]; then
      echo "The registry is unchanged since $branch $head; nothing to commit."
      exit 0
    fi
    parent=(-p "$head")
    ;;
  2) echo "$branch doesn't exist yet; creating it." ;;
  *)
    echo "Could not list the branches of $remote." >&2
    exit 1
    ;;
esac

commit=$(git commit-tree "$tree" ${parent[@]+"${parent[@]}"} -m "registry from $blocks_sha")
git push --quiet "$remote" "$commit:refs/heads/$branch"
echo "Pushed $commit to $branch: registry from $blocks_sha"
