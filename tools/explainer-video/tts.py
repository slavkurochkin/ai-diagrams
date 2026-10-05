# Kokoro text-to-speech for the explainer videos.
# Usage: tts.py jobs.json — jobs: [[text, out_path], ...]; existing files are skipped (render.mjs names
# them by a hash of voice speed + text, so edited lines are re-synthesized). Env: KOKORO_DIR, VOICE, SPEED.
import json, os, sys, soundfile as sf
from kokoro_onnx import Kokoro
here = os.environ.get("KOKORO_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "kokoro")
jobs = [j for j in json.load(open(sys.argv[1])) if not os.path.exists(j[1])]
if jobs:
    k = Kokoro(os.path.join(here, "kokoro-v1.0.onnx"), os.path.join(here, "voices-v1.0.bin"))
    for text, out in jobs:
        s, sr = k.create(text, voice=os.environ.get("VOICE", "af_heart"), speed=float(os.environ.get("SPEED", "1.0")), lang="en-us")
        sf.write(out, s, sr)
print(f"generated {len(jobs)}")
