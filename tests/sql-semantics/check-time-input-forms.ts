export const clockInputForms: (string | null)[] = [
  '',
  ' ',
  '-00:00',
  '+00:00',
  '00:00',
  '0:0',
  '00:00:00',
  '04:05',
  '12:00',
  '24:00',
  '23:59:59.9999999',
  '12:34:60',
  '24:00:00.0000005',
  '24:00:00.0000006',
  '25:00',
  '12:60',
  '12:00:61',
  '12:00:00.0000005',
  '12:00:00.0000015',
  '12:00:00.0000025',
  '12:00:00.123456789',
  '0:30AM',
  '0:30PM',
  '12:30AM',
  '12:30PM',
  '13:00PM',
  '12:00Z',
  '12:00+02',
  '12:00-05:30',
  '12:00+15:59:59',
  '12:00+16',
  '12:00+02:60',
  '12:00+0200',
  '12:00+1234',
  null,
]

clockInputForms.push(
  '0405',
  '040506',
  '0405.5',
  '040506.5',
  '040506+02',
  '040506.1234567-05:30',
  '2400',
  '240000',
  '246000',
  '126060',
  '999999',
  '12:30.5',
  '59:59.9999995',
  '60:00.5',
  '12:30.5+02',
  '12:00 PM +02',
  '12:00PM+02',
  'PM 12:00',
  'PM 12:00+02',
  'AM 12:00+02',
  '12:00 AM -05:30',
  '12:00 AM PM +02',
  '2000-01-01 12:00',
  '2000-01-01T12:00+02',
  '2000-02-31 12:00',
  '2000-02-29 12:00 PM +02',
  '1999-02-29 12:00+02',
  '12:30.5PM+02',
  '0405.5PM+02',
)
let seed = 0x78143d1b
for (let index = 0; index < 128; index++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const hour = String(seed % 25).padStart(2, '0'),
    minute = String((seed >>> 8) % 61).padStart(2, '0'),
    second = String((seed >>> 16) % 62).padStart(2, '0'),
    fraction = String(seed % 1000000).padStart(6, '0')
  clockInputForms.push(
    `${hour}${minute}${second}.${fraction}+02`,
    `${hour}:${minute}.${fraction}-05:30`,
    `${hour}:${minute}:${second}.${fraction} PM +02`,
  )
}
export const timetzInputForms = clockInputForms.filter(
  (text) =>
    text === null ||
    text.trim() === '' ||
    /^[+-]/u.test(text) ||
    /(?:[zZ]|[+-]\d{1,6}(?::\d{1,2}){0,2})(?:\s*(?:AM|PM))?$/iu.test(
      text.replace(/^\d{4,}-\d{1,2}-\d{1,2}\s+/u, ''),
    ),
)

export const deferredClockContextForms = {
  time: ['now', '12:00 UTC'],
  timetz: [
    '12:00',
    '12:30AM',
    'now',
    '12:00 UTC',
    '12:00 America/New_York',
    '0405',
    '2000-01-01 12:00',
  ],
} as const

export const unimplementedClockGrammarForms = {
  time: [],
  timetz: [],
} as const
