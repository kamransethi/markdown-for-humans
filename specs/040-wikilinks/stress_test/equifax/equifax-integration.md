# Equifax Integration

#integration/equifax #status/approved #priority/high #compliance/fcra

The Equifax integration provides credit bureau data to the [[workflow/adjudication-engine|adjudication engine]] for every auto loan application processed by the [[architecture/system-overview|platform]].

## Connection Architecture

```
┌──────────────────┐     SOAP/XML      ┌──────────────────┐
│ Adjudication     │────over HTTPS────▶│ Equifax Gateway   │
│ Engine           │                    │ (ePort)           │
│                  │◀───────────────────│                   │
└──────────────────┘   Credit Report    └──────────────────┘
```

Requests flow through the [[architecture/message-queue|Kafka]] topics `loan.bureau.requests` and `loan.bureau.responses`.

## Request Types

Two pull types are available, governed by the [[equifax/soft-pull-vs-hard-pull|pull type policy]]:


| Type                                                   | Purpose           | Inquiry Impact  | Used For                                      |
| ------------------------------------------------------ | ----------------- | --------------- | --------------------------------------------- |
| [[equifax/soft-pull-vs-hard-pull#soft-pull|Soft Pull]] | Pre-qualification | No impact       | Dealer pre-screen                             |
| [[equifax/soft-pull-vs-hard-pull#hard-pull|Hard Pull]] | Full application  | Records inquiry | [[workflow/adjudication-engine|Adjudication]] |


## Response Data

The bureau response includes:

- **FICO Score** — mapped to risk tier via [[equifax/credit-score-mapping]]
- **Trade Lines** — used for [[credit-policy/dti-rules|DTI calculation]]
- **Inquiries** — number of recent credit pulls
- **Public Records** — bankruptcies, liens, judgments
- **Fraud Alerts** — consumer-placed alerts

## Permissible Purpose

All bureau pulls must have a valid permissible purpose under the Fair Credit Reporting Act (FCRA). For auto loan applications, the permissible purpose is:

- **Credit transaction** initiated by the consumer's application at the [[dealership/dealer-network|dealership]]

The platform logs permissible purpose evidence for every pull. See [[compliance/reg-b-checklist]] for the full compliance matrix *(not yet documented — broken link)*.

## Fraud Alerts

When the bureau response contains a fraud alert:

1. The application is flagged in the [[workflow/adjudication-engine]]
2. Enhanced identity verification is added to the [[workflow/stipulation-checklist|stipulation list]]
3. The deal is routed to the [[workflow/risk-scoring|risk scoring module]] for manual review *(module not yet built — broken link)*

Error code `ERR-2004` (see [[data/error-codes.txt]]) is recorded.

## Error Handling


| Error Code | Condition                       | Action                                  |
| ---------- | ------------------------------- | --------------------------------------- |
| `ERR-2001` | Bureau timeout (&gt; 3s)        | Retry up to 3 times, then manual review |
| `ERR-2002` | No credit file found ("no hit") | Cannot decision — return to dealer      |
| `ERR-2003` | Consumer has frozen their file  | Cannot pull — inform dealer             |
| `ERR-2004` | Active fraud alert              | Enhanced verification required          |


All codes documented in [[data/error-codes.txt]].

## SLA


| Metric              | Target     |
| ------------------- | ---------- |
| Response time (P50) | &lt; 800ms |
| Response time (P95) | &lt; 3s    |
| Availability        | 99.95%     |
| Monthly pull volume | ~150,000   |


## TransUnion Fallback

> ⚠️ A [[equifax/transunion-fallback]] was discussed as a backup bureau source when Equifax is unavailable. This integration has **not** been built. The link is intentionally broken.

## Related

- [[equifax/credit-score-mapping]]
- [[equifax/soft-pull-vs-hard-pull]]
- [[workflow/adjudication-engine]]
- [[credit-policy/credit-policy-overview]]
- [[credit-policy/tier-matrix]]
- [[data/error-codes.txt]]

#auto-lending #workflow/adjudication #compliance/fcra