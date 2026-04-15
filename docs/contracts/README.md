# Watchman Finance Contract References

Finance consumes shared Watchman ecosystem contracts authored in Operations:

- `docs/contracts/identity-and-rbac-spec.md`
- `docs/contracts/employee-canonical-schema-v1.md`
- `docs/contracts/integration-transport-standard-v1.md`

Implementation requirement for Finance:

- Validate incoming payloads against contract version and required fields.
- Enforce idempotency and correlation ID traceability for all staged events.
- Keep `v1` routes stable while adding future versions.
