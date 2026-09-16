import { describe, expect, it } from 'vitest'
import { go, printGoFile } from '../../src/codegen/go/ast.js'

describe('Go AST bridge', () => {
  it('renders and formats native Go AST declarations synchronously', () => {
    expect(
      printGoFile({
        package: 'db',
        imports: [{ path: 'time' }],
        declarations: [
          go.type(
            'Event',
            go.struct([
              {
                names: ['CreatedAt'],
                type: go.selector(go.ident('time'), 'Time'),
                tag: 'db:"created_at"',
              },
              { names: ['Labels'], type: go.slice(go.ident('string')), tag: 'db:"labels"' },
            ]),
          ),
          go.const('EventReady', go.string('ready'), go.ident('string')),
        ],
      }),
    ).toBe(`package db

import "time"

type Event struct {
\tCreatedAt time.Time \`db:"created_at"\`
\tLabels    []string  \`db:"labels"\`
}

const EventReady string = "ready"
`)
  })

  it('rejects invalid parsed types through the bridge', () => {
    expect(() =>
      printGoFile({
        package: 'db',
        imports: [],
        declarations: [go.type('Broken', go.parsed('string; var injected int'))],
      }),
    ).toThrow('parse expression')
  })
  it('combines parsed generic runtime declarations with generated imports and functions', () => {
    const source = printGoFile({
      package: 'example',
      source:
        'package example\nimport "encoding/json"\ntype Null[T any] struct { V T; Valid bool }',
      imports: [{ path: 'context' }],
      declarations: [
        go.function(
          'Decode',
          [{ names: ['ctx'], type: go.selector(go.ident('context'), 'Context') }],
          [{ type: go.ident('error') }],
          [
            go.return(
              go.call(go.selector(go.ident('json'), 'Unmarshal'), [
                go.ident('nil'),
                go.ident('nil'),
              ]),
            ),
          ],
        ),
      ],
    })
    expect(source).toContain('type Null[T any] struct')
    expect(source.indexOf('"context"')).toBeLessThan(source.indexOf('type Null'))
  })
})
