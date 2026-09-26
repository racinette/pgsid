import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const [generatedPath, ...fixturePaths] = process.argv.slice(2)
if (!generatedPath || fixturePaths.length === 0) {
  throw new Error('usage: fixture_check.ts GENERATED_TS FIXTURES_JSON...')
}
const generated = await import(pathToFileURL(generatedPath).href)
const coverage = {
  find: 0,
  count: 0,
  countSupported: 0,
  literal: 0,
  insensitive: 0,
  advanced: 0,
  grouped: 0,
  groupChoice: 0,
  optionalGroup: 0,
  lookbehind: 0,
  lookahead: 0,
  backref: 0,
  singleCapture: 0,
  inline: 0,
  middleLookahead: 0,
  boundedGroup: 0,
  expandedAdvanced: 0,
  extended: 0,
  extendedGroup: 0,
  extendedEscape: 0,
  basic: 0,
  basicPunctuation: 0,
  basicEscape: 0,
  basicBound: 0,
  basicBackref: 0,
  invalidGrouping: 0,
  invalidRepeat: 0,
  invalidBound: 0,
  invalidPosixClass: 0,
  unsupportedAdvanced: 0,
  otherOptions: 0,
  dot: 0,
  mixed: 0,
  anchored: 0,
  escaped: 0,
  classes: 0,
  negatedClasses: 0,
  rangeClasses: 0,
  edgePunctuation: 0,
  absoluteAnchors: 0,
  position: 0,
  newline: new Set<string>(),
}

for (const fixturePath of fixturePaths) {
  const document = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(document.schemaVersion, 1)
  assert.equal(document.oracle.database, 'PostgreSQL via PGlite')
  let checked = 0
  for (const [index, fixture] of document.fixtures.entries()) {
    if (fixture.operation && fixture.operation !== 'find') {
      coverage.count++
      const { pattern, subject, options } = fixture.input
      const simple = options.expanded
        ? generated.supportsExpandedAdvanced(pattern)
        : generated.supportsSimpleAdvanced(pattern)
      const choice = generated.supportsGroupChoice(pattern, options.expanded)
      const lookbehind = generated.supportsFixedLookbehind(pattern, options.expanded)
      const lookahead = generated.supportsLeadingLookahead(pattern, options.expanded)
      const backref = generated.supportsFixedBackref(pattern, options.expanded)
      if (
        fixture.operation === 'count' &&
        options.syntax === 'advanced' &&
        (simple || choice || lookbehind || lookahead || backref)
      ) {
        const newline = options.newline
        const args = [
          pattern,
          subject,
          (fixture.input.start ?? 1) - 1,
          options.caseSensitive,
          newline === 'ordinary' || newline === 'anchors',
          newline === 'sensitive' || newline === 'anchors',
        ] as const
        assert.deepEqual(
          backref
            ? generated.countFixedBackref(...args, options.expanded)
            : lookahead
              ? generated.countLeadingLookahead(...args, options.expanded)
              : lookbehind
                ? generated.countFixedLookbehind(...args, options.expanded)
                : choice
                  ? generated.countGroupChoice(...args, options.expanded)
                  : (options.expanded
                      ? generated.countExpandedAdvanced
                      : generated.countSimpleAdvanced)(...args),
          fixture.expected,
          `${fixturePath} count fixture ${index}: ${JSON.stringify(fixture.input)}`,
        )
        coverage.countSupported++
      }
      continue
    }
    coverage.find++
    const { pattern, subject, options } = fixture.input
    const from = (fixture.input.start ?? 1) - 1
    if (
      options.syntax !== 'literal' &&
      generated.definitelyInvalidGrouping(pattern, options.syntax[0], options.expanded)
    ) {
      assert.deepEqual(
        fixture.expected,
        { kind: 'InvalidPattern', sqlstate: '2201B' },
        `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
      )
      coverage.invalidGrouping++
      checked++
      continue
    }
    if (
      options.syntax !== 'literal' &&
      generated.definitelyInvalidSimpleRepeat(pattern, options.syntax[0], options.expanded)
    ) {
      assert.deepEqual(
        fixture.expected,
        { kind: 'InvalidPattern', sqlstate: '2201B' },
        `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
      )
      coverage.invalidRepeat++
      checked++
      continue
    }
    if (
      options.syntax !== 'literal' &&
      generated.definitelyInvalidBound(pattern, options.syntax[0], options.expanded)
    ) {
      assert.deepEqual(
        fixture.expected,
        { kind: 'InvalidPattern', sqlstate: '2201B' },
        `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
      )
      coverage.invalidBound++
      checked++
      continue
    }
    if (
      options.syntax !== 'literal' &&
      generated.definitelyInvalidPosixClass(pattern, options.syntax[0], options.expanded)
    ) {
      assert.deepEqual(
        fixture.expected,
        { kind: 'InvalidPattern', sqlstate: '2201B' },
        `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
      )
      coverage.invalidPosixClass++
      checked++
      continue
    }
    let actual
    if (options.syntax === 'literal' && !options.expanded && options.newline === 'ordinary') {
      actual = generated.findLiteral(pattern, subject, from, options.caseSensitive)
      coverage.literal++
      if (!options.caseSensitive) coverage.insensitive++
    } else if (
      options.syntax === 'advanced' &&
      (options.expanded
        ? generated.supportsExpandedAdvanced(pattern)
        : generated.supportsSimpleAdvanced(pattern))
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = (options.expanded ? generated.findExpandedAdvanced : generated.findSimpleAdvanced)(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
      )
      coverage.advanced++
      if (options.expanded) coverage.expandedAdvanced++
      if (pattern === '.') {
        assert.deepEqual(
          generated.findAnyCharacter(subject, from, crossesNewline),
          fixture.expected,
        )
        coverage.dot++
      }
      if (pattern.includes('.') && Array.from(pattern).length > 1) coverage.mixed++
      if (pattern.includes('^') || pattern.includes('$')) coverage.anchored++
      if (pattern.includes('\\')) coverage.escaped++
      if (pattern.includes('[')) coverage.classes++
      if (pattern.includes('[^')) coverage.negatedClasses++
      if (pattern.includes('[') && pattern.includes('-')) coverage.rangeClasses++
      if (
        pattern.includes('[-') ||
        pattern.includes('-]') ||
        pattern.includes('[]') ||
        pattern.includes('[^]')
      )
        coverage.edgePunctuation++
      if (pattern.includes('\\A') || pattern.includes('\\Z')) coverage.absoluteAnchors++
      coverage.newline.add(options.newline)
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsFlatGroups(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findFlatGroups(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.grouped++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsGroupChoice(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findGroupChoice(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.groupChoice++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsOptionalGroup(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findOptionalGroup(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.optionalGroup++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsFixedLookbehind(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findFixedLookbehind(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.lookbehind++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsLeadingLookahead(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findLeadingLookahead(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.lookahead++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsFixedBackref(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findFixedBackref(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.backref++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsSingleCaptureBackref(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findSingleCaptureBackref(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.singleCapture++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsInlineAdvanced(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findInlineAdvanced(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.inline++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsMiddleLookahead(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findMiddleLookahead(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.middleLookahead++
    } else if (
      options.syntax === 'advanced' &&
      generated.supportsBoundedGroup(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBoundedGroup(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.boundedGroup++
    } else if (
      options.syntax === 'extended' &&
      generated.supportsExtendedCompatible(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findExtendedCompatible(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.extended++
    } else if (
      options.syntax === 'extended' &&
      generated.supportsExtendedGroup(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findExtendedGroup(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.extendedGroup++
    } else if (
      options.syntax === 'extended' &&
      generated.supportsExtendedLiteralEscape(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findExtendedLiteralEscape(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.extendedEscape++
    } else if (
      options.syntax === 'basic' &&
      generated.supportsBasicCompatible(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBasicCompatible(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.basic++
    } else if (
      options.syntax === 'basic' &&
      generated.supportsBasicLiteralPunctuation(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBasicLiteralPunctuation(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.basicPunctuation++
    } else if (
      options.syntax === 'basic' &&
      generated.supportsBasicLetterEscape(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBasicLetterEscape(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.basicEscape++
    } else if (
      options.syntax === 'basic' &&
      generated.supportsBasicEscapedBound(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBasicEscapedBound(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.basicBound++
    } else if (
      options.syntax === 'basic' &&
      generated.supportsBasicFixedBackref(pattern, options.expanded)
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = generated.findBasicFixedBackref(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
        options.expanded,
      )
      coverage.basicBackref++
    } else {
      if (options.syntax === 'advanced') coverage.unsupportedAdvanced++
      else coverage.otherOptions++
      continue
    }
    if (from > 0) coverage.position++
    assert.deepEqual(
      actual,
      fixture.expected,
      `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
    checked++
  }
  if (basename(fixturePath) === 'targeted-postgres-fixtures.json') {
    assert.equal(checked, document.fixtures.length)
  }
}

assert.ok(coverage.literal >= 40)
assert.ok(coverage.insensitive >= 7)
assert.ok(coverage.advanced >= 100)
assert.ok(coverage.grouped >= 20)
assert.ok(coverage.groupChoice >= 20)
assert.ok(coverage.optionalGroup >= 50)
assert.ok(coverage.lookbehind >= 20)
assert.ok(coverage.lookahead >= 20)
assert.ok(coverage.backref >= 20)
assert.ok(coverage.singleCapture >= 50)
assert.ok(coverage.inline >= 20)
assert.ok(coverage.middleLookahead >= 20)
assert.ok(coverage.boundedGroup >= 20)
assert.ok(coverage.expandedAdvanced >= 200)
assert.ok(coverage.extended >= 50)
assert.ok(coverage.extendedGroup >= 20)
assert.ok(coverage.extendedEscape >= 20)
assert.ok(coverage.basic >= 50)
assert.ok(coverage.basicPunctuation >= 20)
assert.ok(coverage.basicEscape >= 20)
assert.ok(coverage.basicBound >= 20)
assert.ok(coverage.basicBackref >= 20)
assert.ok(coverage.invalidGrouping >= 40)
assert.ok(coverage.invalidRepeat >= 20)
assert.ok(coverage.invalidBound >= 20)
assert.ok(coverage.invalidPosixClass >= 20)
assert.ok(coverage.dot >= 20)
assert.ok(coverage.mixed >= 50)
assert.ok(coverage.anchored >= 20)
assert.ok(coverage.escaped >= 40)
assert.ok(coverage.classes >= 50)
assert.ok(coverage.negatedClasses >= 40)
assert.ok(coverage.rangeClasses >= 50)
assert.ok(coverage.edgePunctuation >= 80)
assert.ok(coverage.absoluteAnchors >= 50)
assert.ok(coverage.position >= 6)
assert.equal(coverage.countSupported, 180)
assert.deepEqual(coverage.newline, new Set(['ordinary', 'sensitive', 'stop', 'anchors']))
assert.equal(
  coverage.find,
  coverage.literal +
    coverage.advanced +
    coverage.grouped +
    coverage.groupChoice +
    coverage.optionalGroup +
    coverage.lookbehind +
    coverage.lookahead +
    coverage.backref +
    coverage.singleCapture +
    coverage.inline +
    coverage.middleLookahead +
    coverage.boundedGroup +
    coverage.extended +
    coverage.extendedGroup +
    coverage.extendedEscape +
    coverage.basic +
    coverage.basicPunctuation +
    coverage.basicEscape +
    coverage.basicBound +
    coverage.basicBackref +
    coverage.invalidGrouping +
    coverage.invalidRepeat +
    coverage.invalidBound +
    coverage.invalidPosixClass +
    coverage.unsupportedAdvanced +
    coverage.otherOptions,
)
process.stdout.write(
  `TypeScript find fixtures: ${coverage.literal + coverage.advanced + coverage.grouped + coverage.groupChoice + coverage.optionalGroup + coverage.lookbehind + coverage.lookahead + coverage.backref + coverage.singleCapture + coverage.inline + coverage.middleLookahead + coverage.boundedGroup + coverage.extended + coverage.extendedGroup + coverage.extendedEscape + coverage.basic + coverage.basicPunctuation + coverage.basicEscape + coverage.basicBound + coverage.basicBackref + coverage.invalidGrouping + coverage.invalidRepeat + coverage.invalidBound + coverage.invalidPosixClass}/${coverage.find} supported (${coverage.invalidGrouping} invalid grouping, ${coverage.invalidRepeat} invalid repeat, ${coverage.invalidBound} invalid bound, ${coverage.invalidPosixClass} invalid POSIX class, ${coverage.literal} literal, ${coverage.advanced} advanced including ${coverage.expandedAdvanced} expanded, ${coverage.grouped} flat groups, ${coverage.groupChoice} group choices, ${coverage.optionalGroup} optional groups, ${coverage.lookbehind} fixed lookbehind, ${coverage.lookahead} leading lookahead, ${coverage.middleLookahead} middle lookahead, ${coverage.boundedGroup} bounded groups, ${coverage.backref} fixed backrefs, ${coverage.singleCapture} single captures, ${coverage.inline} inline flags, ${coverage.extended} extended, ${coverage.extendedGroup} extended groups, ${coverage.extendedEscape} extended escapes, ${coverage.basic} basic, ${coverage.basicPunctuation} basic punctuation, ${coverage.basicEscape} basic escapes, ${coverage.basicBound} basic bounds, ${coverage.basicBackref} basic backrefs); ${coverage.unsupportedAdvanced} unsupported advanced, ${coverage.otherOptions} other modes. Count fixtures: ${coverage.countSupported}/${coverage.count} supported. Advanced coverage includes ${coverage.anchored} anchored, ${coverage.escaped} escaped, ${coverage.classes} classes, ${coverage.negatedClasses} negated classes, ${coverage.rangeClasses} ranges, ${coverage.edgePunctuation} class edge cases, ${coverage.absoluteAnchors} absolute anchors, and ${coverage.position} positioned.\n`,
)
