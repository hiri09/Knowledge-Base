#!/bin/sh
# Final delivery pass. Remotion writes yuvj420p full-range video and 48k AAC,
# which some players mishandle (silent audio, washed colour). This normalises to
# the format every phone, browser and social platform accepts.
# ponytail: one ffmpeg call, no library. Runs after every render.
set -e
ID="${1:-001-38-studios}"
DIR="$(dirname "$0")"
ffmpeg -loglevel error -y -i "$DIR/out/$ID.mp4" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 19 -preset medium \
  -color_range tv -movflags +faststart \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  "$DIR/out/$ID-final.mp4"
# standalone narration, for checking the read on its own
ffmpeg -loglevel error -y -i "$DIR/public/$ID/vo.wav" -c:a libmp3lame -b:a 192k "$DIR/out/$ID-voice.mp3"
echo "video: out/$ID-final.mp4"
echo "voice: out/$ID-voice.mp3"
