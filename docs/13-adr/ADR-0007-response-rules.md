ADR-0007: Response rules (HTTP + payload standards)

Status: Approved
Date: 2026-02-26
Owners: Team (API)

Context
We need consistent API responses across modules (auth, catalog, inventory, work orders, sync, audit, KPIs). Inconsistent status codes and error payloads make the frontend harder to implement, complicate debugging, and reduce trust in KPIs. This capstone also requires API-first discipline, so response rules must be clearly defined and enforced.

Decision
We standardize:
1) HTTP status codes by scenario
2) Success response shapes (no mandatory envelope)
3) Error response shape using ProblemDetails
4) Pagination conventions
5) Idempotency and concurrency conflict responses
6) Security responses (401/403) and safe error messaging
7) Correlation ID propagation in responses

Response rules are part of the API contract. Any endpoint changes must update OpenAPI in the same PR.

Non-goals
- This ADR does not define database schema or business rules.
- This ADR does not mandate a single logging library.
- This ADR does not implement DDoS protection at infrastructure level.

1) API versioning and base path
- All endpoints must live under /api/v1
- No unversioned endpoints except /health if explicitly required

2) Common headers
- Request and response must support X-Correlation-Id
  - If client sends X-Correlation-Id, the API echoes it back.
  - If not sent, the API generates one and returns it.
- Content-Type: application/json for all JSON responses.

3) Success response rules
3.1 General
- Use direct resource responses without a mandatory envelope.
- Use consistent date formats:
  - ISO 8601 UTC timestamps: 2026-02-26T22:10:00Z
  - Dates: YYYY-MM-DD
- Never return internal stack traces or sensitive fields.

3.2 Status codes (success)
- 200 OK: read or update that returns a resource or result
- 201 Created: resource created successfully
  - Include Location header when feasible: Location: /api/v1/work-orders/{id}
- 204 No Content: optional for delete operations (not required in MVP)

3.3 List responses
- 200 OK with an array payload for simple lists.
- If pagination is used, return 200 OK with a paging object (see section 5).

4) Error response rules (ProblemDetails)
All errors must return application/json with the ProblemDetails schema:

ProblemDetails fields
- type: string (internal error urn)
- title: string (short human title)
- status: number (HTTP status code)
- detail: string (human detail, safe to display)
- instance: string (request path)
- correlationId: string (trace ID)
- errors: object (optional), field -> array of messages

Error URN examples
- urn:telecom:error:validation
- urn:telecom:error:auth
- urn:telecom:error:forbidden
- urn:telecom:error:not_found
- urn:telecom:error:conflict
- urn:telecom:error:rate_limited
- urn:telecom:error:internal

4.1 Validation errors
- 400 Bad Request
- type = urn:telecom:error:validation
- errors must include field-level messages when possible

4.2 Authentication and authorization
- 401 Unauthorized
  - Missing/invalid token
  - type = urn:telecom:error:auth
  - detail should not reveal whether username exists
- 403 Forbidden
  - Authenticated but missing permission OR user is blocked
  - type = urn:telecom:error:forbidden or urn:telecom:error:user_blocked
  - detail should be safe and non-sensitive

4.3 Not found
- 404 Not Found
- type = urn:telecom:error:not_found

4.4 Conflicts and concurrency
Use 409 Conflict for:
- Inventory insufficient stock
- Invalid work order status transitions (state machine violation)
- Version mismatch (optimistic concurrency; offline import conflict)
- Attempt to release more inventory than reserved

type examples
- urn:telecom:error:stock_insufficient
- urn:telecom:error:invalid_transition
- urn:telecom:error:version_mismatch
- urn:telecom:error:invalid_release

4.5 Rate limiting
- 429 Too Many Requests
- type = urn:telecom:error:rate_limited
- Include Retry-After header when possible

4.6 Internal errors
- 500 Internal Server Error
- type = urn:telecom:error:internal
- detail must be generic: "An unexpected error occurred."
- The server logs must include correlationId and the original error.

5) Pagination rules
For endpoints that can grow (audit events, work orders list), prefer cursor pagination:

Request query parameters
- cursor: string (opaque)
- limit: integer (default 25, max 100)

Response shape
{
  "items": [...],
  "nextCursor": "opaque-string-or-null"
}

Rules
- If nextCursor is null, there are no more results.
- Sorting must be stable and documented (e.g., by createdAt desc, id desc).

6) Concurrency and idempotency rules
6.1 Optimistic concurrency (required for work orders and sync)
- WorkOrder includes integer version.
- State change requests must include baseVersion.
- If baseVersion != current version, return 409 version_mismatch.

6.2 Idempotency (recommended)
For endpoints that might be retried by clients (create work order, sync import):
- Support Idempotency-Key header (optional in MVP)
- If same Idempotency-Key is used with same payload, return the original result.
- If same key is used with different payload, return 409 conflict.

7) Response content rules by endpoint type
7.1 Auth
- Login returns:
  - 200 { accessToken, expiresAt }
- No refresh token required for MVP.

7.2 Work orders
- Create returns 201 WorkOrder (status starts in DRAFT or SUBMITTED as documented).
- Status change returns 200 WorkOrder with incremented version.
- Invalid transition returns 409 invalid_transition ProblemDetails.

7.3 Inventory
- GET /inventory returns 200 InventoryItem[]
- POST /inventory/reserve returns 200 { status, branchId, productId, qty, workOrderId }
- Insufficient stock returns 409 stock_insufficient ProblemDetails.

7.4 Sync
- POST /sync/import returns 200 SyncImportResponse always, even if conflicts exist.
- Schema invalid returns 400 validation ProblemDetails.
- Conflicts are returned as a list; do not overwrite server state silently.

7.5 Audit
- GET /audit returns 200 AuditEvent[] or paginated response.
- Must be protected by RBAC permission audit:read.

7.6 KPIs
- GET /kpis/summary returns 200 object with KPI keys and values
- KPIs must document formulas and source-of-truth timestamps.

8) OpenAPI requirements
- Every endpoint must document:
  - success response status and schema
  - error responses (400/401/403/404/409/429/500) with ProblemDetails
- OpenAPI must define securitySchemes and security requirements per endpoint.
- OpenAPI must include at least one example for critical endpoints:
  - work order create
  - work order status change
  - inventory reserve
  - sync import

9) Consequences
Positive
- Frontend implementation becomes predictable.
- Debugging improves (correlationId + consistent errors).
- KPIs become more trustworthy (consistent state transitions and timestamps).

Trade-offs
- Slightly more work per endpoint to document and keep consistent.
- Requires discipline: PRs must update OpenAPI and tests.

10) Verification checklist (for PR review)
- Endpoint returns correct status codes and ProblemDetails for errors.
- correlationId is returned in headers and in ProblemDetails.
- OpenAPI updated to match behavior.
- At least one test validates the new/changed response behavior.