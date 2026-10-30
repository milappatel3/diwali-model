#!/bin/bash
# Build the static export and mirror it to the local preview server folder
set -e
cd "$(dirname "$0")/.."
npm run export > /tmp/claude-0/-home-claude/007a77f9-b763-5da3-81da-ec16bd2b11fe/scratchpad/build.log 2>&1 || { tail -30 /tmp/claude-0/-home-claude/007a77f9-b763-5da3-81da-ec16bd2b11fe/scratchpad/build.log; exit 1; }
rm -rf /tmp/claude-0/-home-claude/007a77f9-b763-5da3-81da-ec16bd2b11fe/scratchpad/serve/lp
cp -r out /tmp/claude-0/-home-claude/007a77f9-b763-5da3-81da-ec16bd2b11fe/scratchpad/serve/lp
tail -3 /tmp/claude-0/-home-claude/007a77f9-b763-5da3-81da-ec16bd2b11fe/scratchpad/build.log
