import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const schemas = [
  {
    file: "contracts/schemas/employee-event.v1.schema.json",
    requiredTopLevel: ["$id", "$schema", "title", "type", "required", "properties"],
    requiredPropertyKeys: ["schema_version", "event_type", "event_id", "occurred_at", "tenant_id", "employee"],
    expectedId: "watchman/contracts/employee-event.v1",
  },
  {
    file: "contracts/schemas/integration-envelope.v1.schema.json",
    requiredTopLevel: ["$id", "$schema", "title", "type", "required", "properties"],
    requiredPropertyKeys: ["tenant_id", "source_record_id"],
    expectedId: "watchman/contracts/integration-envelope.v1",
  },
];

const errors = [];

for (const schema of schemas) {
  const abs = resolve(root, schema.file);
  if (!existsSync(abs)) {
    errors.push(`Missing schema file: ${schema.file}`);
    continue;
  }
  let json;
  try {
    json = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    errors.push(`Invalid JSON in ${schema.file}: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  for (const key of schema.requiredTopLevel) {
    if (!(key in json)) errors.push(`${schema.file} missing top-level key "${key}"`);
  }
  if (json.$id !== schema.expectedId) {
    errors.push(`${schema.file} has unexpected $id "${json.$id}" (expected "${schema.expectedId}")`);
  }
  const props = json.properties && typeof json.properties === "object" ? json.properties : {};
  for (const key of schema.requiredPropertyKeys) {
    if (!(key in props)) errors.push(`${schema.file} missing properties.${key}`);
  }
}

if (errors.length > 0) {
  console.error("Contract schema check failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("Contract schema check passed.");
