type Operand = { name: string; type: string }

export class CheckRustDiagnostics {
  private readonly reasons = new Map<string, string>()

  constructor(
    readonly enabled: boolean,
    private readonly next: (prefix: string) => string,
    private readonly rustType: (type: string) => string,
    private readonly owned: (value: Operand) => string,
  ) {}

  private fresh(prefix: string): string {
    return this.next('_' + prefix)
  }

  knownness(value: Operand, lines: string[]): string {
    const kind = this.rustType(value.type)
    const prefix = kind
      .slice(0, -'Value'.length)
      .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
      .toLowerCase()
    const name = this.fresh('requirement_nullness')
    lines.push(`let ${name} = ${prefix}_is_null(${this.owned(value)});`)
    return name
  }

  reason(value: Operand, lines: string[]): string {
    if (!this.enabled) return '0'
    const tracked = this.reasons.get(value.name)
    if (tracked !== undefined) return tracked
    const kind = this.rustType(value.type)
    if (
      ![
        'Int2Value',
        'Int4Value',
        'Int8Value',
        'BoolValue',
        'TextValue',
        'Float4Value',
        'Float8Value',
        'XmlValue',
      ].includes(kind)
    )
      return '-1'
    const name = this.fresh('untracked_requirement')
    if (kind === 'XmlValue' || kind === 'TextValue')
      lines.push(
        `let ${name} = check_${kind === 'XmlValue' ? 'xml' : 'text'}_requirement(${this.owned(value)}, -1);`,
      )
    else {
      const nullness = this.knownness(value, lines)
      lines.push(`let ${name} = check_requirement_filter(${nullness}, -1, false);`)
    }
    return name
  }

  set(name: string, reason: string): void {
    if (this.enabled) this.reasons.set(name, reason)
  }

  declared(name: string, lines: string[], initial = '-1'): string {
    if (!this.enabled) return '0'
    const reason = this.fresh('requirement')
    lines.push(
      `let mut ${reason}: i32 = ${initial === '-1' || initial === '0' ? `check_requirement_code(${initial})` : initial};`,
    )
    this.set(name, reason)
    return reason
  }

  reference(name: string): string {
    return this.reasons.get(name) ?? '-1'
  }

  merge(operands: readonly Operand[], lines: string[]): string {
    if (!this.enabled || !operands.length) return '-1'
    const result = this.fresh('combined_requirement')
    lines.push(`let mut ${result}: i32 = check_requirement_code(0);`)
    for (const operand of operands) {
      const reason = this.reason(operand, lines)
      lines.push(`${result} = check_requirement_merge(${result}, ${reason});`)
    }
    return result
  }

  filtered(value: Operand, reason: string, lines: string[]): string {
    if (!this.enabled) return '0'
    const kind = this.rustType(value.type),
      name = this.fresh('filtered_requirement')
    if (kind === 'XmlValue' || kind === 'TextValue')
      lines.push(
        `let ${name} = check_${kind === 'XmlValue' ? 'xml' : 'text'}_requirement(${this.owned(value)}, ${reason});`,
      )
    else {
      const nullness = this.knownness(value, lines)
      const partial = kind === 'ArrayValue'
      lines.push(`let ${name} = check_requirement_filter(${nullness}, ${reason}, ${partial});`)
    }
    return name
  }

  flow(value: Operand, operands: readonly Operand[], lines: string[]): void {
    if (!this.enabled || this.reasons.has(value.name)) return
    const merged = this.merge(operands, lines)
    this.set(value.name, this.filtered(value, merged, lines))
  }

  outcome(name: string, reason: string, lines: string[]): string {
    if (!this.enabled) return '0'
    const filtered = this.fresh('outcome_requirement')
    lines.push(`let ${filtered} = check_requirement_for_outcome(${name}, ${reason});`)
    this.set(name, filtered)
    return filtered
  }
}
