export const moneyInputForms: (string | null)[] = [
  null,
  '0',
  '',
  ' ',
  ' 00 ',
  '\t0\r\n',
  '00000000',
]
export const deferredMoneyContextForms = [
  '1.25',
  '$1.25',
  '(1.25)',
  '1,25',
  '0.00',
  '+0',
  '-0',
  '0 0',
  'bad',
  'Infinity',
  'NaN',
]
