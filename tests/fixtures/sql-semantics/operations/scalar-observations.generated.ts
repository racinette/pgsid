import type { SqlObservation } from '../../../support/postgres/observe.js'
export const scalarObservations: Readonly<Record<string, SqlObservation>> = {
  'boolean literal false': {
    kind: 'value',
    value: 'false',
  },
  'boolean not false': {
    kind: 'value',
    value: 'true',
  },
  'boolean and false/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean or false/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison = false/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison <> false/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison < false/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison <= false/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison > false/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison >= false/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean and false/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean or false/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison = false/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison <> false/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison < false/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison <= false/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison > false/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison >= false/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean and false/null': {
    kind: 'value',
    value: 'false',
  },
  'boolean or false/null': {
    kind: 'null',
  },
  'boolean comparison = false/null': {
    kind: 'null',
  },
  'boolean comparison <> false/null': {
    kind: 'null',
  },
  'boolean comparison < false/null': {
    kind: 'null',
  },
  'boolean comparison <= false/null': {
    kind: 'null',
  },
  'boolean comparison > false/null': {
    kind: 'null',
  },
  'boolean comparison >= false/null': {
    kind: 'null',
  },
  'boolean literal true': {
    kind: 'value',
    value: 'true',
  },
  'boolean not true': {
    kind: 'value',
    value: 'false',
  },
  'boolean and true/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean or true/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison = true/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison <> true/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison < true/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison <= true/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison > true/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison >= true/false': {
    kind: 'value',
    value: 'true',
  },
  'boolean and true/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean or true/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison = true/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison <> true/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison < true/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison <= true/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison > true/true': {
    kind: 'value',
    value: 'false',
  },
  'boolean comparison >= true/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean and true/null': {
    kind: 'null',
  },
  'boolean or true/null': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison = true/null': {
    kind: 'null',
  },
  'boolean comparison <> true/null': {
    kind: 'null',
  },
  'boolean comparison < true/null': {
    kind: 'null',
  },
  'boolean comparison <= true/null': {
    kind: 'null',
  },
  'boolean comparison > true/null': {
    kind: 'null',
  },
  'boolean comparison >= true/null': {
    kind: 'null',
  },
  'boolean literal null': {
    kind: 'null',
  },
  'boolean not null': {
    kind: 'null',
  },
  'boolean and null/false': {
    kind: 'value',
    value: 'false',
  },
  'boolean or null/false': {
    kind: 'null',
  },
  'boolean comparison = null/false': {
    kind: 'null',
  },
  'boolean comparison <> null/false': {
    kind: 'null',
  },
  'boolean comparison < null/false': {
    kind: 'null',
  },
  'boolean comparison <= null/false': {
    kind: 'null',
  },
  'boolean comparison > null/false': {
    kind: 'null',
  },
  'boolean comparison >= null/false': {
    kind: 'null',
  },
  'boolean and null/true': {
    kind: 'null',
  },
  'boolean or null/true': {
    kind: 'value',
    value: 'true',
  },
  'boolean comparison = null/true': {
    kind: 'null',
  },
  'boolean comparison <> null/true': {
    kind: 'null',
  },
  'boolean comparison < null/true': {
    kind: 'null',
  },
  'boolean comparison <= null/true': {
    kind: 'null',
  },
  'boolean comparison > null/true': {
    kind: 'null',
  },
  'boolean comparison >= null/true': {
    kind: 'null',
  },
  'boolean and null/null': {
    kind: 'null',
  },
  'boolean or null/null': {
    kind: 'null',
  },
  'boolean comparison = null/null': {
    kind: 'null',
  },
  'boolean comparison <> null/null': {
    kind: 'null',
  },
  'boolean comparison < null/null': {
    kind: 'null',
  },
  'boolean comparison <= null/null': {
    kind: 'null',
  },
  'boolean comparison > null/null': {
    kind: 'null',
  },
  'boolean comparison >= null/null': {
    kind: 'null',
  },
  'text literal 0': {
    kind: 'null',
  },
  'text length 0': {
    kind: 'null',
  },
  'text char_length 0': {
    kind: 'null',
  },
  'text character_length 0': {
    kind: 'null',
  },
  'text octet_length 0': {
    kind: 'null',
  },
  'text comparison = 0/0': {
    kind: 'null',
  },
  'text comparison <> 0/0': {
    kind: 'null',
  },
  'text comparison < 0/0': {
    kind: 'null',
  },
  'text comparison <= 0/0': {
    kind: 'null',
  },
  'text comparison > 0/0': {
    kind: 'null',
  },
  'text comparison >= 0/0': {
    kind: 'null',
  },
  'text comparison || 0/0': {
    kind: 'null',
  },
  'text textcat 0/0': {
    kind: 'null',
  },
  'text comparison = 0/1': {
    kind: 'null',
  },
  'text comparison <> 0/1': {
    kind: 'null',
  },
  'text comparison < 0/1': {
    kind: 'null',
  },
  'text comparison <= 0/1': {
    kind: 'null',
  },
  'text comparison > 0/1': {
    kind: 'null',
  },
  'text comparison >= 0/1': {
    kind: 'null',
  },
  'text comparison || 0/1': {
    kind: 'null',
  },
  'text textcat 0/1': {
    kind: 'null',
  },
  'text comparison = 0/2': {
    kind: 'null',
  },
  'text comparison <> 0/2': {
    kind: 'null',
  },
  'text comparison < 0/2': {
    kind: 'null',
  },
  'text comparison <= 0/2': {
    kind: 'null',
  },
  'text comparison > 0/2': {
    kind: 'null',
  },
  'text comparison >= 0/2': {
    kind: 'null',
  },
  'text comparison || 0/2': {
    kind: 'null',
  },
  'text textcat 0/2': {
    kind: 'null',
  },
  'text comparison = 0/3': {
    kind: 'null',
  },
  'text comparison <> 0/3': {
    kind: 'null',
  },
  'text comparison < 0/3': {
    kind: 'null',
  },
  'text comparison <= 0/3': {
    kind: 'null',
  },
  'text comparison > 0/3': {
    kind: 'null',
  },
  'text comparison >= 0/3': {
    kind: 'null',
  },
  'text comparison || 0/3': {
    kind: 'null',
  },
  'text textcat 0/3': {
    kind: 'null',
  },
  'text comparison = 0/4': {
    kind: 'null',
  },
  'text comparison <> 0/4': {
    kind: 'null',
  },
  'text comparison < 0/4': {
    kind: 'null',
  },
  'text comparison <= 0/4': {
    kind: 'null',
  },
  'text comparison > 0/4': {
    kind: 'null',
  },
  'text comparison >= 0/4': {
    kind: 'null',
  },
  'text comparison || 0/4': {
    kind: 'null',
  },
  'text textcat 0/4': {
    kind: 'null',
  },
  'text comparison = 0/5': {
    kind: 'null',
  },
  'text comparison <> 0/5': {
    kind: 'null',
  },
  'text comparison < 0/5': {
    kind: 'null',
  },
  'text comparison <= 0/5': {
    kind: 'null',
  },
  'text comparison > 0/5': {
    kind: 'null',
  },
  'text comparison >= 0/5': {
    kind: 'null',
  },
  'text comparison || 0/5': {
    kind: 'null',
  },
  'text textcat 0/5': {
    kind: 'null',
  },
  'text comparison = 0/6': {
    kind: 'null',
  },
  'text comparison <> 0/6': {
    kind: 'null',
  },
  'text comparison < 0/6': {
    kind: 'null',
  },
  'text comparison <= 0/6': {
    kind: 'null',
  },
  'text comparison > 0/6': {
    kind: 'null',
  },
  'text comparison >= 0/6': {
    kind: 'null',
  },
  'text comparison || 0/6': {
    kind: 'null',
  },
  'text textcat 0/6': {
    kind: 'null',
  },
  'text comparison = 0/7': {
    kind: 'null',
  },
  'text comparison <> 0/7': {
    kind: 'null',
  },
  'text comparison < 0/7': {
    kind: 'null',
  },
  'text comparison <= 0/7': {
    kind: 'null',
  },
  'text comparison > 0/7': {
    kind: 'null',
  },
  'text comparison >= 0/7': {
    kind: 'null',
  },
  'text comparison || 0/7': {
    kind: 'null',
  },
  'text textcat 0/7': {
    kind: 'null',
  },
  'text comparison = 0/8': {
    kind: 'null',
  },
  'text comparison <> 0/8': {
    kind: 'null',
  },
  'text comparison < 0/8': {
    kind: 'null',
  },
  'text comparison <= 0/8': {
    kind: 'null',
  },
  'text comparison > 0/8': {
    kind: 'null',
  },
  'text comparison >= 0/8': {
    kind: 'null',
  },
  'text comparison || 0/8': {
    kind: 'null',
  },
  'text textcat 0/8': {
    kind: 'null',
  },
  'text comparison = 0/9': {
    kind: 'null',
  },
  'text comparison <> 0/9': {
    kind: 'null',
  },
  'text comparison < 0/9': {
    kind: 'null',
  },
  'text comparison <= 0/9': {
    kind: 'null',
  },
  'text comparison > 0/9': {
    kind: 'null',
  },
  'text comparison >= 0/9': {
    kind: 'null',
  },
  'text comparison || 0/9': {
    kind: 'null',
  },
  'text textcat 0/9': {
    kind: 'null',
  },
  'text comparison = 0/10': {
    kind: 'null',
  },
  'text comparison <> 0/10': {
    kind: 'null',
  },
  'text comparison < 0/10': {
    kind: 'null',
  },
  'text comparison <= 0/10': {
    kind: 'null',
  },
  'text comparison > 0/10': {
    kind: 'null',
  },
  'text comparison >= 0/10': {
    kind: 'null',
  },
  'text comparison || 0/10': {
    kind: 'null',
  },
  'text textcat 0/10': {
    kind: 'null',
  },
  'text comparison = 0/11': {
    kind: 'null',
  },
  'text comparison <> 0/11': {
    kind: 'null',
  },
  'text comparison < 0/11': {
    kind: 'null',
  },
  'text comparison <= 0/11': {
    kind: 'null',
  },
  'text comparison > 0/11': {
    kind: 'null',
  },
  'text comparison >= 0/11': {
    kind: 'null',
  },
  'text comparison || 0/11': {
    kind: 'null',
  },
  'text textcat 0/11': {
    kind: 'null',
  },
  'text comparison = 0/12': {
    kind: 'null',
  },
  'text comparison <> 0/12': {
    kind: 'null',
  },
  'text comparison < 0/12': {
    kind: 'null',
  },
  'text comparison <= 0/12': {
    kind: 'null',
  },
  'text comparison > 0/12': {
    kind: 'null',
  },
  'text comparison >= 0/12': {
    kind: 'null',
  },
  'text comparison || 0/12': {
    kind: 'null',
  },
  'text textcat 0/12': {
    kind: 'null',
  },
  'text comparison = 0/13': {
    kind: 'null',
  },
  'text comparison <> 0/13': {
    kind: 'null',
  },
  'text comparison < 0/13': {
    kind: 'null',
  },
  'text comparison <= 0/13': {
    kind: 'null',
  },
  'text comparison > 0/13': {
    kind: 'null',
  },
  'text comparison >= 0/13': {
    kind: 'null',
  },
  'text comparison || 0/13': {
    kind: 'null',
  },
  'text textcat 0/13': {
    kind: 'null',
  },
  'text comparison = 0/14': {
    kind: 'null',
  },
  'text comparison <> 0/14': {
    kind: 'null',
  },
  'text comparison < 0/14': {
    kind: 'null',
  },
  'text comparison <= 0/14': {
    kind: 'null',
  },
  'text comparison > 0/14': {
    kind: 'null',
  },
  'text comparison >= 0/14': {
    kind: 'null',
  },
  'text comparison || 0/14': {
    kind: 'null',
  },
  'text textcat 0/14': {
    kind: 'null',
  },
  'text literal 1': {
    kind: 'value',
    value: '',
  },
  'text length 1': {
    kind: 'value',
    value: '0',
  },
  'text char_length 1': {
    kind: 'value',
    value: '0',
  },
  'text character_length 1': {
    kind: 'value',
    value: '0',
  },
  'text octet_length 1': {
    kind: 'value',
    value: '0',
  },
  'text comparison = 1/0': {
    kind: 'null',
  },
  'text comparison <> 1/0': {
    kind: 'null',
  },
  'text comparison < 1/0': {
    kind: 'null',
  },
  'text comparison <= 1/0': {
    kind: 'null',
  },
  'text comparison > 1/0': {
    kind: 'null',
  },
  'text comparison >= 1/0': {
    kind: 'null',
  },
  'text comparison || 1/0': {
    kind: 'null',
  },
  'text textcat 1/0': {
    kind: 'null',
  },
  'text comparison = 1/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 1/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 1/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 1/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 1/1': {
    kind: 'value',
    value: '',
  },
  'text textcat 1/1': {
    kind: 'value',
    value: '',
  },
  'text comparison = 1/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/2': {
    kind: 'value',
    value: 'a',
  },
  'text textcat 1/2': {
    kind: 'value',
    value: 'a',
  },
  'text comparison = 1/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/3': {
    kind: 'value',
    value: 'aa',
  },
  'text textcat 1/3': {
    kind: 'value',
    value: 'aa',
  },
  'text comparison = 1/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/4': {
    kind: 'value',
    value: 'b',
  },
  'text textcat 1/4': {
    kind: 'value',
    value: 'b',
  },
  'text comparison = 1/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/5': {
    kind: 'value',
    value: 'A',
  },
  'text textcat 1/5': {
    kind: 'value',
    value: 'A',
  },
  'text comparison = 1/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/6': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 1/6': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 1/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/7': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 1/7': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 1/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/8': {
    kind: 'value',
    value: '😀',
  },
  'text textcat 1/8': {
    kind: 'value',
    value: '😀',
  },
  'text comparison = 1/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/9': {
    kind: 'value',
    value: '',
  },
  'text textcat 1/9': {
    kind: 'value',
    value: '',
  },
  'text comparison = 1/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/10': {
    kind: 'value',
    value: '𐀀',
  },
  'text textcat 1/10': {
    kind: 'value',
    value: '𐀀',
  },
  'text comparison = 1/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/11': {
    kind: 'value',
    value: "O'Brien",
  },
  'text textcat 1/11': {
    kind: 'value',
    value: "O'Brien",
  },
  'text comparison = 1/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/12': {
    kind: 'value',
    value: 'a\\b',
  },
  'text textcat 1/12': {
    kind: 'value',
    value: 'a\\b',
  },
  'text comparison = 1/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/13': {
    kind: 'value',
    value: 'a\nb',
  },
  'text textcat 1/13': {
    kind: 'value',
    value: 'a\nb',
  },
  'text comparison = 1/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 1/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 1/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 1/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 1/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 1/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 1/14': {
    kind: 'value',
    value: '中文',
  },
  'text textcat 1/14': {
    kind: 'value',
    value: '中文',
  },
  'text literal 2': {
    kind: 'value',
    value: 'a',
  },
  'text length 2': {
    kind: 'value',
    value: '1',
  },
  'text char_length 2': {
    kind: 'value',
    value: '1',
  },
  'text character_length 2': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 2': {
    kind: 'value',
    value: '1',
  },
  'text comparison = 2/0': {
    kind: 'null',
  },
  'text comparison <> 2/0': {
    kind: 'null',
  },
  'text comparison < 2/0': {
    kind: 'null',
  },
  'text comparison <= 2/0': {
    kind: 'null',
  },
  'text comparison > 2/0': {
    kind: 'null',
  },
  'text comparison >= 2/0': {
    kind: 'null',
  },
  'text comparison || 2/0': {
    kind: 'null',
  },
  'text textcat 2/0': {
    kind: 'null',
  },
  'text comparison = 2/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 2/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 2/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 2/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 2/1': {
    kind: 'value',
    value: 'a',
  },
  'text textcat 2/1': {
    kind: 'value',
    value: 'a',
  },
  'text comparison = 2/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 2/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 2/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 2/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 2/2': {
    kind: 'value',
    value: 'aa',
  },
  'text textcat 2/2': {
    kind: 'value',
    value: 'aa',
  },
  'text comparison = 2/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/3': {
    kind: 'value',
    value: 'aaa',
  },
  'text textcat 2/3': {
    kind: 'value',
    value: 'aaa',
  },
  'text comparison = 2/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/4': {
    kind: 'value',
    value: 'ab',
  },
  'text textcat 2/4': {
    kind: 'value',
    value: 'ab',
  },
  'text comparison = 2/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 2/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 2/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 2/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 2/5': {
    kind: 'value',
    value: 'aA',
  },
  'text textcat 2/5': {
    kind: 'value',
    value: 'aA',
  },
  'text comparison = 2/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/6': {
    kind: 'value',
    value: 'aé',
  },
  'text textcat 2/6': {
    kind: 'value',
    value: 'aé',
  },
  'text comparison = 2/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/7': {
    kind: 'value',
    value: 'aé',
  },
  'text textcat 2/7': {
    kind: 'value',
    value: 'aé',
  },
  'text comparison = 2/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/8': {
    kind: 'value',
    value: 'a😀',
  },
  'text textcat 2/8': {
    kind: 'value',
    value: 'a😀',
  },
  'text comparison = 2/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/9': {
    kind: 'value',
    value: 'a',
  },
  'text textcat 2/9': {
    kind: 'value',
    value: 'a',
  },
  'text comparison = 2/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/10': {
    kind: 'value',
    value: 'a𐀀',
  },
  'text textcat 2/10': {
    kind: 'value',
    value: 'a𐀀',
  },
  'text comparison = 2/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 2/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 2/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 2/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 2/11': {
    kind: 'value',
    value: "aO'Brien",
  },
  'text textcat 2/11': {
    kind: 'value',
    value: "aO'Brien",
  },
  'text comparison = 2/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/12': {
    kind: 'value',
    value: 'aa\\b',
  },
  'text textcat 2/12': {
    kind: 'value',
    value: 'aa\\b',
  },
  'text comparison = 2/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/13': {
    kind: 'value',
    value: 'aa\nb',
  },
  'text textcat 2/13': {
    kind: 'value',
    value: 'aa\nb',
  },
  'text comparison = 2/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 2/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 2/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 2/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 2/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 2/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 2/14': {
    kind: 'value',
    value: 'a中文',
  },
  'text textcat 2/14': {
    kind: 'value',
    value: 'a中文',
  },
  'text literal 3': {
    kind: 'value',
    value: 'aa',
  },
  'text length 3': {
    kind: 'value',
    value: '2',
  },
  'text char_length 3': {
    kind: 'value',
    value: '2',
  },
  'text character_length 3': {
    kind: 'value',
    value: '2',
  },
  'text octet_length 3': {
    kind: 'value',
    value: '2',
  },
  'text comparison = 3/0': {
    kind: 'null',
  },
  'text comparison <> 3/0': {
    kind: 'null',
  },
  'text comparison < 3/0': {
    kind: 'null',
  },
  'text comparison <= 3/0': {
    kind: 'null',
  },
  'text comparison > 3/0': {
    kind: 'null',
  },
  'text comparison >= 3/0': {
    kind: 'null',
  },
  'text comparison || 3/0': {
    kind: 'null',
  },
  'text textcat 3/0': {
    kind: 'null',
  },
  'text comparison = 3/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/1': {
    kind: 'value',
    value: 'aa',
  },
  'text textcat 3/1': {
    kind: 'value',
    value: 'aa',
  },
  'text comparison = 3/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/2': {
    kind: 'value',
    value: 'aaa',
  },
  'text textcat 3/2': {
    kind: 'value',
    value: 'aaa',
  },
  'text comparison = 3/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 3/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 3/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/3': {
    kind: 'value',
    value: 'aaaa',
  },
  'text textcat 3/3': {
    kind: 'value',
    value: 'aaaa',
  },
  'text comparison = 3/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/4': {
    kind: 'value',
    value: 'aab',
  },
  'text textcat 3/4': {
    kind: 'value',
    value: 'aab',
  },
  'text comparison = 3/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/5': {
    kind: 'value',
    value: 'aaA',
  },
  'text textcat 3/5': {
    kind: 'value',
    value: 'aaA',
  },
  'text comparison = 3/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/6': {
    kind: 'value',
    value: 'aaé',
  },
  'text textcat 3/6': {
    kind: 'value',
    value: 'aaé',
  },
  'text comparison = 3/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/7': {
    kind: 'value',
    value: 'aaé',
  },
  'text textcat 3/7': {
    kind: 'value',
    value: 'aaé',
  },
  'text comparison = 3/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/8': {
    kind: 'value',
    value: 'aa😀',
  },
  'text textcat 3/8': {
    kind: 'value',
    value: 'aa😀',
  },
  'text comparison = 3/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/9': {
    kind: 'value',
    value: 'aa',
  },
  'text textcat 3/9': {
    kind: 'value',
    value: 'aa',
  },
  'text comparison = 3/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/10': {
    kind: 'value',
    value: 'aa𐀀',
  },
  'text textcat 3/10': {
    kind: 'value',
    value: 'aa𐀀',
  },
  'text comparison = 3/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/11': {
    kind: 'value',
    value: "aaO'Brien",
  },
  'text textcat 3/11': {
    kind: 'value',
    value: "aaO'Brien",
  },
  'text comparison = 3/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/12': {
    kind: 'value',
    value: 'aaa\\b',
  },
  'text textcat 3/12': {
    kind: 'value',
    value: 'aaa\\b',
  },
  'text comparison = 3/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 3/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 3/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 3/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 3/13': {
    kind: 'value',
    value: 'aaa\nb',
  },
  'text textcat 3/13': {
    kind: 'value',
    value: 'aaa\nb',
  },
  'text comparison = 3/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 3/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 3/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 3/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 3/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 3/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 3/14': {
    kind: 'value',
    value: 'aa中文',
  },
  'text textcat 3/14': {
    kind: 'value',
    value: 'aa中文',
  },
  'text literal 4': {
    kind: 'value',
    value: 'b',
  },
  'text length 4': {
    kind: 'value',
    value: '1',
  },
  'text char_length 4': {
    kind: 'value',
    value: '1',
  },
  'text character_length 4': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 4': {
    kind: 'value',
    value: '1',
  },
  'text comparison = 4/0': {
    kind: 'null',
  },
  'text comparison <> 4/0': {
    kind: 'null',
  },
  'text comparison < 4/0': {
    kind: 'null',
  },
  'text comparison <= 4/0': {
    kind: 'null',
  },
  'text comparison > 4/0': {
    kind: 'null',
  },
  'text comparison >= 4/0': {
    kind: 'null',
  },
  'text comparison || 4/0': {
    kind: 'null',
  },
  'text textcat 4/0': {
    kind: 'null',
  },
  'text comparison = 4/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/1': {
    kind: 'value',
    value: 'b',
  },
  'text textcat 4/1': {
    kind: 'value',
    value: 'b',
  },
  'text comparison = 4/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/2': {
    kind: 'value',
    value: 'ba',
  },
  'text textcat 4/2': {
    kind: 'value',
    value: 'ba',
  },
  'text comparison = 4/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/3': {
    kind: 'value',
    value: 'baa',
  },
  'text textcat 4/3': {
    kind: 'value',
    value: 'baa',
  },
  'text comparison = 4/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 4/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 4/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/4': {
    kind: 'value',
    value: 'bb',
  },
  'text textcat 4/4': {
    kind: 'value',
    value: 'bb',
  },
  'text comparison = 4/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/5': {
    kind: 'value',
    value: 'bA',
  },
  'text textcat 4/5': {
    kind: 'value',
    value: 'bA',
  },
  'text comparison = 4/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/6': {
    kind: 'value',
    value: 'bé',
  },
  'text textcat 4/6': {
    kind: 'value',
    value: 'bé',
  },
  'text comparison = 4/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/7': {
    kind: 'value',
    value: 'bé',
  },
  'text textcat 4/7': {
    kind: 'value',
    value: 'bé',
  },
  'text comparison = 4/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/8': {
    kind: 'value',
    value: 'b😀',
  },
  'text textcat 4/8': {
    kind: 'value',
    value: 'b😀',
  },
  'text comparison = 4/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/9': {
    kind: 'value',
    value: 'b',
  },
  'text textcat 4/9': {
    kind: 'value',
    value: 'b',
  },
  'text comparison = 4/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/10': {
    kind: 'value',
    value: 'b𐀀',
  },
  'text textcat 4/10': {
    kind: 'value',
    value: 'b𐀀',
  },
  'text comparison = 4/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/11': {
    kind: 'value',
    value: "bO'Brien",
  },
  'text textcat 4/11': {
    kind: 'value',
    value: "bO'Brien",
  },
  'text comparison = 4/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/12': {
    kind: 'value',
    value: 'ba\\b',
  },
  'text textcat 4/12': {
    kind: 'value',
    value: 'ba\\b',
  },
  'text comparison = 4/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 4/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 4/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 4/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 4/13': {
    kind: 'value',
    value: 'ba\nb',
  },
  'text textcat 4/13': {
    kind: 'value',
    value: 'ba\nb',
  },
  'text comparison = 4/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 4/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 4/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 4/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 4/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 4/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 4/14': {
    kind: 'value',
    value: 'b中文',
  },
  'text textcat 4/14': {
    kind: 'value',
    value: 'b中文',
  },
  'text literal 5': {
    kind: 'value',
    value: 'A',
  },
  'text length 5': {
    kind: 'value',
    value: '1',
  },
  'text char_length 5': {
    kind: 'value',
    value: '1',
  },
  'text character_length 5': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 5': {
    kind: 'value',
    value: '1',
  },
  'text comparison = 5/0': {
    kind: 'null',
  },
  'text comparison <> 5/0': {
    kind: 'null',
  },
  'text comparison < 5/0': {
    kind: 'null',
  },
  'text comparison <= 5/0': {
    kind: 'null',
  },
  'text comparison > 5/0': {
    kind: 'null',
  },
  'text comparison >= 5/0': {
    kind: 'null',
  },
  'text comparison || 5/0': {
    kind: 'null',
  },
  'text textcat 5/0': {
    kind: 'null',
  },
  'text comparison = 5/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 5/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 5/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 5/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 5/1': {
    kind: 'value',
    value: 'A',
  },
  'text textcat 5/1': {
    kind: 'value',
    value: 'A',
  },
  'text comparison = 5/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/2': {
    kind: 'value',
    value: 'Aa',
  },
  'text textcat 5/2': {
    kind: 'value',
    value: 'Aa',
  },
  'text comparison = 5/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/3': {
    kind: 'value',
    value: 'Aaa',
  },
  'text textcat 5/3': {
    kind: 'value',
    value: 'Aaa',
  },
  'text comparison = 5/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/4': {
    kind: 'value',
    value: 'Ab',
  },
  'text textcat 5/4': {
    kind: 'value',
    value: 'Ab',
  },
  'text comparison = 5/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 5/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 5/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 5/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 5/5': {
    kind: 'value',
    value: 'AA',
  },
  'text textcat 5/5': {
    kind: 'value',
    value: 'AA',
  },
  'text comparison = 5/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/6': {
    kind: 'value',
    value: 'Aé',
  },
  'text textcat 5/6': {
    kind: 'value',
    value: 'Aé',
  },
  'text comparison = 5/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/7': {
    kind: 'value',
    value: 'Aé',
  },
  'text textcat 5/7': {
    kind: 'value',
    value: 'Aé',
  },
  'text comparison = 5/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/8': {
    kind: 'value',
    value: 'A😀',
  },
  'text textcat 5/8': {
    kind: 'value',
    value: 'A😀',
  },
  'text comparison = 5/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/9': {
    kind: 'value',
    value: 'A',
  },
  'text textcat 5/9': {
    kind: 'value',
    value: 'A',
  },
  'text comparison = 5/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/10': {
    kind: 'value',
    value: 'A𐀀',
  },
  'text textcat 5/10': {
    kind: 'value',
    value: 'A𐀀',
  },
  'text comparison = 5/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/11': {
    kind: 'value',
    value: "AO'Brien",
  },
  'text textcat 5/11': {
    kind: 'value',
    value: "AO'Brien",
  },
  'text comparison = 5/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/12': {
    kind: 'value',
    value: 'Aa\\b',
  },
  'text textcat 5/12': {
    kind: 'value',
    value: 'Aa\\b',
  },
  'text comparison = 5/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/13': {
    kind: 'value',
    value: 'Aa\nb',
  },
  'text textcat 5/13': {
    kind: 'value',
    value: 'Aa\nb',
  },
  'text comparison = 5/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 5/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 5/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 5/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 5/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 5/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 5/14': {
    kind: 'value',
    value: 'A中文',
  },
  'text textcat 5/14': {
    kind: 'value',
    value: 'A中文',
  },
  'text literal 6': {
    kind: 'value',
    value: 'é',
  },
  'text length 6': {
    kind: 'value',
    value: '1',
  },
  'text char_length 6': {
    kind: 'value',
    value: '1',
  },
  'text character_length 6': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 6': {
    kind: 'value',
    value: '2',
  },
  'text comparison = 6/0': {
    kind: 'null',
  },
  'text comparison <> 6/0': {
    kind: 'null',
  },
  'text comparison < 6/0': {
    kind: 'null',
  },
  'text comparison <= 6/0': {
    kind: 'null',
  },
  'text comparison > 6/0': {
    kind: 'null',
  },
  'text comparison >= 6/0': {
    kind: 'null',
  },
  'text comparison || 6/0': {
    kind: 'null',
  },
  'text textcat 6/0': {
    kind: 'null',
  },
  'text comparison = 6/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/1': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 6/1': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 6/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/2': {
    kind: 'value',
    value: 'éa',
  },
  'text textcat 6/2': {
    kind: 'value',
    value: 'éa',
  },
  'text comparison = 6/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/3': {
    kind: 'value',
    value: 'éaa',
  },
  'text textcat 6/3': {
    kind: 'value',
    value: 'éaa',
  },
  'text comparison = 6/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/4': {
    kind: 'value',
    value: 'éb',
  },
  'text textcat 6/4': {
    kind: 'value',
    value: 'éb',
  },
  'text comparison = 6/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/5': {
    kind: 'value',
    value: 'éA',
  },
  'text textcat 6/5': {
    kind: 'value',
    value: 'éA',
  },
  'text comparison = 6/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 6/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 6/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 6/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 6/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/6': {
    kind: 'value',
    value: 'éé',
  },
  'text textcat 6/6': {
    kind: 'value',
    value: 'éé',
  },
  'text comparison = 6/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/7': {
    kind: 'value',
    value: 'éé',
  },
  'text textcat 6/7': {
    kind: 'value',
    value: 'éé',
  },
  'text comparison = 6/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 6/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 6/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 6/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 6/8': {
    kind: 'value',
    value: 'é😀',
  },
  'text textcat 6/8': {
    kind: 'value',
    value: 'é😀',
  },
  'text comparison = 6/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 6/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 6/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 6/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 6/9': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 6/9': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 6/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 6/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 6/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 6/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 6/10': {
    kind: 'value',
    value: 'é𐀀',
  },
  'text textcat 6/10': {
    kind: 'value',
    value: 'é𐀀',
  },
  'text comparison = 6/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/11': {
    kind: 'value',
    value: "éO'Brien",
  },
  'text textcat 6/11': {
    kind: 'value',
    value: "éO'Brien",
  },
  'text comparison = 6/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/12': {
    kind: 'value',
    value: 'éa\\b',
  },
  'text textcat 6/12': {
    kind: 'value',
    value: 'éa\\b',
  },
  'text comparison = 6/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 6/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 6/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 6/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 6/13': {
    kind: 'value',
    value: 'éa\nb',
  },
  'text textcat 6/13': {
    kind: 'value',
    value: 'éa\nb',
  },
  'text comparison = 6/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 6/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 6/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 6/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 6/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 6/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 6/14': {
    kind: 'value',
    value: 'é中文',
  },
  'text textcat 6/14': {
    kind: 'value',
    value: 'é中文',
  },
  'text literal 7': {
    kind: 'value',
    value: 'é',
  },
  'text length 7': {
    kind: 'value',
    value: '2',
  },
  'text char_length 7': {
    kind: 'value',
    value: '2',
  },
  'text character_length 7': {
    kind: 'value',
    value: '2',
  },
  'text octet_length 7': {
    kind: 'value',
    value: '3',
  },
  'text comparison = 7/0': {
    kind: 'null',
  },
  'text comparison <> 7/0': {
    kind: 'null',
  },
  'text comparison < 7/0': {
    kind: 'null',
  },
  'text comparison <= 7/0': {
    kind: 'null',
  },
  'text comparison > 7/0': {
    kind: 'null',
  },
  'text comparison >= 7/0': {
    kind: 'null',
  },
  'text comparison || 7/0': {
    kind: 'null',
  },
  'text textcat 7/0': {
    kind: 'null',
  },
  'text comparison = 7/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/1': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 7/1': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 7/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/2': {
    kind: 'value',
    value: 'éa',
  },
  'text textcat 7/2': {
    kind: 'value',
    value: 'éa',
  },
  'text comparison = 7/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/3': {
    kind: 'value',
    value: 'éaa',
  },
  'text textcat 7/3': {
    kind: 'value',
    value: 'éaa',
  },
  'text comparison = 7/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/4': {
    kind: 'value',
    value: 'éb',
  },
  'text textcat 7/4': {
    kind: 'value',
    value: 'éb',
  },
  'text comparison = 7/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/5': {
    kind: 'value',
    value: 'éA',
  },
  'text textcat 7/5': {
    kind: 'value',
    value: 'éA',
  },
  'text comparison = 7/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 7/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 7/6': {
    kind: 'value',
    value: 'éé',
  },
  'text textcat 7/6': {
    kind: 'value',
    value: 'éé',
  },
  'text comparison = 7/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 7/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 7/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/7': {
    kind: 'value',
    value: 'éé',
  },
  'text textcat 7/7': {
    kind: 'value',
    value: 'éé',
  },
  'text comparison = 7/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 7/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 7/8': {
    kind: 'value',
    value: 'é😀',
  },
  'text textcat 7/8': {
    kind: 'value',
    value: 'é😀',
  },
  'text comparison = 7/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 7/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 7/9': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 7/9': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 7/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 7/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 7/10': {
    kind: 'value',
    value: 'é𐀀',
  },
  'text textcat 7/10': {
    kind: 'value',
    value: 'é𐀀',
  },
  'text comparison = 7/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/11': {
    kind: 'value',
    value: "éO'Brien",
  },
  'text textcat 7/11': {
    kind: 'value',
    value: "éO'Brien",
  },
  'text comparison = 7/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/12': {
    kind: 'value',
    value: 'éa\\b',
  },
  'text textcat 7/12': {
    kind: 'value',
    value: 'éa\\b',
  },
  'text comparison = 7/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 7/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 7/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 7/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 7/13': {
    kind: 'value',
    value: 'éa\nb',
  },
  'text textcat 7/13': {
    kind: 'value',
    value: 'éa\nb',
  },
  'text comparison = 7/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 7/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 7/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 7/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 7/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 7/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 7/14': {
    kind: 'value',
    value: 'é中文',
  },
  'text textcat 7/14': {
    kind: 'value',
    value: 'é中文',
  },
  'text literal 8': {
    kind: 'value',
    value: '😀',
  },
  'text length 8': {
    kind: 'value',
    value: '1',
  },
  'text char_length 8': {
    kind: 'value',
    value: '1',
  },
  'text character_length 8': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 8': {
    kind: 'value',
    value: '4',
  },
  'text comparison = 8/0': {
    kind: 'null',
  },
  'text comparison <> 8/0': {
    kind: 'null',
  },
  'text comparison < 8/0': {
    kind: 'null',
  },
  'text comparison <= 8/0': {
    kind: 'null',
  },
  'text comparison > 8/0': {
    kind: 'null',
  },
  'text comparison >= 8/0': {
    kind: 'null',
  },
  'text comparison || 8/0': {
    kind: 'null',
  },
  'text textcat 8/0': {
    kind: 'null',
  },
  'text comparison = 8/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/1': {
    kind: 'value',
    value: '😀',
  },
  'text textcat 8/1': {
    kind: 'value',
    value: '😀',
  },
  'text comparison = 8/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/2': {
    kind: 'value',
    value: '😀a',
  },
  'text textcat 8/2': {
    kind: 'value',
    value: '😀a',
  },
  'text comparison = 8/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/3': {
    kind: 'value',
    value: '😀aa',
  },
  'text textcat 8/3': {
    kind: 'value',
    value: '😀aa',
  },
  'text comparison = 8/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/4': {
    kind: 'value',
    value: '😀b',
  },
  'text textcat 8/4': {
    kind: 'value',
    value: '😀b',
  },
  'text comparison = 8/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/5': {
    kind: 'value',
    value: '😀A',
  },
  'text textcat 8/5': {
    kind: 'value',
    value: '😀A',
  },
  'text comparison = 8/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/6': {
    kind: 'value',
    value: '😀é',
  },
  'text textcat 8/6': {
    kind: 'value',
    value: '😀é',
  },
  'text comparison = 8/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/7': {
    kind: 'value',
    value: '😀é',
  },
  'text textcat 8/7': {
    kind: 'value',
    value: '😀é',
  },
  'text comparison = 8/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 8/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 8/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 8/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 8/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/8': {
    kind: 'value',
    value: '😀😀',
  },
  'text textcat 8/8': {
    kind: 'value',
    value: '😀😀',
  },
  'text comparison = 8/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/9': {
    kind: 'value',
    value: '😀',
  },
  'text textcat 8/9': {
    kind: 'value',
    value: '😀',
  },
  'text comparison = 8/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/10': {
    kind: 'value',
    value: '😀𐀀',
  },
  'text textcat 8/10': {
    kind: 'value',
    value: '😀𐀀',
  },
  'text comparison = 8/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/11': {
    kind: 'value',
    value: "😀O'Brien",
  },
  'text textcat 8/11': {
    kind: 'value',
    value: "😀O'Brien",
  },
  'text comparison = 8/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/12': {
    kind: 'value',
    value: '😀a\\b',
  },
  'text textcat 8/12': {
    kind: 'value',
    value: '😀a\\b',
  },
  'text comparison = 8/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/13': {
    kind: 'value',
    value: '😀a\nb',
  },
  'text textcat 8/13': {
    kind: 'value',
    value: '😀a\nb',
  },
  'text comparison = 8/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 8/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 8/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 8/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 8/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 8/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 8/14': {
    kind: 'value',
    value: '😀中文',
  },
  'text textcat 8/14': {
    kind: 'value',
    value: '😀中文',
  },
  'text literal 9': {
    kind: 'value',
    value: '',
  },
  'text length 9': {
    kind: 'value',
    value: '1',
  },
  'text char_length 9': {
    kind: 'value',
    value: '1',
  },
  'text character_length 9': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 9': {
    kind: 'value',
    value: '3',
  },
  'text comparison = 9/0': {
    kind: 'null',
  },
  'text comparison <> 9/0': {
    kind: 'null',
  },
  'text comparison < 9/0': {
    kind: 'null',
  },
  'text comparison <= 9/0': {
    kind: 'null',
  },
  'text comparison > 9/0': {
    kind: 'null',
  },
  'text comparison >= 9/0': {
    kind: 'null',
  },
  'text comparison || 9/0': {
    kind: 'null',
  },
  'text textcat 9/0': {
    kind: 'null',
  },
  'text comparison = 9/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/1': {
    kind: 'value',
    value: '',
  },
  'text textcat 9/1': {
    kind: 'value',
    value: '',
  },
  'text comparison = 9/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/2': {
    kind: 'value',
    value: 'a',
  },
  'text textcat 9/2': {
    kind: 'value',
    value: 'a',
  },
  'text comparison = 9/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/3': {
    kind: 'value',
    value: 'aa',
  },
  'text textcat 9/3': {
    kind: 'value',
    value: 'aa',
  },
  'text comparison = 9/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/4': {
    kind: 'value',
    value: 'b',
  },
  'text textcat 9/4': {
    kind: 'value',
    value: 'b',
  },
  'text comparison = 9/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/5': {
    kind: 'value',
    value: 'A',
  },
  'text textcat 9/5': {
    kind: 'value',
    value: 'A',
  },
  'text comparison = 9/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/6': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 9/6': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 9/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/7': {
    kind: 'value',
    value: 'é',
  },
  'text textcat 9/7': {
    kind: 'value',
    value: 'é',
  },
  'text comparison = 9/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 9/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 9/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 9/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 9/8': {
    kind: 'value',
    value: '😀',
  },
  'text textcat 9/8': {
    kind: 'value',
    value: '😀',
  },
  'text comparison = 9/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 9/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 9/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 9/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 9/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/9': {
    kind: 'value',
    value: '',
  },
  'text textcat 9/9': {
    kind: 'value',
    value: '',
  },
  'text comparison = 9/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 9/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 9/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 9/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 9/10': {
    kind: 'value',
    value: '𐀀',
  },
  'text textcat 9/10': {
    kind: 'value',
    value: '𐀀',
  },
  'text comparison = 9/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/11': {
    kind: 'value',
    value: "O'Brien",
  },
  'text textcat 9/11': {
    kind: 'value',
    value: "O'Brien",
  },
  'text comparison = 9/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/12': {
    kind: 'value',
    value: 'a\\b',
  },
  'text textcat 9/12': {
    kind: 'value',
    value: 'a\\b',
  },
  'text comparison = 9/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/13': {
    kind: 'value',
    value: 'a\nb',
  },
  'text textcat 9/13': {
    kind: 'value',
    value: 'a\nb',
  },
  'text comparison = 9/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 9/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 9/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 9/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 9/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 9/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 9/14': {
    kind: 'value',
    value: '中文',
  },
  'text textcat 9/14': {
    kind: 'value',
    value: '中文',
  },
  'text literal 10': {
    kind: 'value',
    value: '𐀀',
  },
  'text length 10': {
    kind: 'value',
    value: '1',
  },
  'text char_length 10': {
    kind: 'value',
    value: '1',
  },
  'text character_length 10': {
    kind: 'value',
    value: '1',
  },
  'text octet_length 10': {
    kind: 'value',
    value: '4',
  },
  'text comparison = 10/0': {
    kind: 'null',
  },
  'text comparison <> 10/0': {
    kind: 'null',
  },
  'text comparison < 10/0': {
    kind: 'null',
  },
  'text comparison <= 10/0': {
    kind: 'null',
  },
  'text comparison > 10/0': {
    kind: 'null',
  },
  'text comparison >= 10/0': {
    kind: 'null',
  },
  'text comparison || 10/0': {
    kind: 'null',
  },
  'text textcat 10/0': {
    kind: 'null',
  },
  'text comparison = 10/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/1': {
    kind: 'value',
    value: '𐀀',
  },
  'text textcat 10/1': {
    kind: 'value',
    value: '𐀀',
  },
  'text comparison = 10/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/2': {
    kind: 'value',
    value: '𐀀a',
  },
  'text textcat 10/2': {
    kind: 'value',
    value: '𐀀a',
  },
  'text comparison = 10/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/3': {
    kind: 'value',
    value: '𐀀aa',
  },
  'text textcat 10/3': {
    kind: 'value',
    value: '𐀀aa',
  },
  'text comparison = 10/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/4': {
    kind: 'value',
    value: '𐀀b',
  },
  'text textcat 10/4': {
    kind: 'value',
    value: '𐀀b',
  },
  'text comparison = 10/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/5': {
    kind: 'value',
    value: '𐀀A',
  },
  'text textcat 10/5': {
    kind: 'value',
    value: '𐀀A',
  },
  'text comparison = 10/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/6': {
    kind: 'value',
    value: '𐀀é',
  },
  'text textcat 10/6': {
    kind: 'value',
    value: '𐀀é',
  },
  'text comparison = 10/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/7': {
    kind: 'value',
    value: '𐀀é',
  },
  'text textcat 10/7': {
    kind: 'value',
    value: '𐀀é',
  },
  'text comparison = 10/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 10/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 10/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 10/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 10/8': {
    kind: 'value',
    value: '𐀀😀',
  },
  'text textcat 10/8': {
    kind: 'value',
    value: '𐀀😀',
  },
  'text comparison = 10/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/9': {
    kind: 'value',
    value: '𐀀',
  },
  'text textcat 10/9': {
    kind: 'value',
    value: '𐀀',
  },
  'text comparison = 10/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 10/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 10/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 10/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 10/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/10': {
    kind: 'value',
    value: '𐀀𐀀',
  },
  'text textcat 10/10': {
    kind: 'value',
    value: '𐀀𐀀',
  },
  'text comparison = 10/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/11': {
    kind: 'value',
    value: "𐀀O'Brien",
  },
  'text textcat 10/11': {
    kind: 'value',
    value: "𐀀O'Brien",
  },
  'text comparison = 10/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/12': {
    kind: 'value',
    value: '𐀀a\\b',
  },
  'text textcat 10/12': {
    kind: 'value',
    value: '𐀀a\\b',
  },
  'text comparison = 10/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/13': {
    kind: 'value',
    value: '𐀀a\nb',
  },
  'text textcat 10/13': {
    kind: 'value',
    value: '𐀀a\nb',
  },
  'text comparison = 10/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 10/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 10/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 10/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 10/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 10/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 10/14': {
    kind: 'value',
    value: '𐀀中文',
  },
  'text textcat 10/14': {
    kind: 'value',
    value: '𐀀中文',
  },
  'text literal 11': {
    kind: 'value',
    value: "O'Brien",
  },
  'text length 11': {
    kind: 'value',
    value: '7',
  },
  'text char_length 11': {
    kind: 'value',
    value: '7',
  },
  'text character_length 11': {
    kind: 'value',
    value: '7',
  },
  'text octet_length 11': {
    kind: 'value',
    value: '7',
  },
  'text comparison = 11/0': {
    kind: 'null',
  },
  'text comparison <> 11/0': {
    kind: 'null',
  },
  'text comparison < 11/0': {
    kind: 'null',
  },
  'text comparison <= 11/0': {
    kind: 'null',
  },
  'text comparison > 11/0': {
    kind: 'null',
  },
  'text comparison >= 11/0': {
    kind: 'null',
  },
  'text comparison || 11/0': {
    kind: 'null',
  },
  'text textcat 11/0': {
    kind: 'null',
  },
  'text comparison = 11/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 11/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 11/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 11/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 11/1': {
    kind: 'value',
    value: "O'Brien",
  },
  'text textcat 11/1': {
    kind: 'value',
    value: "O'Brien",
  },
  'text comparison = 11/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/2': {
    kind: 'value',
    value: "O'Briena",
  },
  'text textcat 11/2': {
    kind: 'value',
    value: "O'Briena",
  },
  'text comparison = 11/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/3': {
    kind: 'value',
    value: "O'Brienaa",
  },
  'text textcat 11/3': {
    kind: 'value',
    value: "O'Brienaa",
  },
  'text comparison = 11/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/4': {
    kind: 'value',
    value: "O'Brienb",
  },
  'text textcat 11/4': {
    kind: 'value',
    value: "O'Brienb",
  },
  'text comparison = 11/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 11/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 11/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 11/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 11/5': {
    kind: 'value',
    value: "O'BrienA",
  },
  'text textcat 11/5': {
    kind: 'value',
    value: "O'BrienA",
  },
  'text comparison = 11/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/6': {
    kind: 'value',
    value: "O'Briené",
  },
  'text textcat 11/6': {
    kind: 'value',
    value: "O'Briené",
  },
  'text comparison = 11/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/7': {
    kind: 'value',
    value: "O'Briené",
  },
  'text textcat 11/7': {
    kind: 'value',
    value: "O'Briené",
  },
  'text comparison = 11/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/8': {
    kind: 'value',
    value: "O'Brien😀",
  },
  'text textcat 11/8': {
    kind: 'value',
    value: "O'Brien😀",
  },
  'text comparison = 11/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/9': {
    kind: 'value',
    value: "O'Brien",
  },
  'text textcat 11/9': {
    kind: 'value',
    value: "O'Brien",
  },
  'text comparison = 11/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/10': {
    kind: 'value',
    value: "O'Brien𐀀",
  },
  'text textcat 11/10': {
    kind: 'value',
    value: "O'Brien𐀀",
  },
  'text comparison = 11/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 11/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 11/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 11/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 11/11': {
    kind: 'value',
    value: "O'BrienO'Brien",
  },
  'text textcat 11/11': {
    kind: 'value',
    value: "O'BrienO'Brien",
  },
  'text comparison = 11/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/12': {
    kind: 'value',
    value: "O'Briena\\b",
  },
  'text textcat 11/12': {
    kind: 'value',
    value: "O'Briena\\b",
  },
  'text comparison = 11/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/13': {
    kind: 'value',
    value: "O'Briena\nb",
  },
  'text textcat 11/13': {
    kind: 'value',
    value: "O'Briena\nb",
  },
  'text comparison = 11/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 11/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 11/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 11/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 11/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 11/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 11/14': {
    kind: 'value',
    value: "O'Brien中文",
  },
  'text textcat 11/14': {
    kind: 'value',
    value: "O'Brien中文",
  },
  'text literal 12': {
    kind: 'value',
    value: 'a\\b',
  },
  'text length 12': {
    kind: 'value',
    value: '3',
  },
  'text char_length 12': {
    kind: 'value',
    value: '3',
  },
  'text character_length 12': {
    kind: 'value',
    value: '3',
  },
  'text octet_length 12': {
    kind: 'value',
    value: '3',
  },
  'text comparison = 12/0': {
    kind: 'null',
  },
  'text comparison <> 12/0': {
    kind: 'null',
  },
  'text comparison < 12/0': {
    kind: 'null',
  },
  'text comparison <= 12/0': {
    kind: 'null',
  },
  'text comparison > 12/0': {
    kind: 'null',
  },
  'text comparison >= 12/0': {
    kind: 'null',
  },
  'text comparison || 12/0': {
    kind: 'null',
  },
  'text textcat 12/0': {
    kind: 'null',
  },
  'text comparison = 12/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 12/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 12/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/1': {
    kind: 'value',
    value: 'a\\b',
  },
  'text textcat 12/1': {
    kind: 'value',
    value: 'a\\b',
  },
  'text comparison = 12/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 12/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 12/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/2': {
    kind: 'value',
    value: 'a\\ba',
  },
  'text textcat 12/2': {
    kind: 'value',
    value: 'a\\ba',
  },
  'text comparison = 12/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/3': {
    kind: 'value',
    value: 'a\\baa',
  },
  'text textcat 12/3': {
    kind: 'value',
    value: 'a\\baa',
  },
  'text comparison = 12/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/4': {
    kind: 'value',
    value: 'a\\bb',
  },
  'text textcat 12/4': {
    kind: 'value',
    value: 'a\\bb',
  },
  'text comparison = 12/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 12/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 12/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/5': {
    kind: 'value',
    value: 'a\\bA',
  },
  'text textcat 12/5': {
    kind: 'value',
    value: 'a\\bA',
  },
  'text comparison = 12/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/6': {
    kind: 'value',
    value: 'a\\bé',
  },
  'text textcat 12/6': {
    kind: 'value',
    value: 'a\\bé',
  },
  'text comparison = 12/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/7': {
    kind: 'value',
    value: 'a\\bé',
  },
  'text textcat 12/7': {
    kind: 'value',
    value: 'a\\bé',
  },
  'text comparison = 12/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/8': {
    kind: 'value',
    value: 'a\\b😀',
  },
  'text textcat 12/8': {
    kind: 'value',
    value: 'a\\b😀',
  },
  'text comparison = 12/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/9': {
    kind: 'value',
    value: 'a\\b',
  },
  'text textcat 12/9': {
    kind: 'value',
    value: 'a\\b',
  },
  'text comparison = 12/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/10': {
    kind: 'value',
    value: 'a\\b𐀀',
  },
  'text textcat 12/10': {
    kind: 'value',
    value: 'a\\b𐀀',
  },
  'text comparison = 12/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 12/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 12/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/11': {
    kind: 'value',
    value: "a\\bO'Brien",
  },
  'text textcat 12/11': {
    kind: 'value',
    value: "a\\bO'Brien",
  },
  'text comparison = 12/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 12/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 12/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/12': {
    kind: 'value',
    value: 'a\\ba\\b',
  },
  'text textcat 12/12': {
    kind: 'value',
    value: 'a\\ba\\b',
  },
  'text comparison = 12/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 12/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 12/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 12/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 12/13': {
    kind: 'value',
    value: 'a\\ba\nb',
  },
  'text textcat 12/13': {
    kind: 'value',
    value: 'a\\ba\nb',
  },
  'text comparison = 12/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 12/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 12/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 12/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 12/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 12/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 12/14': {
    kind: 'value',
    value: 'a\\b中文',
  },
  'text textcat 12/14': {
    kind: 'value',
    value: 'a\\b中文',
  },
  'text literal 13': {
    kind: 'value',
    value: 'a\nb',
  },
  'text length 13': {
    kind: 'value',
    value: '3',
  },
  'text char_length 13': {
    kind: 'value',
    value: '3',
  },
  'text character_length 13': {
    kind: 'value',
    value: '3',
  },
  'text octet_length 13': {
    kind: 'value',
    value: '3',
  },
  'text comparison = 13/0': {
    kind: 'null',
  },
  'text comparison <> 13/0': {
    kind: 'null',
  },
  'text comparison < 13/0': {
    kind: 'null',
  },
  'text comparison <= 13/0': {
    kind: 'null',
  },
  'text comparison > 13/0': {
    kind: 'null',
  },
  'text comparison >= 13/0': {
    kind: 'null',
  },
  'text comparison || 13/0': {
    kind: 'null',
  },
  'text textcat 13/0': {
    kind: 'null',
  },
  'text comparison = 13/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 13/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 13/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 13/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 13/1': {
    kind: 'value',
    value: 'a\nb',
  },
  'text textcat 13/1': {
    kind: 'value',
    value: 'a\nb',
  },
  'text comparison = 13/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 13/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 13/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 13/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 13/2': {
    kind: 'value',
    value: 'a\nba',
  },
  'text textcat 13/2': {
    kind: 'value',
    value: 'a\nba',
  },
  'text comparison = 13/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/3': {
    kind: 'value',
    value: 'a\nbaa',
  },
  'text textcat 13/3': {
    kind: 'value',
    value: 'a\nbaa',
  },
  'text comparison = 13/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/4': {
    kind: 'value',
    value: 'a\nbb',
  },
  'text textcat 13/4': {
    kind: 'value',
    value: 'a\nbb',
  },
  'text comparison = 13/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 13/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 13/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 13/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 13/5': {
    kind: 'value',
    value: 'a\nbA',
  },
  'text textcat 13/5': {
    kind: 'value',
    value: 'a\nbA',
  },
  'text comparison = 13/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/6': {
    kind: 'value',
    value: 'a\nbé',
  },
  'text textcat 13/6': {
    kind: 'value',
    value: 'a\nbé',
  },
  'text comparison = 13/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/7': {
    kind: 'value',
    value: 'a\nbé',
  },
  'text textcat 13/7': {
    kind: 'value',
    value: 'a\nbé',
  },
  'text comparison = 13/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/8': {
    kind: 'value',
    value: 'a\nb😀',
  },
  'text textcat 13/8': {
    kind: 'value',
    value: 'a\nb😀',
  },
  'text comparison = 13/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/9': {
    kind: 'value',
    value: 'a\nb',
  },
  'text textcat 13/9': {
    kind: 'value',
    value: 'a\nb',
  },
  'text comparison = 13/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/10': {
    kind: 'value',
    value: 'a\nb𐀀',
  },
  'text textcat 13/10': {
    kind: 'value',
    value: 'a\nb𐀀',
  },
  'text comparison = 13/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 13/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 13/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 13/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 13/11': {
    kind: 'value',
    value: "a\nbO'Brien",
  },
  'text textcat 13/11': {
    kind: 'value',
    value: "a\nbO'Brien",
  },
  'text comparison = 13/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/12': {
    kind: 'value',
    value: 'a\nba\\b',
  },
  'text textcat 13/12': {
    kind: 'value',
    value: 'a\nba\\b',
  },
  'text comparison = 13/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 13/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 13/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 13/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 13/13': {
    kind: 'value',
    value: 'a\nba\nb',
  },
  'text textcat 13/13': {
    kind: 'value',
    value: 'a\nba\nb',
  },
  'text comparison = 13/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 13/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 13/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 13/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 13/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 13/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 13/14': {
    kind: 'value',
    value: 'a\nb中文',
  },
  'text textcat 13/14': {
    kind: 'value',
    value: 'a\nb中文',
  },
  'text literal 14': {
    kind: 'value',
    value: '中文',
  },
  'text length 14': {
    kind: 'value',
    value: '2',
  },
  'text char_length 14': {
    kind: 'value',
    value: '2',
  },
  'text character_length 14': {
    kind: 'value',
    value: '2',
  },
  'text octet_length 14': {
    kind: 'value',
    value: '6',
  },
  'text comparison = 14/0': {
    kind: 'null',
  },
  'text comparison <> 14/0': {
    kind: 'null',
  },
  'text comparison < 14/0': {
    kind: 'null',
  },
  'text comparison <= 14/0': {
    kind: 'null',
  },
  'text comparison > 14/0': {
    kind: 'null',
  },
  'text comparison >= 14/0': {
    kind: 'null',
  },
  'text comparison || 14/0': {
    kind: 'null',
  },
  'text textcat 14/0': {
    kind: 'null',
  },
  'text comparison = 14/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/1': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/1': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/1': {
    kind: 'value',
    value: '中文',
  },
  'text textcat 14/1': {
    kind: 'value',
    value: '中文',
  },
  'text comparison = 14/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/2': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/2': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/2': {
    kind: 'value',
    value: '中文a',
  },
  'text textcat 14/2': {
    kind: 'value',
    value: '中文a',
  },
  'text comparison = 14/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/3': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/3': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/3': {
    kind: 'value',
    value: '中文aa',
  },
  'text textcat 14/3': {
    kind: 'value',
    value: '中文aa',
  },
  'text comparison = 14/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/4': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/4': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/4': {
    kind: 'value',
    value: '中文b',
  },
  'text textcat 14/4': {
    kind: 'value',
    value: '中文b',
  },
  'text comparison = 14/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/5': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/5': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/5': {
    kind: 'value',
    value: '中文A',
  },
  'text textcat 14/5': {
    kind: 'value',
    value: '中文A',
  },
  'text comparison = 14/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/6': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/6': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/6': {
    kind: 'value',
    value: '中文é',
  },
  'text textcat 14/6': {
    kind: 'value',
    value: '中文é',
  },
  'text comparison = 14/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/7': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/7': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/7': {
    kind: 'value',
    value: '中文é',
  },
  'text textcat 14/7': {
    kind: 'value',
    value: '中文é',
  },
  'text comparison = 14/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 14/8': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 14/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 14/8': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 14/8': {
    kind: 'value',
    value: '中文😀',
  },
  'text textcat 14/8': {
    kind: 'value',
    value: '中文😀',
  },
  'text comparison = 14/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 14/9': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 14/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 14/9': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 14/9': {
    kind: 'value',
    value: '中文',
  },
  'text textcat 14/9': {
    kind: 'value',
    value: '中文',
  },
  'text comparison = 14/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <= 14/10': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 14/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 14/10': {
    kind: 'value',
    value: 'false',
  },
  'text comparison || 14/10': {
    kind: 'value',
    value: '中文𐀀',
  },
  'text textcat 14/10': {
    kind: 'value',
    value: '中文𐀀',
  },
  'text comparison = 14/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/11': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/11': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/11': {
    kind: 'value',
    value: "中文O'Brien",
  },
  'text textcat 14/11': {
    kind: 'value',
    value: "中文O'Brien",
  },
  'text comparison = 14/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/12': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/12': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/12': {
    kind: 'value',
    value: '中文a\\b',
  },
  'text textcat 14/12': {
    kind: 'value',
    value: '中文a\\b',
  },
  'text comparison = 14/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <> 14/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison < 14/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/13': {
    kind: 'value',
    value: 'false',
  },
  'text comparison > 14/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison >= 14/13': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/13': {
    kind: 'value',
    value: '中文a\nb',
  },
  'text textcat 14/13': {
    kind: 'value',
    value: '中文a\nb',
  },
  'text comparison = 14/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison <> 14/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison < 14/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison <= 14/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison > 14/14': {
    kind: 'value',
    value: 'false',
  },
  'text comparison >= 14/14': {
    kind: 'value',
    value: 'true',
  },
  'text comparison || 14/14': {
    kind: 'value',
    value: '中文中文',
  },
  'text textcat 14/14': {
    kind: 'value',
    value: '中文中文',
  },
  'null-test pg_catalog.int2 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int2 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int2 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int2 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int2 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int2 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.int2 false': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int2 true': {
    kind: 'value',
    value: '0',
  },
  'case pg_catalog.int2 null': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int2 first match': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int2 0': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int2 1': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int2 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.int2 3': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int2 4': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int2 5': {
    kind: 'null',
  },
  'null-test pg_catalog.int4 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int4 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int4 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int4 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int4 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int4 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.int4 false': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int4 true': {
    kind: 'value',
    value: '0',
  },
  'case pg_catalog.int4 null': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int4 first match': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int4 0': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int4 1': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int4 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.int4 3': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int4 4': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int4 5': {
    kind: 'null',
  },
  'null-test pg_catalog.int8 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int8 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int8 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int8 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.int8 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.int8 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.int8 false': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int8 true': {
    kind: 'value',
    value: '0',
  },
  'case pg_catalog.int8 null': {
    kind: 'value',
    value: '7',
  },
  'case pg_catalog.int8 first match': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int8 0': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int8 1': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int8 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.int8 3': {
    kind: 'value',
    value: '0',
  },
  'coalesce pg_catalog.int8 4': {
    kind: 'value',
    value: '7',
  },
  'coalesce pg_catalog.int8 5': {
    kind: 'null',
  },
  'null-test pg_catalog.float4 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.float4 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float4 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float4 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.float4 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float4 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.float4 false': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40e00000',
  },
  'case pg_catalog.float4 true': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'case pg_catalog.float4 null': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40e00000',
  },
  'case pg_catalog.float4 first match': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'coalesce pg_catalog.float4 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'coalesce pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40e00000',
  },
  'coalesce pg_catalog.float4 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.float4 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'coalesce pg_catalog.float4 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40e00000',
  },
  'coalesce pg_catalog.float4 5': {
    kind: 'null',
  },
  'null-test pg_catalog.float8 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.float8 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float8 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float8 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.float8 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.float8 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.float8 false': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'case pg_catalog.float8 true': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'case pg_catalog.float8 null': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'case pg_catalog.float8 first match': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'coalesce pg_catalog.float8 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'coalesce pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'coalesce pg_catalog.float8 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.float8 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'coalesce pg_catalog.float8 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'coalesce pg_catalog.float8 5': {
    kind: 'null',
  },
  'null-test pg_catalog."numeric" 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog."numeric" 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog."numeric" 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog."numeric" 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog."numeric" 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog."numeric" 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog."numeric" false': {
    kind: 'value',
    value: '1.2300',
  },
  'case pg_catalog."numeric" true': {
    kind: 'value',
    value: '0.000',
  },
  'case pg_catalog."numeric" null': {
    kind: 'value',
    value: '1.2300',
  },
  'case pg_catalog."numeric" first match': {
    kind: 'value',
    value: '0.000',
  },
  'coalesce pg_catalog."numeric" 0': {
    kind: 'value',
    value: '0.000',
  },
  'coalesce pg_catalog."numeric" 1': {
    kind: 'value',
    value: '1.2300',
  },
  'coalesce pg_catalog."numeric" 2': {
    kind: 'null',
  },
  'coalesce pg_catalog."numeric" 3': {
    kind: 'value',
    value: '0.000',
  },
  'coalesce pg_catalog."numeric" 4': {
    kind: 'value',
    value: '1.2300',
  },
  'coalesce pg_catalog."numeric" 5': {
    kind: 'null',
  },
  'null-test pg_catalog.bool 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.bool 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.bool 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.bool 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.bool 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.bool 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.bool false': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.bool true': {
    kind: 'value',
    value: 'false',
  },
  'case pg_catalog.bool null': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.bool first match': {
    kind: 'value',
    value: 'false',
  },
  'coalesce pg_catalog.bool 0': {
    kind: 'value',
    value: 'false',
  },
  'coalesce pg_catalog.bool 1': {
    kind: 'value',
    value: 'true',
  },
  'coalesce pg_catalog.bool 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.bool 3': {
    kind: 'value',
    value: 'false',
  },
  'coalesce pg_catalog.bool 4': {
    kind: 'value',
    value: 'true',
  },
  'coalesce pg_catalog.bool 5': {
    kind: 'null',
  },
  'null-test pg_catalog.text 0/false': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.text 0/true': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.text 1/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.text 1/true': {
    kind: 'value',
    value: 'true',
  },
  'null-test pg_catalog.text 2/false': {
    kind: 'value',
    value: 'false',
  },
  'null-test pg_catalog.text 2/true': {
    kind: 'value',
    value: 'true',
  },
  'case pg_catalog.text false': {
    kind: 'value',
    value: '😀',
  },
  'case pg_catalog.text true': {
    kind: 'value',
    value: '',
  },
  'case pg_catalog.text null': {
    kind: 'value',
    value: '😀',
  },
  'case pg_catalog.text first match': {
    kind: 'value',
    value: '',
  },
  'coalesce pg_catalog.text 0': {
    kind: 'value',
    value: '',
  },
  'coalesce pg_catalog.text 1': {
    kind: 'value',
    value: '😀',
  },
  'coalesce pg_catalog.text 2': {
    kind: 'null',
  },
  'coalesce pg_catalog.text 3': {
    kind: 'value',
    value: '',
  },
  'coalesce pg_catalog.text 4': {
    kind: 'value',
    value: '😀',
  },
  'coalesce pg_catalog.text 5': {
    kind: 'null',
  },
  'case skips failing fallback': {
    kind: 'value',
    value: '7',
  },
  'case skips failing branch': {
    kind: 'value',
    value: '7',
  },
  'case selected branch errors': {
    kind: 'error',
    code: '22012',
  },
  'case condition errors': {
    kind: 'error',
    code: '22012',
  },
  'case skips later condition error': {
    kind: 'value',
    value: '7',
  },
  'coalesce skips error after zero': {
    kind: 'value',
    value: '0',
  },
  'coalesce selected argument errors': {
    kind: 'error',
    code: '22012',
  },
  'boolean and error after false': {
    kind: 'value',
    value: 'false',
  },
  'boolean and error after true': {
    kind: 'error',
    code: '22012',
  },
  'boolean and error after null': {
    kind: 'error',
    code: '22012',
  },
  'boolean or error after false': {
    kind: 'error',
    code: '22012',
  },
  'boolean or error after true': {
    kind: 'value',
    value: 'true',
  },
  'boolean or error after null': {
    kind: 'error',
    code: '22012',
  },
  'null-test propagates error false': {
    kind: 'error',
    code: '22012',
  },
  'null-test propagates error true': {
    kind: 'error',
    code: '22012',
  },
}
