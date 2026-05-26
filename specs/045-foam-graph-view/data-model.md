# Data Model: Workspace-Scoped Graph View

## Entity: WorkspaceContext

- Description: Runtime container for one open workspace folder (or merged multi-root projection input).
- Fields:
  - `workspaceId` (string, required): stable identifier (hash/path-derived) for runtime context.
  - `workspaceUri` (string, required): root URI/path reference.
  - `isOpen` (boolean, required): whether this workspace is currently part of active VS Code workspace.
  - `lastIndexedAt` (number, optional): epoch timestamp of latest successful index pass.
  - `indexVersion` (string, optional): revision/hash marker for change detection.
- Validation:
  - `workspaceId` must be unique among active contexts.
  - `workspaceUri` must resolve to currently open folder when `isOpen=true`.
- Relationships:
  - One-to-many with `GraphNode`.
  - One-to-many with `GraphEdge` via node references.

## Entity: GraphNode

- Description: Displayable graph vertex representing either a real note or unresolved placeholder.
- Fields:
  - `nodeId` (string, required): unique node identity within projection.
  - `workspaceId` (string, required): owning scope.
  - `uri` (string, optional): note URI for resolved nodes.
  - `title` (string, required): display title.
  - `kind` (enum, required): `resolved | unresolved`.
  - `isActive` (boolean, required): whether node matches active editor note.
  - `outgoingCount` (number, optional): number of outgoing links.
  - `incomingCount` (number, optional): number of backlinks.
- Validation:
  - `kind=resolved` requires `uri`.
  - `kind=unresolved` must not claim existing URI.
  - `title` must be normalized string (no trailing malformed escape artifact).

## Entity: GraphEdge

- Description: Directed relationship from source note to target note or unresolved placeholder.
- Fields:
  - `edgeId` (string, required): stable edge identity.
  - `workspaceId` (string, required): scope boundary.
  - `sourceNodeId` (string, required): resolved note source.
  - `targetNodeId` (string, required): resolved/unresolved target node.
  - `linkText` (string, optional): original display text/alias.
  - `isResolved` (boolean, required): whether target maps to real note.
- Validation:
  - Source node must exist and be resolved.
  - Target node must exist.
  - `isResolved` must match target node `kind`.

## Entity: ActiveSelection

- Description: Current editor selection state used to focus/highlight graph.
- Fields:
  - `workspaceId` (string, required)
  - `activeUri` (string, optional)
  - `updatedAt` (number, required)
- Validation:
  - `activeUri` (when present) must belong to open workspace scope.

## Entity: IndexRefreshEvent

- Description: Event emitted when indexing/scope/active-document changes require graph payload refresh.
- Fields:
  - `eventType` (enum, required): `scope_changed | index_changed | active_document_changed`.
  - `workspaceId` (string, optional): omitted only for global scope-change broadcasts.
  - `updatedAt` (number, required)
  - `reason` (string, optional): debugging/context reason.
- Validation:
  - `eventType` must be one of supported values.
  - Events with `workspaceId` must reference known open context.

## State Transitions

1. Workspace opened/closed:
- Create/update/delete `WorkspaceContext`.
- Emit `scope_changed` event.
- Rebuild merged projection and drop out-of-scope nodes.

2. File index updated:
- Recompute affected `GraphNode` and `GraphEdge` entries.
- Normalize targets and self-heal malformed stored values.
- Emit `index_changed` event.

3. Active note changed:
- Update `ActiveSelection`.
- Mark corresponding node `isActive=true`; clear previous active node.
- Emit `active_document_changed` event.
