# Chat History Export Script

## Location
`scripts/export-chat-history.py`

## Quick Start

Export your chat history from JSONL files:

```bash
python3 scripts/export-chat-history.py \
  --input chat-history/main-chat-vs-code-file-commit-issue.jsonl \
  --output /tmp/chat_exports
```

## Features

✅ **Per-conversation timestamps** — Each conversation shows `[YYYY-MM-DD HH:MM:SS]`  
✅ **Image extraction** — Decodes base64 images from response arrays  
✅ **Date organization** — Groups conversations by date into separate files  
✅ **Timestamp prefixes** — Images named with `YYYYMMDD_HHMMSS` components  
✅ **Image inventory** — Each export file lists all associated images  

## Examples

**Single file export:**
```bash
python3 scripts/export-chat-history.py \
  --input chat-history/main.jsonl \
  --output ~/Desktop/exports
```

**Multiple files (organized by date):**
```bash
python3 scripts/export-chat-history.py \
  --input chat-history/main.jsonl chat-history/fork.jsonl \
  --output /tmp/chat_exports
```

## Output

The script creates:
- **Text exports**: `YYYY-MM-DD-{source}_export.txt` (one per unique date)
- **Images**: `YYYY-MM-DD-{source}_{YYYYMMDD_HHMMSS}_image_{###}.png`

Each text export includes:
- Header with source, date, conversation count, image count
- Image inventory listing all embedded images
- Per-conversation timestamps
- User message + AI response pairs

## Source Format (Input JSONL)

Expected structure (one JSON object per line):

```json
{
  "kind": "chat-name",
  "v": {
    "requests": [
      {
        "timestamp": 1716532200000,
        "message": "User's question",
        "response": [
          {"value": "AI response text"},
          {"value": {"$base64": "iVBORw0KGgo..."}}
        ]
      }
    ]
  }
}
```

**Supports:**
- Unix milliseconds or ISO timestamp strings
- Multiple response items (text + images)
- Base64-encoded PNG images

## Help

```bash
python3 scripts/export-chat-history.py --help
```
