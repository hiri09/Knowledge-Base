#!/bin/sh
# Delivery encode for the kids channel. Same normalisation as finish.sh, minus
# the narration export — this format has no voice track by design.
set -e
ID="${1:-kids-001}"
DIR="$(dirname "$0")"
ffmpeg -loglevel error -y -i "$DIR/out/$ID.mp4" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 19 -preset medium \
  -color_range tv -movflags +faststart \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  "$DIR/out/$ID-final.mp4"
echo "video: out/$ID-final.mp4"
