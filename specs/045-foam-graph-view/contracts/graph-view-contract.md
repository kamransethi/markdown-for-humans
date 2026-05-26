# Contract: Graph View Host <-> Webview

## Purpose

Define stable payloads and events between extension host and Graph View webview for workspace-scoped graph rendering and note navigation.

## Channel

- Transport: VS Code webview `postMessage`.
- Direction:
  - Host -> Webview: graph payload/state updates.
  - Webview -> Host: user interactions (open note, focus node, refresh request).

## Host -> Webview Messages

### `graph:init`

Sent when panel opens.

```json
{
  "type": "graph:init",
  "payload": {
    "workspaceScope": {
      "workspaceIds": ["ws-1"],
      "updatedAt": 1780000000000
    },
    "graph": {
      "nodes": [],
      "edges": []
    },
    "activeUri": null,
    "emptyState": null
  }
}
```

### `graph:update`

Sent on index/scope/active-document changes.

```json
{
  "type": "graph:update",
  "payload": {
    "reason": "index_changed",
    "graph": {
      "nodes": [
        {
          "nodeId": "note:foo",
          "title": "foo",
          "uri": "file:///vault/foo.md",
          "kind": "resolved",
          "isActive": true,
          "tags": [{ "label": "project" }]
        }
      ],
      "edges": [
        {
          "edgeId": "e1",
          "sourceNodeId": "note:foo",
          "targetNodeId": "note:bar",
          "isResolved": true
        }
      ]
    },
    "activeUri": "file:///vault/foo.md",
    "emptyState": null
  }
}
```

### `graph:select-node`

Focus and center the graph on a note node (e.g. active editor file). Sent after `graph:init` / `graph:update` when the host wants explicit selection once the webview model is ready.

```json
{
  "type": "graph:select-node",
  "payload": {
    "nodeId": "/vault::notes/foo.md"
  }
}
```

### `graph:error`

Sent when host cannot provide graph payload.

```json
{
  "type": "graph:error",
  "payload": {
    "message": "Failed to build graph payload",
    "recoverable": true
  }
}
```

## Webview -> Host Messages

### `graph:open-note`

Request to open selected note URI.

```json
{
  "type": "graph:open-note",
  "payload": {
    "uri": "file:///vault/bar.md"
  }
}
```

### `graph:focus-node`

Optional selection/focus event for telemetry or contextual actions.

```json
{
  "type": "graph:focus-node",
  "payload": {
    "nodeId": "note:bar"
  }
}
```

### `graph:refresh`

Manual refresh request from webview.

```json
{
  "type": "graph:refresh",
  "payload": {
    "reason": "user_requested"
  }
}
```

## Invariants

- All nodes/edges in payload MUST belong to currently open workspace scope.
- `activeUri` MUST map to a resolved node when available in scope.
- Unresolved placeholders are allowed only for true missing references.
- Malformed unresolved targets (e.g., trailing escape artifacts) are invalid output.

## Error Handling

- Host logs with `[DK-AI]` context and returns `graph:error` for recoverable failures.
- Webview shows empty/error state without crashing panel.

## Backward Compatibility

- Existing command route (`gptAiMarkdownEditor.knowledgeGraph.openGraph`) remains stable.
- Toolbar action and command palette action must both open same panel path.
