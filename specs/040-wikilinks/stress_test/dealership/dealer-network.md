# Dealer Network

#dealership #status/approved #priority/medium #integration/dealer-api

The dealer network is the primary origination channel for the [[architecture/system-overview|auto loan platform]]. Dealers submit applications through the [[architecture/api-gateway|API Gateway]] or via legacy [[dealership/flat-file-import|flat-file upload]].

## Onboarding

New dealers go through a structured onboarding process:

1. **Application** — Dealer submits business license, insurance, and bank details
2. **Background Check** — KYC/AML verification of dealership principals
3. **Tier Assignment** — Initial tier (1, 2, or 3) based on volume commitment and financial stability
4. **API Provisioning** — API keys generated; test environment access granted
5. **Training** — Dealer staff trained on the [[dealership/dealer-submission-format|submission format]] and [[workflow/stipulation-checklist|stipulation process]]

See [[data/dealer-codes.txt]] for the current dealer roster.

## Dealer Tiers

| Tier | Description | API Rate Limit | Example |
|------|-------------|---------------|---------|
| Tier-1 | High-volume, established | 120 req/min, 5K/day | DLR-2201 Prestige Auto Group |
| Tier-2 | Mid-volume, good standing | 60 req/min, 2.5K/day | DLR-7712 Lakeside Chevrolet-Ford |
| Tier-3 | Low-volume or new | 30 req/min, 1K/day | DLR-9903 East Coast Auto Mall |

Rate limits are enforced at the [[architecture/api-gateway|gateway level]].

## Dealer Statuses

| Status | Meaning | Can Submit? |
|--------|---------|-------------|
| ACTIVE | Good standing | ✅ |
| SUSPENDED | Under review | ❌ Returns `ERR-4001` |
| INACTIVE | Terminated | ❌ Returns `ERR-4001` |

See [[data/error-codes.txt]] for error details.

## Notifications

Dealers receive notifications for:
- Application status changes (approved, declined, counter-offer)
- Stipulation requests and deadlines
- API key rotation reminders
- Tier changes

Notifications are delivered via webhook to the dealer's DMS endpoint registered during [[dealership/dealer-network#onboarding|onboarding]].

## Performance Monitoring

Each dealer's submission quality is tracked:
- **Approval rate** — deals approved vs. submitted
- **Validation error rate** — malformed submissions per [[workflow/transaction-intake]]
- **Stipulation completion rate** — stips completed on time per [[workflow/stipulation-checklist]]

Dealers with consistently poor metrics are flagged for review. A [[dealership/dealer-scorecard]] *(not yet implemented — intentionally broken link)* will provide self-service analytics.

## Related

- [[dealership/dealer-submission-format]]
- [[dealership/flat-file-import]]
- [[architecture/api-gateway]]
- [[data/dealer-codes.txt]]
- [[onboarding/new-dealer-guide]] *(broken — folder does not exist)*

---

#auto-lending #risk/tier-1 #risk/tier-2 #risk/tier-3
