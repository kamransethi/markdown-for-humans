# Auto Loan Orchestration — Wikilink Demo Vault

> **Purpose:** A comprehensive stress-test vault for wikilink and #tag support in a markdown editor. Every wikilink pattern — valid, broken, aliased, anchored, cross-folder, embedded, non-markdown targets — is exercised in a realistic domain context.

## Domain

This vault models an **auto loan origination platform** that:

1. Receives [[workflow/transaction-intake|deal submissions]] from a [[dealership/dealer-network]]
2. Runs [[workflow/adjudication-engine|credit adjudication]] using a [[credit-policy/credit-policy-overview|credit policy]]
3. Pulls bureau data via the [[equifax/equifax-integration|Equifax integration]]
4. Returns [[decisions/approval-workflow|approval]], [[decisions/counter-offer|counter-offer]], or [[decisions/decline-reasons|decline]] decisions
5. Generates [[decisions/document-generation|closing documents]]

## Vault Map

### Architecture


| File                             | Description                      |
| -------------------------------- | -------------------------------- |
| [[architecture/system-overview]] | High-level platform architecture |
| [[architecture/api-gateway]]     | REST/async API layer             |
| [[architecture/message-queue]]   | Kafka-based event backbone       |


### Workflow


| File                               | Description                   |
| ---------------------------------- | ----------------------------- |
| [[workflow/loan-orchestration]]    | End-to-end orchestration flow |
| [[workflow/transaction-intake]]    | Dealer submission intake      |
| [[workflow/adjudication-engine]]   | Credit decision engine        |
| [[workflow/stipulation-checklist]] | Post-approval stipulations    |


### Credit Policy


| File                                     | Description                   |
| ---------------------------------------- | ----------------------------- |
| [[credit-policy/credit-policy-overview]] | Master policy document        |
| [[credit-policy/tier-matrix]]            | Risk tier definitions         |
| [[credit-policy/dti-rules]]              | Debt-to-income business rules |
| [[credit-policy/ltv-guidelines]]         | Loan-to-value constraints     |


### Dealership


| File                                    | Description                      |
| --------------------------------------- | -------------------------------- |
| [[dealership/dealer-network]]           | Dealer onboarding and management |
| [[dealership/dealer-submission-format]] | XML/JSON schema specs            |
| [[dealership/flat-file-import]]         | Legacy flat-file ingestion       |


### Equifax


| File                               | Description             |
| ---------------------------------- | ----------------------- |
| [[equifax/equifax-integration]]    | Bureau pull integration |
| [[equifax/credit-score-mapping]]   | Score-to-tier mapping   |
| [[equifax/soft-pull-vs-hard-pull]] | Pull type policy        |


### Decisions


| File                              | Description            |
| --------------------------------- | ---------------------- |
| [[decisions/approval-workflow]]   | Approved deal flow     |
| [[decisions/counter-offer]]       | Counter-offer logic    |
| [[decisions/decline-reasons]]     | Adverse action reasons |
| [[decisions/document-generation]] | Doc package generation |


### Data Files (non-markdown wikilinks)


| File                             | Description                 |
| -------------------------------- | --------------------------- |
| [[data/sample-transactions.csv]] | 10 sample deal records      |
| [[data/dealer-codes.txt]]        | Dealer code reference table |
| [[data/rate-sheet-2024-q4.csv]]  | Q4 2024 rate sheet by tier  |
| [[data/error-codes.txt]]         | System error code catalog   |


## Wikilink Patterns Exercised

This vault intentionally uses every common wikilink variant so your editor can be tested against all of them:


| Pattern                                  | Example                                                                      | Tested In                               |
| ---------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Basic `[[target]]`                       | `[[workflow/loan-orchestration]]`                                            | Every file                              |
| Aliased `[[target|display]]`             | `[[equifax/equifax-integration|Equifax]]`                                    | This file, workflow files               |
| Heading anchor `[[target#heading]]`      | `[[credit-policy/tier-matrix#super-prime]]`                                  | credit-policy/, workflow/               |
| Anchor + alias `[[target#heading|text]]` | `[[decisions/decline-reasons#adverse-action-notices|adverse action letter]]` | decisions/, workflow/                   |
| Cross-folder                             | `[[equifax/credit-score-mapping]]` from `workflow/`                          | Throughout                              |
| Non-md target `[[file.csv]]`             | `[[data/sample-transactions.csv]]`                                           | This file, workflow/, data descriptions |
| Non-md target `[[file.txt]]`             | `[[data/error-codes.txt]]`                                                   | architecture/, decisions/               |
| Embedded `![[target]]`                   | `![[data/rate-sheet-2024-q4.csv]]`                                           | credit-policy/tier-matrix               |
| **Broken** `[[nonexistent]]`             | `[[workflow/risk-scoring]]`                                                  | Scattered intentionally                 |
| Broken anchor `[[file#missing]]`         | `[[credit-policy/tier-matrix#platinum]]`                                     | credit-policy/                          |
| Broken non-md `[[file.json]]`            | `[[data/schema-v2.json]]`                                                    | dealership/                             |


## Tags Exercised

#auto-lending #orchestration #credit-policy #equifax #wikilink-demo

Nested / hierarchical tags are also used throughout:

- #status/draft, #status/approved, #status/deprecated
- #priority/high, #priority/medium, #priority/low
- #integration/equifax, #integration/dealer-api, #integration/document-service
- #risk/tier-1, #risk/tier-2, #risk/tier-3
- #workflow/intake, #workflow/adjudication, #workflow/decision, #workflow/fulfillment
- #compliance/reg-b, #compliance/ecoa, #compliance/tila, #compliance/fcra

## Intentionally Broken Links

The following links **do not resolve** to any file in this vault. They exist to test broken-link detection (red styling):

- [[workflow/risk-scoring]] — planned but never created
- [[architecture/service-mesh]] — referenced in design, not yet documented
- [[equifax/transunion-fallback]] — wrong bureau name, intentional error
- [[compliance/reg-b-checklist]] — compliance folder doesn't exist
- [[data/schema-v2.json]] — JSON file not present
- [[dealership/dealer-scorecard]] — concept doc never written
- [[onboarding/new-dealer-guide]] — entire folder missing
- [[decisions/appeal-process]] — feature not yet built

*Last updated: 2024-10-15* #status/approved #auto-lending