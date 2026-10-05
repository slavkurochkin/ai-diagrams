#!/usr/bin/env bash
# One-time setup for the explainer video pipeline. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null || { echo "missing: $1 — $2"; exit 1; }; }
need node "install Node 20+"
need ffmpeg "brew install ffmpeg"
need uv "brew install uv (runs the Kokoro TTS script in an isolated Python 3.12)"

npm install --silent
npx playwright install chromium

mkdir -p .cache/kokoro
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f ".cache/kokoro/$f" ] || { echo "downloading $f…"; curl -sSL -o ".cache/kokoro/$f" "$base/$f"; }
done
echo "ready — start the app (npm run dev in the repo root), then: npm run stills -- <video-id>"
