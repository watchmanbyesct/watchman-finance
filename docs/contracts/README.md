# Watchman Finance Contract References

Finance consumes shared Watchman ecosystem contracts authored in Operations:

- `docs/contracts/identity-and-rbac-spec.md`
- `docs/contracts/employee-canonical-schema-v1.md`
- `docs/contracts/employee-canonical-schema-v2.md`
- `docs/contracts/employee-canonical-v1-to-v2-migration.md`
- `docs/contracts/integration-transport-standard-v1.md`

Implementation requirement for Finance:

- Validate incoming payloads against contract version and required fields.
- Enforce idempotency and correlation ID traceability for all staged events.
- Support `employee.v1` + `employee.v2` coexistence during migration.
- Keep `v1` routes stable until v1 sunset criteria are met in Operations governance docs.
