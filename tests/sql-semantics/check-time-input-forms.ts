export const clockInputForms = [
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
] as const

export const timetzInputForms = clockInputForms.filter(
  (text) => text === null || text.trim() === '' || /[zZ+-]/u.test(text),
)

export const deferredClockContextForms = {
  time: ['now', '12:00 UTC'],
  timetz: ['12:00', '12:30AM', 'now', '12:00 UTC', '12:00 America/New_York'],
} as const

export const unimplementedClockGrammarForms = {
  time: ['040506', '12:30.5', '2000-01-01 12:00', '12:00 PM +02'],
  timetz: ['040506+02', '12:30.5+02', '12:00 PM +02'],
} as const
