---
name: Mobile planning files — keep both folders in sync
description: After every edit to a mobile planning memory file, always cp it to tappy-pos/mobile/ immediately in the same turn.
type: feedback
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---

After writing or editing any `project_mobile_*.md` file in the memory folder, always immediately copy it to `tappy-pos/mobile/` in the same turn. Never leave the two locations out of sync.

**Why:** User explicitly wants both copies maintained — memory folder for Claude auto-loading, mobile folder for the repo/teammates.

**How to apply:** At the end of any turn that edits memory files, run:
```bash
cp /Users/nguyendangkhoa/.claude/projects/-Users-nguyendangkhoa-kim-ngan-phat-tappy-pos/memory/project_mobile_*.md \
   /Users/nguyendangkhoa/kim-ngan-phat/tappy-pos/mobile/
```
Also copy MEMORY.md if it was updated.
