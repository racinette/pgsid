import type { TraceNode } from "./types.js";

/**
 * Format a TraceNode tree into a human-readable indented string.
 *
 * Example output:
 * ```
 * ColumnRef: o.id [notNull]
 *   facts:
 *     relation = table 'o' (inner scope)
 *     colName = id
 *     joinState = REQUIRED
 *     catalog.notNull = true
 *   → catalog.notNull=true && join REQUIRED
 * ```
 */
export function formatTrace(node: TraceNode, indent = 0): string {
  const pad = "  ".repeat(indent);
  const decision = node.decision ? "notNull" : "nullable";
  const lines: string[] = [];

  lines.push(`${pad}${node.label} [${decision}]`);

  if (node.facts.length > 0) {
    lines.push(`${pad}  facts:`);
    for (const f of node.facts) {
      lines.push(`${pad}    ${f.name} = ${f.value}`);
    }
  }

  for (const child of node.children) {
    lines.push(formatTrace(child, indent + 1));
  }

  if (node.reason) {
    lines.push(`${pad}  → ${node.reason}`);
  }

  return lines.join("\n");
}

/**
 * Format a full trace for an output column, including its name and decision.
 */
export function formatColumnTrace(
  colName: string,
  notNull: boolean,
  trace: TraceNode | undefined,
): string {
  const header = `── ${colName}: ${notNull ? "notNull" : "nullable"} ──`;
  if (!trace) return `${header}\n  (no trace available)`;
  return `${header}\n${formatTrace(trace, 1)}`;
}
