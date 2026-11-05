import { z } from "zod";

// Keywords Groq's strict structured-output mode accepts. Anything else (min/max lengths,
// patterns, formats) is stripped here and enforced by the Zod schema after the response.
const KEEP = new Set(["type", "properties", "required", "items", "enum", "anyOf", "description", "additionalProperties", "const"]);

function strictify(node) {
  if (Array.isArray(node)) return node.map(strictify);
  if (!node || typeof node !== "object") return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (!KEEP.has(key)) continue;
    if (key === "properties") {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, strictify(v)]));
    } else {
      out[key] = strictify(value);
    }
  }
  // Strict mode: every object is closed and lists every property as required
  // (optional values are expressed as nullable instead).
  if (out.type === "object" && out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties);
  }
  return out;
}

/** JSON Schema for a Zod schema, shaped for Groq `response_format: json_schema` with strict: true. */
export function toStrictJsonSchema(schema) {
  return strictify(z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }));
}
