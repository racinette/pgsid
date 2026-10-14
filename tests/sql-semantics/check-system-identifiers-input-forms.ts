import { oidInputForms, deferredOidPlatformForms } from './check-oid-input-forms.js'
export const identifier32InputForms = oidInputForms
export const deferredIdentifier32PlatformForms = deferredOidPlatformForms
export const xid8InputForms = [
  ...oidInputForms,
  '9223372036854775807',
  '9223372036854775808',
  '18446744071562067968',
  '18446744073709551614',
  '18446744073709551615',
  '18446744073709551616',
  '-2147483649',
  '-4294967295',
  '-18446744069414584321',
  '-18446744073709551615',
  '0xFFFFFFFFFFFFFFFF',
  '4294967296x',
]
export const deferredXid8PlatformForms = ['0x', '0b101']
