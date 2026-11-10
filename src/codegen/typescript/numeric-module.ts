import { checkRustAsset } from '../shared/check-rust-assets.js'

// A PostgreSQL numeric: exact, carrying its scale, NaN and the infinities, with PostgreSQL's own
// arithmetic and comparison from the CHECK evaluator. The value is opaque: it is made from text
// or a bigint, read back as its exact text, and is a numeric by construction.
export const typescriptNumericDeclaration = `interface PgsidNumeric {
  readonly [Symbol.toStringTag]: 'PgsidNumeric'
  toString(): string
  toJSON(): string
  toNumber(): number
  add(other: PgsidNumeric): PgsidNumeric
  sub(other: PgsidNumeric): PgsidNumeric
  mul(other: PgsidNumeric): PgsidNumeric
  div(other: PgsidNumeric): PgsidNumeric
  mod(other: PgsidNumeric): PgsidNumeric
  neg(): PgsidNumeric
  abs(): PgsidNumeric
  round(scale?: number): PgsidNumeric
  trunc(scale?: number): PgsidNumeric
  compare(other: PgsidNumeric): -1 | 0 | 1
  equals(other: PgsidNumeric): boolean
  isNaN(): boolean
  isInfinite(): boolean
  sign(): number
}`

// The module emitted as pgsid/numeric.ts beside the evaluator files it reaches, which the
// asset build prunes to what this module uses. A value from another copy of this module, as
// each runtime directory has its own, is recognised by its registered symbol.
export const typescriptNumericModule = `import * as operations from "./numeric/pg_catalog/operations.js";
import * as runtime from "./numeric/checkruntime/runtime.js";
export ${typescriptNumericDeclaration}
const numericBrand = Symbol.for("pgsid.numeric");
const numericTexts = new WeakMap<object, string>();
function sqlError(error: runtime.SqlError): Error {
  return Object.assign(new Error(runtime.sqlErrorMessage(error).message), { code: error.state.toString(36).toUpperCase().padStart(5, "0") });
}
function numericResult(value: runtime.NumericValue): PgsidNumeric {
  if (value.kind === "Value") return numericOf(value.value);
  if (value.kind === "Error") throw sqlError(value.value);
  throw new Error("The numeric operation has no result");
}
function numericOperand(value: unknown): runtime.NumericValue {
  const operand = isNumeric(value) ? runtime.makeNumericValue(value.toString()) : null;
  if (operand?.kind !== "Value") throw new TypeError("A numeric operand must be a numeric value");
  return operand;
}
function numericScale(scale: number): runtime.Int4Value {
  if (!Number.isInteger(scale) || scale < -2147483648 || scale > 2147483647) throw new TypeError("A numeric scale must be a 32-bit integer");
  return runtime.makeInt4Value(scale);
}
class Numeric implements PgsidNumeric {
  constructor(text: string) {
    numericTexts.set(this, text);
  }
  get [Symbol.toStringTag](): "PgsidNumeric" {
    return "PgsidNumeric";
  }
  [Symbol.toPrimitive](hint: string): string {
    // Arithmetic and comparison operators would act on the text; the methods act on the number.
    if (hint !== "string") throw new TypeError("A numeric value is compared and computed with its methods");
    return this.toString();
  }
  toString(): string {
    return numericTexts.get(this)!;
  }
  toJSON(): string {
    return this.toString();
  }
  // The nearest double, so precision beyond it, and the scale, are lost.
  toNumber(): number {
    return Number(this.toString());
  }
  add(other: PgsidNumeric): PgsidNumeric {
    return numericResult(operations.numericAddO3d7(numericOperand(this), numericOperand(other)));
  }
  sub(other: PgsidNumeric): PgsidNumeric {
    return numericResult(operations.numericSubYs09(numericOperand(this), numericOperand(other)));
  }
  mul(other: PgsidNumeric): PgsidNumeric {
    return numericResult(operations.numericMulBj4l(numericOperand(this), numericOperand(other)));
  }
  div(other: PgsidNumeric): PgsidNumeric {
    return numericResult(operations.numericDivPnzm(numericOperand(this), numericOperand(other)));
  }
  mod(other: PgsidNumeric): PgsidNumeric {
    return numericResult(operations.numericMod8ywz(numericOperand(this), numericOperand(other)));
  }
  neg(): PgsidNumeric {
    return numericResult(operations.numericUminusWcmy(numericOperand(this)));
  }
  abs(): PgsidNumeric {
    return numericResult(operations.numericAbs6g5e(numericOperand(this)));
  }
  round(scale?: number): PgsidNumeric {
    return numericResult(scale === undefined ? operations.roundMmpo(numericOperand(this)) : operations.roundOtcq(numericOperand(this), numericScale(scale)));
  }
  trunc(scale?: number): PgsidNumeric {
    return numericResult(scale === undefined ? operations.truncDghz(numericOperand(this)) : operations.truncHay3(numericOperand(this), numericScale(scale)));
  }
  // PostgreSQL's order, in which NaN equals itself and follows every other value.
  compare(other: PgsidNumeric): -1 | 0 | 1 {
    const result = operations.numericCmp6h4s(numericOperand(this), numericOperand(other));
    if (result.kind !== "Value") throw new Error("The numeric comparison has no result");
    return Math.sign(result.value) as -1 | 0 | 1;
  }
  equals(other: PgsidNumeric): boolean {
    const result = operations.numericEqFw7r(numericOperand(this), numericOperand(other));
    if (result.kind !== "Value") throw new Error("The numeric comparison has no result");
    return result.value;
  }
  isNaN(): boolean {
    return this.toString() === "NaN";
  }
  isInfinite(): boolean {
    return this.toString() === "Infinity" || this.toString() === "-Infinity";
  }
  // -1, 0 or 1, or NaN for NaN.
  sign(): number {
    return Number(numericResult(operations.sign2rsu(numericOperand(this))).toString());
  }
}
Object.defineProperty(Numeric.prototype, numericBrand, { value: true });
function numericOf(text: string): PgsidNumeric {
  return Object.freeze(new Numeric(text));
}
export function isNumeric(value: unknown): value is PgsidNumeric {
  return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[numericBrand] === true;
}
// A numeric from its text, read as PostgreSQL reads numeric input, or from a bigint.
export function numeric(value: string | bigint): PgsidNumeric {
  if (typeof value === "bigint") return numericOf(value.toString());
  if (typeof value !== "string") throw new TypeError("A numeric is made from a string or a bigint");
  return numericResult(operations.scalarNumericFromText(runtime.makeTextValue(value)));
}
// A numeric the server sent, whose text is already numeric output.
export function numericFromServer(text: string): PgsidNumeric {
  return numericOf(text);
}
`

export type TypescriptNumericFile = { path: string; content: string }

// The evaluator files the numeric module reaches, translated and pruned when the asset is built.
export function typescriptNumericFiles(): TypescriptNumericFile[] {
  return (
    JSON.parse(checkRustAsset('typescript-numeric.json').toString('utf8')) as {
      files: TypescriptNumericFile[]
    }
  ).files
}
