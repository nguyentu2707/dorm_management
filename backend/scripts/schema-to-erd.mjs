import { readFile, writeFile } from "node:fs/promises";
const [snapshot, output] = process.argv.slice(2);
if (!snapshot || !output)
  throw new Error(
    "Usage: node scripts/schema-to-erd.mjs snapshot.json output.md",
  );
const schema = JSON.parse(await readFile(snapshot, "utf8"));
const business = schema.tables.filter((t) => t !== "schema_migrations");
const cs = schema.constraints;
const lines = [
  "# PostgreSQL ERD — actual catalog",
  "",
  "Generated from `" + snapshot + "` captured " + schema.capturedAt + ".",
  "",
  `${business.length} business tables plus schema_migrations. PK/FK/UK describe actual constraints.`,
  "Parent participation uses column nullability; child maximum one is shown only for a full UNIQUE/PK on that FK.",
  "Partial unique indexes remain conditional rules, not unconditional one-to-one cardinality.",
  "",
  "```mermaid",
  "erDiagram",
];
for (const table of business) {
  lines.push("  " + table + " {");
  for (const col of schema.columns.filter((c) => c.table_name === table)) {
    const keys = [];
    for (const [type, label] of [
      ["p", "PK"],
      ["f", "FK"],
      ["u", "UK"],
    ])
      if (
        cs.some(
          (k) =>
            k.table_name === table &&
            k.contype === type &&
            k.columns.includes(col.column_name),
        )
      )
        keys.push(label);
    lines.push(
      "    " +
        col.data_type.replaceAll(" ", "_") +
        " " +
        col.column_name +
        (keys.length ? " " + keys.join(",") : "") +
        ' "' +
        (col.is_nullable === "YES" ? "nullable" : "required") +
        '"',
    );
  }
  lines.push("  }");
}
for (const fk of cs.filter(
  (k) => k.contype === "f" && business.includes(k.table_name),
)) {
  const optional = fk.columns.some(
    (n) =>
      schema.columns.find(
        (c) => c.table_name === fk.table_name && c.column_name === n,
      )?.is_nullable === "YES",
  );
  const single = cs.some(
    (k) =>
      k.table_name === fk.table_name &&
      ["p", "u"].includes(k.contype) &&
      k.columns.every((n) => fk.columns.includes(n)),
  );
  lines.push(
    `  ${fk.target} ${optional ? "|o" : "||"}--${single ? "o|" : "o{"} ${fk.table_name} : "${fk.columns.join("+")}"`,
  );
}
lines.push(
  "```",
  "",
  "## Actual foreign keys and deletion policies",
  "",
  "|Constraint|Relation|Definition|",
  "|---|---|---|",
);
for (const fk of cs.filter((k) => k.contype === "f"))
  lines.push(
    `|${fk.conname}|${fk.table_name}.${fk.columns.join("+")} → ${fk.target}.${fk.target_columns.join("+")}|${fk.definition}|`,
  );
lines.push(
  "",
  "## Actual indexes (including partial unique rules)",
  "",
  "|Table|Name|Definition|",
  "|---|---|---|",
);
for (const idx of schema.indexes)
  lines.push(`|${idx.tablename}|${idx.indexname}|${idx.indexdef}|`);
await writeFile(output, lines.join("\n") + "\n");
