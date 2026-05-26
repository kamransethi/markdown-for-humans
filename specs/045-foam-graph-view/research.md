# Research: Workspace-Scoped Graph View

## Decision 1: Scope graph/chat by open workspace folders via centralized projection service

- Decision: Introduce a single projection boundary keyed by open workspace folders and consume it for both Graph View and Graph Chat.
- Rationale: Chat history showed trust issues when out-of-scope nodes surfaced; one shared scope source avoids drift between graph and chat behavior.
- Alternatives considered:
  - Apply filters independently in each consumer (rejected: repeated bug surface).
  - Scope only graph view, leave chat global (rejected: violates FR-006).

## Decision 2: Keep link normalization and unresolved self-healing in indexing/DB layers

- Decision: Preserve normalization in `indexer.ts` and deterministic resolution/self-heal in `database.ts`; renderer consumes already-clean graph payloads.
- Rationale: Chat debugging proved malformed targets (trailing backslash/escaped separators) originate from historical stored values; fixing upstream ensures all consumers are correct.
- Alternatives considered:
  - Clean malformed targets only in graph renderer (rejected: hides defects and leaves chat/query paths inconsistent).
  - SQL-only bulk mutation logic (rejected: prior correlated update approach failed in sql.js test conditions).

## Decision 3: Promote current graph panel scaffold rather than rebuild host from scratch

- Decision: Evolve `graphPanel.ts` into production host while maintaining existing command and message plumbing.
- Rationale: Current chat-state implementation already wires toolbar -> UI handler -> command -> panel and active-doc/index events; preserving this path reduces regression risk.
- Alternatives considered:
  - Full host rewrite + renderer swap in one step (rejected: high integration risk).
  - Delay renderer parity until after all scope fixes (partially accepted: scope/runtime first, renderer parity in next phase).

## Decision 4: Use deterministic full payload refresh events before incremental diff protocol

- Decision: Use full snapshot payloads for open/scope/index/active-doc updates in initial rollout.
- Rationale: Correctness is currently more critical than micro-optimization, and chat history indicates defect risk is from stale/incorrect state, not payload size first.
- Alternatives considered:
  - Immediate incremental patches (rejected for initial pass: complexity and harder debugging).
  - Manual refresh only (rejected: violates FR-007 and FR-012).

## Decision 5: Validate with stress corpus + scope regression matrix

- Decision: Keep the existing stress indexing regression and add dedicated scope projection tests plus graph panel host behavior tests.
- Rationale: The stress corpus already exposed real malformed rows and unresolved drift; extending this harness provides high-value coverage for planned changes.
- Alternatives considered:
  - UI-only manual verification (rejected: misses DB-layer regressions).
  - Unit tests without corpus fixtures (rejected: less representative of actual failures observed).
