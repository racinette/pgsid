export const jsonpathInputForms = [
  '$',
  'strict $.a',
  '$[0,last-1]',
  '$ ? (@>1)',
  '- -1.2300',
  '$.decimal(-3,-2)',
  '$ like_regex "a" flag "qismx"',
  '"雪😊"',
  '$."é"',
  '(exists($)).type()',
] as const

export const invalidJsonpathInputForms = [
  '(',
  '1e131072',
  '$ like_regex "["',
  String.raw`"\u0000"`,
  'exists ($).type()',
  '!(exists ($)).type()',
  '($ == 1) is unknown.type()',
] as const

export const deferredJsonpathContextForms = [
  '"雪"',
  String.raw`"\u96ea"`,
  '$ like_regex "a"',
] as const
