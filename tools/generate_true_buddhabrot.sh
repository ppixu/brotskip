#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$repo_dir/outputs/true-buddhabrot"
mkdir -p "$build_dir" "$repo_dir/public"

clang++ -O3 -std=c++20 -pthread \
  "$repo_dir/tools/true_buddhabrot_splat.cpp" \
  -o "$build_dir/true_buddhabrot_splat"

"$build_dir/true_buddhabrot_splat" \
  --samples "${BUDDHABROT_SAMPLES:-16000000}" \
  --iterations "${BUDDHABROT_ITERATIONS:-4096}" \
  --resolution "${BUDDHABROT_RESOLUTION:-896}" \
  --min-escape "${BUDDHABROT_MIN_ESCAPE:-8}" \
  --max-splats "${BUDDHABROT_MAX_SPLATS:-450000}" \
  --output "$build_dir/splat.ply" \
  --compact-output "$build_dir/splat.bbp"

gzip -9 -c "$build_dir/splat.bbp" > "$repo_dir/public/true-buddhabrot-450k.bbp.gz"

# The legacy SPZ in public/ must stay byte-identical for the debug A/B switch.
# Regenerate it only on explicit request.
if [ "${BUDDHABROT_WRITE_SPZ:-0}" = "1" ]; then
  npx --yes @playcanvas/splat-transform \
    "$build_dir/splat.ply" \
    --filter-nan \
    "$repo_dir/public/true-buddhabrot-4096.spz" \
    --spz-version 3 \
    -w
fi

du -h "$build_dir/splat.ply" "$build_dir/splat.bbp" "$repo_dir/public/true-buddhabrot-450k.bbp.gz"
