# API Gateway

#architecture #integration/dealer-api #status/approved

The API Gateway is the single entry point for all [[dealership/dealer-network|dealer-originated]] loan submissions into the platform.

## Endpoints

### POST `/v2/applications`
Primary endpoint for new deal submissions. Accepts both JSON and XML payloads conforming to the [[dealership/dealer-submission-format|dealer submission schema]].

**Request lifecycle:**
1. Authenticate dealer using API key (mapped from [[data/dealer-codes.txt]])
2. Validate payload schema
3. Check dealer status — reject if dealer is SUSPENDED or INACTIVE (see [[data/error-codes.txt]] for `ERR-4001`)
4. Enqueue to [[architecture/message-queue|Kafka]] topic `loan.applications.inbound`
5. Return `202 Accepted` with tracking ID

### GET `/v2/applications/{id}/status`
Returns current status of an application as it moves through [[workflow/loan-orchestration|orchestration]].

### GET `/v2/applications/{id}/decision`
Returns the final [[decisions/approval-workflow|decision]] once adjudication is complete.

### POST `/v2/applications/{id}/stipulations`
Allows dealers to upload stipulation documents per [[workflow/stipulation-checklist|stipulation requirements]].

## Rate Limiting

| Dealer Tier | Requests/min | Daily Max |
|-------------|-------------|-----------|
| Tier-1 | 120 | 5,000 |
| Tier-2 | 60 | 2,500 |
| Tier-3 | 30 | 1,000 |

Exceeding the daily maximum triggers `ERR-4002` (see [[data/error-codes.txt]]).

## Authentication

All requests require an `X-Dealer-Key` header. Keys are provisioned during [[dealership/dealer-network#onboarding|dealer onboarding]]. Expired or revoked keys return `401 Unauthorized`.

## Legacy Support

The gateway also accepts [[dealership/flat-file-import|flat-file uploads]] via SFTP for dealers that have not migrated to the REST API. These are converted to the standard format and enqueued identically.

## Error Handling

The gateway follows RFC 7807 Problem Details. All error codes map to entries in [[data/error-codes.txt]]. Bureau-specific errors from the [[equifax/equifax-integration|Equifax integration]] are wrapped with a `source: bureau` field.

## Future: GraphQL

A [[architecture/graphql-gateway]] is under consideration for dealer portal use cases. *(Not yet planned — this link is intentionally broken.)*

---

#workflow/intake #priority/high
