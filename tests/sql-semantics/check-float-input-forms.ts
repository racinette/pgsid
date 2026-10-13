export const floatInputForms: (string | null)[] = [
  '',
  ' ',
  '+',
  '-',
  '.',
  '1',
  '1.',
  '1.5',
  '.5',
  '+.5',
  '-.5',
  '01',
  '-0',
  '-0.0',
  '-0e999999999999999999',
  '+0e-999999999999999999',
  '1e3',
  '1E+3',
  '1e-3',
  '1e',
  '1e+',
  '1e99999',
  '-1e99999',
  '1e-99999',
  '-1e-99999',
  'NaN',
  'nAn',
  'Infinity',
  '-Infinity',
  '+inf',
  ' 1.5\t',
  '1_0',
  '1 e2',
  '１２',
  '1\n2',
  '7.038531e-26',
  '1.000000059604644775390625000001',
  '-1.000000059604644775390625000001',
  '1.000000059604644775390625',
  '1.000000178813934326171875',
  '340282356779733661637539395458142568448',
  '340282356779733661637539395458142568447',
  '7.00649232162408535461864791644958065640130970938257885878534141944895541342930300743319094181060791015625e-46',
  '7.00649232162408535461864791644958065640130970938257885878534141944895541342930300743319094181060791015626e-46',
  '1.401298464324817e-45',
  '1.7976931348623157e308',
  '1.7976931348623159e308',
  '2.4703282292062327e-324',
  '2.4703282292062328e-324',
  '5e-324',
  null,
]
let seed = 0x6a09e667f3bcc909n
for (let i = 0; i < 200; i++) {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
  floatInputForms.push(`${i % 2 ? '-' : ''}${seed}e${(i % 100) - 65}`)
}
const exactDecimal = (value: number) => {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  const raw = view.getBigUint64(0)
  let coefficient = (raw & ((1n << 52n) - 1n)) + (1n << 52n),
    power = Number(raw >> 52n) - 1075
  while (coefficient % 2n === 0n) {
    coefficient /= 2n
    power++
  }
  return power >= 0
    ? { digits: coefficient << BigInt(power), scale: 0 }
    : { digits: coefficient * 5n ** BigInt(-power), scale: -power }
}
const decimalText = (digits: bigint, scale: number) => {
  if (scale === 0) return String(digits)
  const text = String(digits).padStart(scale + 1, '0')
  return text.slice(0, -scale) + '.' + text.slice(-scale)
}
const singleView = new DataView(new ArrayBuffer(4))
for (let i = 0; i < 128; i++) {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
  const bits = Number(seed % 2139095038n) + 1
  singleView.setUint32(0, bits)
  const a = singleView.getFloat32(0)
  singleView.setUint32(0, bits + 1)
  const b = singleView.getFloat32(0)
  const midpoint = exactDecimal((a + b) / 2)
  for (const delta of [-1n, 0n, 1n]) {
    const text = decimalText(midpoint.digits * 10n + delta, midpoint.scale + 1)
    floatInputForms.push(text, '-' + text)
  }
}

export const deferredFloatInputForms = [
  '0x1p3',
  '0x1.ffffffp127',
  '-NaN',
  '+NaN',
  'nan(payload)',
] as const
