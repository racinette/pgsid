const MAX_SHARED_INDEX = 2147483647;
function checkedIndex(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SHARED_INDEX)
        throw new RangeError('index outside shared numeric range');
    return value;
}
function checkedI32(value: number): number {
    if (!Number.isInteger(value) || value < -2147483648 || value > MAX_SHARED_INDEX)
        throw new RangeError('signed integer outside shared numeric range');
    return value;
}
function checkedBool(value: boolean): boolean {
    if (typeof value !== 'boolean')
        throw new TypeError('expected a boolean');
    return value;
}
function checkedAdd(left: number, right: number): number {
    checkedIndex(left);
    checkedIndex(right);
    if (right > MAX_SHARED_INDEX - left)
        throw new RangeError('shared numeric overflow');
    return left + right;
}
function checkedSubtract(left: number, right: number): number {
    checkedIndex(left);
    checkedIndex(right);
    if (right > left)
        throw new RangeError('shared numeric underflow');
    return left - right;
}
function checkedSignedNegate(value: number): number {
    checkedI32(value);
    if (value === -2147483648)
        throw new RangeError('signed integer overflow');
    return -value;
}
function checkedSignedAdd(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    const result = left + right;
    if (result < -2147483648 || result > MAX_SHARED_INDEX)
        throw new RangeError('signed integer overflow');
    return result;
}
function checkedSignedSubtract(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    const result = left - right;
    if (result < -2147483648 || result > MAX_SHARED_INDEX)
        throw new RangeError('signed integer overflow');
    return result;
}
function checkedChar(value: string): string {
    const points = Array.from(value);
    if (points.length !== 1 || (value.codePointAt(0)! >= 0xd800 && value.codePointAt(0)! <= 0xdfff))
        throw new RangeError('invalid Unicode scalar');
    return value;
}
function asciiLowercase(value: string): string {
    const codepoint = checkedChar(value).codePointAt(0)!;
    return codepoint >= 65 && codepoint <= 90 ? String.fromCodePoint(codepoint + 32) : value;
}
function checkedString(value: string): string {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('string outside shared numeric range');
    for (const character of value)
        checkedChar(character);
    return value;
}
function checkedChars(value: string[]): string[] {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('vector outside shared numeric range');
    return Array.from(value, checkedChar);
}
function checkedIndices(value: number[]): number[] {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('vector outside shared numeric range');
    return Array.from(value, checkedIndex);
}
function checkedStructs<T>(value: T[], copyValue: (entry: T) => T): T[] {
    checkedIndex(value.length);
    return Array.from(value, copyValue);
}
function checkedIndexIn<T>(values: T[], index: number): number {
    checkedIndex(index);
    if (index >= values.length)
        throw new RangeError('index out of bounds');
    return index;
}
function indexNumber(values: number[], index: number): number {
    return checkedIndex(values[checkedIndexIn(values, index)]!);
}
function pushIndex(values: number[], value: number): void {
    checkedAdd(values.length, 1);
    values.push(checkedIndex(value));
}
function pushChar(values: string[], value: string): void {
    checkedAdd(values.length, 1);
    values.push(checkedChar(value));
}
function indexChar(values: string[], index: number): string {
    if (!Number.isSafeInteger(index) || index < 0 || index >= values.length)
        throw new RangeError('index out of bounds');
    return values[index]!;
}
function indexStruct<T>(values: T[], index: number, copyValue: (entry: T) => T): T {
    return copyValue(values[checkedIndexIn(values, index)]!);
}
function pushStruct<T>(values: T[], value: T, copyValue: (entry: T) => T): void {
    checkedAdd(values.length, 1);
    values.push(copyValue(value));
}
const opaqueValues = new WeakSet<object>();
function freezeDeep(value: object): void {
    for (const child of Object.values(value)) {
        if (typeof child === 'object' && child !== null)
            freezeDeep(child);
    }
    Object.freeze(value);
}
function sealOpaque<T extends object>(value: T): T {
    freezeDeep(value);
    opaqueValues.add(value);
    return value;
}
function checkedOpaque<T extends object>(value: T): T {
    if (typeof value !== 'object' || value === null || !opaqueValues.has(value))
        throw new TypeError('invalid borrowed handle');
    return value;
}
const maxCaptureWork = 2000000;
const vmLiteral = 1;
const vmAny = 2;
const vmWord = 3;
const vmOpen = 4;
const vmClose = 5;
const vmBackref = 6;
const vmSplit = 7;
const vmBegin = 8;
const vmEnd = 9;
const vmAccept = 10;
const vmJump = 11;
const vmClass = 12;
const vmNumeric = 13;
const vmWordEnd = 14;
const vmWordBegin = 26;
const vmAbsoluteBegin = 27;
const vmAbsoluteEnd = 28;
const vmBoundary = 29;
const vmNotBoundary = 30;
const captureClassRange = 15;
const nodeSequence = 16;
const nodeAlternative = 17;
const nodeGroup = 18;
const nodeRepeat = 19;
const nodeEmpty = 20;
const vmClear = 21;
const maxCaptureInstructions = 100000;
const nodeLookahead = 22;
const nodeNotLookahead = 23;
const nodeLookbehind = 24;
const nodeNotLookbehind = 25;
const dissectEnter = 0;
const dissectLeft = 1;
const dissectRight = 2;
const dissectGroup = 3;
const dissectAlternative = 4;
const dissectLastAlternative = 5;
const dissectPrefix = 6;
const dissectLastRepeat = 7;
const dissectIteration = 8;
const dissectIterationResult = 9;
const dissectIterationAdvance = 10;
const dissectAssertion = 11;
export type Syntax = {
    kind: "Advanced";
} | {
    kind: "Basic";
} | {
    kind: "Extended";
} | {
    kind: "Literal";
};
function copySyntax(value: Syntax): Syntax {
    switch (value.kind) {
        case "Advanced": return { kind: "Advanced" };
        case "Basic": return { kind: "Basic" };
        case "Extended": return { kind: "Extended" };
        case "Literal": return { kind: "Literal" };
    }
}
function equalSyntax(left: Syntax, right: Syntax): boolean {
    if (left.kind !== right.kind)
        return false;
    return true;
}
export type NewlineMode = {
    kind: "Ordinary";
} | {
    kind: "Sensitive";
} | {
    kind: "Stop";
} | {
    kind: "Anchors";
};
function copyNewlineMode(value: NewlineMode): NewlineMode {
    switch (value.kind) {
        case "Ordinary": return { kind: "Ordinary" };
        case "Sensitive": return { kind: "Sensitive" };
        case "Stop": return { kind: "Stop" };
        case "Anchors": return { kind: "Anchors" };
    }
}
function equalNewlineMode(left: NewlineMode, right: NewlineMode): boolean {
    if (left.kind !== right.kind)
        return false;
    return true;
}
export interface RegexOptions {
    syntax: Syntax;
    caseSensitive: boolean;
    expanded: boolean;
    newline: NewlineMode;
}
function copyRegexOptions(value: RegexOptions): RegexOptions {
    return { syntax: copySyntax(value.syntax), caseSensitive: checkedBool(value.caseSensitive), expanded: checkedBool(value.expanded), newline: copyNewlineMode(value.newline) };
}
export function find(pattern: string, subject: string, from: number, options: RegexOptions): MatchOutcome {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    return captureMatchOutcome(executePattern(pattern, subject, from, options, false, false, false));
}
export function count(pattern: string, subject: string, from: number, options: RegexOptions): CountOutcome {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    const result: CaptureRunResult = executePattern(pattern, subject, from, options, true, false, false);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Count", value: result.count };
}
export type MatchListOutcome = {
    kind: "Matches";
    value: MatchSpan[];
} | {
    kind: "InvalidPattern";
} | {
    kind: "Uncertain";
};
function copyMatchListOutcome(value: MatchListOutcome): MatchListOutcome {
    switch (value.kind) {
        case "Matches": return { kind: "Matches", value: checkedStructs(value.value, copyMatchSpan) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
export function findAll(pattern: string, subject: string, from: number, options: RegexOptions): MatchListOutcome {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    const result: CaptureRunResult = executePattern(pattern, subject, from, options, true, false, true);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Matches", value: result.matches };
}
export type CompileOutcome = {
    kind: "Compiled";
    value: CompiledRegex;
} | {
    kind: "InvalidPattern";
} | {
    kind: "Uncertain";
};
function copyCompileOutcome(value: CompileOutcome): CompileOutcome {
    switch (value.kind) {
        case "Compiled": return { kind: "Compiled", value: copyCompiledRegex(value.value) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
export function compile(pattern: string, options: RegexOptions): CompileOutcome {
    pattern = checkedString(pattern);
    options = copyRegexOptions(options);
    if (equalSyntax(options.syntax, { kind: "Literal" }) && (options.expanded || !(equalNewlineMode(options.newline, { kind: "Ordinary" })))) {
        return { kind: "InvalidPattern" };
    }
    const program: CompiledRegex = compilePatternSource(pattern, options, true);
    if (program.limited) {
        return { kind: "Uncertain" };
    }
    if (program.valid === false) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Compiled", value: sealOpaque(program) };
}
export function findCompiled(program: CompiledRegex, subject: string, from: number): MatchOutcome {
    program = checkedOpaque(program);
    subject = checkedString(subject);
    from = checkedIndex(from);
    return captureMatchOutcome(executeCompiledPattern(program, subject, from, false, false, false));
}
export function countCompiled(program: CompiledRegex, subject: string, from: number): CountOutcome {
    program = checkedOpaque(program);
    subject = checkedString(subject);
    from = checkedIndex(from);
    const result: CaptureRunResult = executeCompiledPattern(program, subject, from, true, false, false);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Count", value: result.count };
}
export function findAllCompiled(program: CompiledRegex, subject: string, from: number): MatchListOutcome {
    program = checkedOpaque(program);
    subject = checkedString(subject);
    from = checkedIndex(from);
    const result: CaptureRunResult = executeCompiledPattern(program, subject, from, true, false, true);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Matches", value: result.matches };
}
export function capturesCompiled(program: CompiledRegex, subject: string, from: number): CaptureOutcome {
    program = checkedOpaque(program);
    subject = checkedString(subject);
    from = checkedIndex(from);
    const result: CaptureRunResult = executeCompiledPattern(program, subject, from, false, true, false);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    if (result.kind === 1) {
        return { kind: "NoMatch" };
    }
    return { kind: "Found", value: result.groups };
}
export interface CaptureBatch {
    groupsPerMatch: number;
    groups: CaptureSpan[];
}
function copyCaptureBatch(value: CaptureBatch): CaptureBatch {
    return { groupsPerMatch: checkedIndex(value.groupsPerMatch), groups: checkedStructs(value.groups, copyCaptureSpan) };
}
export type CaptureListOutcome = {
    kind: "Matches";
    value: CaptureBatch;
} | {
    kind: "InvalidPattern";
} | {
    kind: "Uncertain";
};
function copyCaptureListOutcome(value: CaptureListOutcome): CaptureListOutcome {
    switch (value.kind) {
        case "Matches": return { kind: "Matches", value: copyCaptureBatch(value.value) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
export function capturesAllCompiled(program: CompiledRegex, subject: string, from: number): CaptureListOutcome {
    program = checkedOpaque(program);
    subject = checkedString(subject);
    from = checkedIndex(from);
    return captureListOutcome(executeCompiledPattern(program, subject, from, true, true, true));
}
export interface CaptureSpan {
    matched: boolean;
    start: number;
    end: number;
}
function copyCaptureSpan(value: CaptureSpan): CaptureSpan {
    return { matched: checkedBool(value.matched), start: checkedIndex(value.start), end: checkedIndex(value.end) };
}
export type CaptureOutcome = {
    kind: "Found";
    value: CaptureSpan[];
} | {
    kind: "InvalidPattern";
} | {
    kind: "NoMatch";
} | {
    kind: "Uncertain";
};
function copyCaptureOutcome(value: CaptureOutcome): CaptureOutcome {
    switch (value.kind) {
        case "Found": return { kind: "Found", value: checkedStructs(value.value, copyCaptureSpan) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "NoMatch": return { kind: "NoMatch" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
export function captures(pattern: string, subject: string, from: number, options: RegexOptions): CaptureOutcome {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    const result: CaptureRunResult = executePattern(pattern, subject, from, options, false, true, false);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    if (result.kind === 1) {
        return { kind: "NoMatch" };
    }
    return { kind: "Found", value: result.groups };
}
export function capturesAll(pattern: string, subject: string, from: number, options: RegexOptions): CaptureListOutcome {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    return captureListOutcome(executePattern(pattern, subject, from, options, true, true, true));
}
function captureListOutcome(result: CaptureRunResult): CaptureListOutcome {
    result = copyCaptureRunResult(result);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    return { kind: "Matches", value: { groupsPerMatch: result.groupWidth, groups: result.groups } };
}
interface CaptureRunResult {
    kind: number;
    start: number;
    end: number;
    count: number;
    groups: CaptureSpan[];
    matches: MatchSpan[];
    groupWidth: number;
    work: number;
}
function copyCaptureRunResult(value: CaptureRunResult): CaptureRunResult {
    return { kind: checkedIndex(value.kind), start: checkedIndex(value.start), end: checkedIndex(value.end), count: checkedIndex(value.count), groups: checkedStructs(value.groups, copyCaptureSpan), matches: checkedStructs(value.matches, copyMatchSpan), groupWidth: checkedIndex(value.groupWidth), work: checkedIndex(value.work) };
}
function makeCaptureRunResult(kind: number, start: number, end: number, count: number): CaptureRunResult {
    kind = checkedIndex(kind);
    start = checkedIndex(start);
    end = checkedIndex(end);
    count = checkedIndex(count);
    const groups: CaptureSpan[] = [];
    const matches: MatchSpan[] = [];
    return { kind: kind, start: start, end: end, count: count, groups: groups, matches: matches, groupWidth: 0, work: 0 };
}
function completeSearchResult(count: number, groups: CaptureSpan[], matches: MatchSpan[], work: number): CaptureRunResult {
    count = checkedIndex(count);
    groups = checkedStructs(groups, copyCaptureSpan);
    matches = checkedStructs(matches, copyMatchSpan);
    work = checkedIndex(work);
    return { kind: 1, start: 0, end: 0, count: count, groups: groups, matches: matches, groupWidth: 0, work: work };
}
function captureTreeResult(kind: number, count: number, work: number): CaptureRunResult {
    kind = checkedIndex(kind);
    count = checkedIndex(count);
    work = checkedIndex(work);
    const groups: CaptureSpan[] = [];
    const matches: MatchSpan[] = [];
    return { kind: kind, start: 0, end: 0, count: count, groups: groups, matches: matches, groupWidth: 0, work: work };
}
function captureMatchOutcome(result: CaptureRunResult): MatchOutcome {
    result = copyCaptureRunResult(result);
    if (result.kind === 2) {
        return { kind: "Uncertain" };
    }
    if (result.kind === 3) {
        return { kind: "InvalidPattern" };
    }
    if (result.kind === 1) {
        return { kind: "NoMatch" };
    }
    return { kind: "Found", value: copyMatchSpan({ start: result.start, end: result.end }) };
}
function executePattern(pattern: string, subject: string, from: number, options: RegexOptions, counting: boolean, capturing: boolean, collecting: boolean): CaptureRunResult {
    pattern = checkedString(pattern);
    subject = checkedString(subject);
    from = checkedIndex(from);
    options = copyRegexOptions(options);
    counting = checkedBool(counting);
    capturing = checkedBool(capturing);
    collecting = checkedBool(collecting);
    if (equalSyntax(options.syntax, { kind: "Literal" }) && (options.expanded || !(equalNewlineMode(options.newline, { kind: "Ordinary" })))) {
        return makeCaptureRunResult(3, 0, 0, 0);
    }
    const program: CompiledRegex = compilePatternSource(pattern, options, capturing);
    if (program.limited) {
        return makeCaptureRunResult(2, 0, 0, 0);
    }
    if (program.valid === false) {
        return makeCaptureRunResult(3, 0, 0, 0);
    }
    return executeCompiledPattern(program, subject, from, counting, capturing, collecting);
}
function executeCompiledPattern(program: CompiledRegex, subject: string, from: number, counting: boolean, capturing: boolean, collecting: boolean): CaptureRunResult {
    subject = checkedString(subject);
    from = checkedIndex(from);
    counting = checkedBool(counting);
    capturing = checkedBool(capturing);
    collecting = checkedBool(collecting);
    if (program.valid === false) {
        return makeCaptureRunResult(3, 0, 0, 0);
    }
    const result: CaptureRunResult = executeCaptureProgram(program, subject, from, program.caseSensitive, program.dotCrossesNewline, program.lineAnchors, counting, capturing, collecting);
    if (capturing && collecting) {
        return { kind: result.kind, start: result.start, end: result.end, count: result.count, groups: result.groups, matches: result.matches, groupWidth: checkedAdd(program.captures, 1), work: result.work };
    }
    return result;
}
function compilePatternSource(pattern: string, options: RegexOptions, capturing: boolean): CompiledRegex {
    pattern = checkedString(pattern);
    options = copyRegexOptions(options);
    capturing = checkedBool(capturing);
    let syntax: string = "a";
    if (equalSyntax(options.syntax, { kind: "Basic" })) {
        syntax = checkedChar("b");
    }
    else if (equalSyntax(options.syntax, { kind: "Extended" })) {
        syntax = checkedChar("e");
    }
    else if (equalSyntax(options.syntax, { kind: "Literal" })) {
        syntax = checkedChar("q");
    }
    const parsed: CaptureSource = capturePatternSource(pattern, syntax, options.expanded);
    return compileCaptureProgramAtoms(parsed.atoms, parsed.tokenEnds, parsed.syntax, parsed.valid, parsed.caseMode, parsed.newlineMode, capturing, options.caseSensitive, equalNewlineMode(options.newline, { kind: "Ordinary" }) || equalNewlineMode(options.newline, { kind: "Anchors" }), equalNewlineMode(options.newline, { kind: "Sensitive" }) || equalNewlineMode(options.newline, { kind: "Anchors" }));
}
export interface MatchSpan {
    start: number;
    end: number;
}
function copyMatchSpan(value: MatchSpan): MatchSpan {
    return { start: checkedIndex(value.start), end: checkedIndex(value.end) };
}
function equalMatchSpan(left: MatchSpan, right: MatchSpan): boolean {
    return left.start === right.start && left.end === right.end;
}
export type MatchOutcome = {
    kind: "Found";
    value: MatchSpan;
} | {
    kind: "InvalidPattern";
} | {
    kind: "NoMatch";
} | {
    kind: "Uncertain";
};
function copyMatchOutcome(value: MatchOutcome): MatchOutcome {
    switch (value.kind) {
        case "Found": return { kind: "Found", value: copyMatchSpan(value.value) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "NoMatch": return { kind: "NoMatch" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
function equalMatchOutcome(left: MatchOutcome, right: MatchOutcome): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Found" && right.kind === "Found")
        return equalMatchSpan(left.value, right.value);
    return true;
}
export type CountOutcome = {
    kind: "Count";
    value: number;
} | {
    kind: "InvalidPattern";
} | {
    kind: "Uncertain";
};
function copyCountOutcome(value: CountOutcome): CountOutcome {
    switch (value.kind) {
        case "Count": return { kind: "Count", value: checkedIndex(value.value) };
        case "InvalidPattern": return { kind: "InvalidPattern" };
        case "Uncertain": return { kind: "Uncertain" };
    }
}
interface PatternWorkState {
    pattern: number;
    subject: number;
}
function copyPatternWorkState(value: PatternWorkState): PatternWorkState {
    return { pattern: checkedIndex(value.pattern), subject: checkedIndex(value.subject) };
}
interface CaptureInstruction {
    operation: number;
    target: number;
    alternate: number;
    group: number;
    atom: string;
}
function copyCaptureInstruction(value: CaptureInstruction): CaptureInstruction {
    return { operation: checkedIndex(value.operation), target: checkedIndex(value.target), alternate: checkedIndex(value.alternate), group: checkedIndex(value.group), atom: checkedChar(value.atom) };
}
export interface CompiledRegex {
    readonly valid: boolean;
    readonly limited: boolean;
    readonly nodes: CaptureNode[];
    readonly root: number;
    readonly references: number[];
    readonly minimums: number[];
    readonly maximums: number[];
    readonly firstLiterals: number[];
    readonly lastLiterals: number[];
    readonly interpreted: boolean;
    readonly regular: boolean;
    readonly prefilter: boolean;
    readonly instructions: CaptureInstruction[];
    readonly classMembers: CaptureClassMember[];
    readonly caseMode: string;
    readonly newlineMode: string;
    readonly shortest: boolean;
    readonly captures: number;
    readonly backreferences: boolean;
    readonly caseSensitive: boolean;
    readonly dotCrossesNewline: boolean;
    readonly lineAnchors: boolean;
}
function copyCompiledRegex(value: CompiledRegex): CompiledRegex {
    return checkedOpaque(value);
}
interface CaptureNode {
    operation: number;
    left: number;
    right: number;
    group: number;
    atom: string;
    lower: number;
    upper: number;
    unbounded: boolean;
    preference: number;
    first: number;
    last: number;
}
function copyCaptureNode(value: CaptureNode): CaptureNode {
    return { operation: checkedIndex(value.operation), left: checkedIndex(value.left), right: checkedIndex(value.right), group: checkedIndex(value.group), atom: checkedChar(value.atom), lower: checkedIndex(value.lower), upper: checkedIndex(value.upper), unbounded: checkedBool(value.unbounded), preference: checkedIndex(value.preference), first: checkedIndex(value.first), last: checkedIndex(value.last) };
}
interface CaptureFrame {
    operation: number;
    sequence: number;
    alternative: number;
    group: number;
    first: number;
    branched: boolean;
}
function copyCaptureFrame(value: CaptureFrame): CaptureFrame {
    return { operation: checkedIndex(value.operation), sequence: checkedIndex(value.sequence), alternative: checkedIndex(value.alternative), group: checkedIndex(value.group), first: checkedIndex(value.first), branched: checkedBool(value.branched) };
}
interface CaptureBuildTask {
    node: number;
    entry: number;
    exit: number;
}
function copyCaptureBuildTask(value: CaptureBuildTask): CaptureBuildTask {
    return { node: checkedIndex(value.node), entry: checkedIndex(value.entry), exit: checkedIndex(value.exit) };
}
interface CaptureRegister {
    start: number;
    end: number;
    status: number;
}
function copyCaptureRegister(value: CaptureRegister): CaptureRegister {
    return { start: checkedIndex(value.start), end: checkedIndex(value.end), status: checkedIndex(value.status) };
}
interface CaptureDissectFrame {
    node: number;
    begin: number;
    end: number;
    capture: number;
    phase: number;
    cursor: number;
    path: number;
    prefix: boolean;
}
function copyCaptureDissectFrame(value: CaptureDissectFrame): CaptureDissectFrame {
    return { node: checkedIndex(value.node), begin: checkedIndex(value.begin), end: checkedIndex(value.end), capture: checkedIndex(value.capture), phase: checkedIndex(value.phase), cursor: checkedIndex(value.cursor), path: checkedIndex(value.path), prefix: checkedBool(value.prefix) };
}
interface CaptureRepeatPath {
    begin: number;
    cursor: number;
    capture: number;
    count: number;
    previous: number;
}
function copyCaptureRepeatPath(value: CaptureRepeatPath): CaptureRepeatPath {
    return { begin: checkedIndex(value.begin), cursor: checkedIndex(value.cursor), capture: checkedIndex(value.capture), count: checkedIndex(value.count), previous: checkedIndex(value.previous) };
}
function posixClassKind(first: string, second: string, third: string, fourth: string, fifth: string, sixth: string): number {
    first = checkedChar(first);
    second = checkedChar(second);
    third = checkedChar(third);
    fourth = checkedChar(fourth);
    fifth = checkedChar(fifth);
    sixth = checkedChar(sixth);
    if (first === "d" && second === "i" && third === "g" && fourth === "i" && fifth === "t" && sixth === ":") {
        return 1;
    }
    if (first === "a" && second === "l" && third === "p" && fourth === "h" && fifth === "a" && sixth === ":") {
        return 2;
    }
    if (first === "u" && second === "p" && third === "p" && fourth === "e" && fifth === "r" && sixth === ":") {
        return 3;
    }
    if (first === "s" && second === "p" && third === "a" && fourth === "c" && fifth === "e" && sixth === ":") {
        return 4;
    }
    if (first === "a" && second === "l" && third === "n" && fourth === "u" && fifth === "m" && sixth === ":") {
        return 5;
    }
    if (first === "a" && second === "s" && third === "c" && fourth === "i" && fifth === "i" && sixth === ":") {
        return 6;
    }
    if (first === "b" && second === "l" && third === "a" && fourth === "n" && fifth === "k" && sixth === ":") {
        return 7;
    }
    if (first === "c" && second === "n" && third === "t" && fourth === "r" && fifth === "l" && sixth === ":") {
        return 8;
    }
    if (first === "g" && second === "r" && third === "a" && fourth === "p" && fifth === "h" && sixth === ":") {
        return 9;
    }
    if (first === "l" && second === "o" && third === "w" && fourth === "e" && fifth === "r" && sixth === ":") {
        return 10;
    }
    if (first === "p" && second === "r" && third === "i" && fourth === "n" && fifth === "t" && sixth === ":") {
        return 11;
    }
    if (first === "p" && second === "u" && third === "n" && fourth === "c" && fifth === "t" && sixth === ":") {
        return 12;
    }
    if (first === "x" && second === "d" && third === "i" && fourth === "g" && fifth === "i" && sixth === "t") {
        return 13;
    }
    if (first === "w" && second === "o" && third === "r" && fourth === "d" && fifth === ":") {
        return 14;
    }
    return 0;
}
function posixClassWidth(kind: number): number {
    kind = checkedIndex(kind);
    if (kind === 14) {
        return 10;
    }
    if (kind === 13) {
        return 12;
    }
    return 11;
}
function zeroWidthWord(atom: string): boolean {
    atom = checkedChar(atom);
    const codepoint: number = checkedChar(atom).codePointAt(0)!;
    const lower: number = checkedChar(asciiLowercase(atom)).codePointAt(0)!;
    return (codepoint >= 48 && codepoint <= 57) || (lower >= 97 && lower <= 122) || atom === "_";
}
function makeCaptureStep(operation: number, target: number, alternate: number, group: number, atom: string): CaptureInstruction {
    operation = checkedIndex(operation);
    target = checkedIndex(target);
    alternate = checkedIndex(alternate);
    group = checkedIndex(group);
    atom = checkedChar(atom);
    return { operation: operation, target: target, alternate: alternate, group: group, atom: atom };
}
function makeCaptureNode(operation: number, left: number, right: number, group: number, atom: string, preference: number, first: number, last: number): CaptureNode {
    operation = checkedIndex(operation);
    left = checkedIndex(left);
    right = checkedIndex(right);
    group = checkedIndex(group);
    atom = checkedChar(atom);
    preference = checkedIndex(preference);
    first = checkedIndex(first);
    last = checkedIndex(last);
    return { operation: operation, left: left, right: right, group: group, atom: atom, lower: 0, upper: 0, unbounded: false, preference: preference, first: first, last: last };
}
function captureWidthSum(left: number, right: number): number {
    left = checkedIndex(left);
    right = checkedIndex(right);
    if (left > checkedSubtract(maxCaptureWork, right)) {
        return maxCaptureWork;
    }
    return checkedAdd(left, right);
}
function captureWidthRepeat(width: number, count: number): number {
    width = checkedIndex(width);
    count = checkedIndex(count);
    let result: number = 0;
    let index: number = 0;
    while (index < count) {
        result = checkedIndex(captureWidthSum(result, width));
        index = checkedAdd(index, 1);
    }
    return result;
}
interface CaptureClassMember {
    kind: number;
    lower: number;
    upper: number;
    complement: boolean;
}
function copyCaptureClassMember(value: CaptureClassMember): CaptureClassMember {
    return { kind: checkedIndex(value.kind), lower: checkedIndex(value.lower), upper: checkedIndex(value.upper), complement: checkedBool(value.complement) };
}
interface CaptureClass {
    valid: boolean;
    negated: boolean;
    members: CaptureClassMember[];
}
function copyCaptureClass(value: CaptureClass): CaptureClass {
    return { valid: checkedBool(value.valid), negated: checkedBool(value.negated), members: checkedStructs(value.members, copyCaptureClassMember) };
}
interface CaptureClassAtom {
    valid: boolean;
    rangeEndpoint: boolean;
    end: number;
    kind: number;
    value: number;
    complement: boolean;
}
function copyCaptureClassAtom(value: CaptureClassAtom): CaptureClassAtom {
    return { valid: checkedBool(value.valid), rangeEndpoint: checkedBool(value.rangeEndpoint), end: checkedIndex(value.end), kind: checkedIndex(value.kind), value: checkedIndex(value.value), complement: checkedBool(value.complement) };
}
interface CaptureSource {
    valid: boolean;
    syntax: string;
    caseMode: string;
    newlineMode: string;
    atoms: string[];
    tokenEnds: number[];
}
function copyCaptureSource(value: CaptureSource): CaptureSource {
    return { valid: checkedBool(value.valid), syntax: checkedChar(value.syntax), caseMode: checkedChar(value.caseMode), newlineMode: checkedChar(value.newlineMode), atoms: checkedChars(value.atoms), tokenEnds: checkedIndices(value.tokenEnds) };
}
interface CaptureNumeric {
    valid: boolean;
    backreference: boolean;
    value: number;
    end: number;
}
function copyCaptureNumeric(value: CaptureNumeric): CaptureNumeric {
    return { valid: checkedBool(value.valid), backreference: checkedBool(value.backreference), value: checkedIndex(value.value), end: checkedIndex(value.end) };
}
function captureDigitValue(atom: string): number {
    atom = checkedChar(atom);
    const value: number = checkedChar(atom).codePointAt(0)!;
    if (value >= 48 && value <= 57) {
        return checkedSubtract(value, 48);
    }
    if (value >= 65 && value <= 70) {
        return checkedSubtract(value, 55);
    }
    if (value >= 97 && value <= 102) {
        return checkedSubtract(value, 87);
    }
    return 16;
}
interface CaptureInteger {
    value: number;
    high: boolean;
}
function copyCaptureInteger(value: CaptureInteger): CaptureInteger {
    return { value: checkedIndex(value.value), high: checkedBool(value.high) };
}
function captureWrappingDigit(value: number, base: number, digit: number): CaptureInteger {
    value = checkedIndex(value);
    base = checkedIndex(base);
    digit = checkedIndex(digit);
    const maximum: number = 2147483647;
    let result: number = 0;
    let high: boolean = false;
    let count: number = 0;
    while (count < base) {
        if (value > checkedSubtract(maximum, result)) {
            result = checkedIndex(checkedSubtract(checkedSubtract(value, (checkedSubtract(maximum, result))), 1));
            high = checkedBool(high === false);
        }
        else {
            result = checkedAdd(result, value);
        }
        count = checkedAdd(count, 1);
    }
    if (digit > checkedSubtract(maximum, result)) {
        result = checkedIndex(checkedSubtract(checkedSubtract(digit, (checkedSubtract(maximum, result))), 1));
        high = checkedBool(high === false);
    }
    else {
        result = checkedAdd(result, digit);
    }
    return { value: result, high: high };
}
function parseCaptureNumeric(source: string[], groups: number, basic: boolean): CaptureNumeric {
    source = checkedChars(source);
    groups = checkedIndex(groups);
    basic = checkedBool(basic);
    const marker: string = indexChar(source, checkedIndex(1));
    let value: number = 0;
    let high: boolean = false;
    let end: number = 2;
    let valid: boolean = source.length > 2;
    let backreference: boolean = false;
    if (marker === "c") {
        if (valid) {
            value = checkedIndex(checkedChar(indexChar(source, checkedIndex(2))).codePointAt(0)!);
            while (value >= 32) {
                let chunk: number = 32;
                while (checkedAdd(chunk, chunk) <= value) {
                    chunk = checkedAdd(chunk, chunk);
                }
                value = checkedIndex(checkedSubtract(value, chunk));
            }
            end = checkedIndex(3);
        }
    }
    else if (marker === "x" || marker === "u" || marker === "U") {
        let digits: number = 0;
        let limit: number = 255;
        if (marker === "u") {
            limit = checkedIndex(4);
        }
        else if (marker === "U") {
            limit = checkedIndex(8);
        }
        while (end < source.length && digits < limit) {
            const digit: number = captureDigitValue(indexChar(source, checkedIndex(end)));
            if (digit === 16) {
                break;
            }
            const number: CaptureInteger = captureWrappingDigit(value, 16, digit);
            value = checkedIndex(number.value);
            high = checkedBool(number.high);
            end = checkedAdd(end, 1);
            digits = checkedAdd(digits, 1);
        }
        valid = checkedBool(high === false && value <= 2147483646 && digits > 0 && (marker === "x" || digits === limit));
    }
    else {
        let digits: number = 0;
        end = checkedIndex(1);
        if (!(marker === "0")) {
            while (end < source.length && digits < 255) {
                const digit: number = captureDigitValue(indexChar(source, checkedIndex(end)));
                if (digit > 9 || (basic && digits === 1)) {
                    break;
                }
                const number: CaptureInteger = captureWrappingDigit(value, 10, digit);
                value = checkedIndex(number.value);
                high = checkedBool(number.high);
                end = checkedAdd(end, 1);
                digits = checkedAdd(digits, 1);
            }
            backreference = checkedBool(digits === 1 || (high === false && value > 0 && value <= 2147483646 && (checkedIndex(value)) <= groups));
        }
        if (backreference) {
            valid = checkedBool(high === false && value > 0 && value <= 2147483646 && (checkedIndex(value)) <= groups);
        }
        else {
            end = checkedIndex(1);
            digits = checkedIndex(0);
            value = checkedIndex(0);
            while (end < source.length && digits < 3) {
                const digit: number = captureDigitValue(indexChar(source, checkedIndex(end)));
                if (digit > 7) {
                    break;
                }
                const candidate: number = captureWrappingDigit(value, 8, digit).value;
                if (candidate > 255) {
                    break;
                }
                value = checkedIndex(candidate);
                end = checkedAdd(end, 1);
                digits = checkedAdd(digits, 1);
            }
            valid = checkedBool(digits > 0);
        }
    }
    return { valid: valid, backreference: backreference, value: value, end: end };
}
function captureAssertion(operation: number): boolean {
    operation = checkedIndex(operation);
    return operation === vmBegin || operation === vmEnd || operation === vmWordBegin || operation === vmWordEnd || operation === vmAbsoluteBegin || operation === vmAbsoluteEnd || operation === vmBoundary || operation === vmNotBoundary;
}
function captureAssertionMatches(operation: number, position: number, length: number, before: boolean, after: boolean, previousNewline: boolean, nextNewline: boolean, lineAnchors: boolean): boolean {
    operation = checkedIndex(operation);
    position = checkedIndex(position);
    length = checkedIndex(length);
    before = checkedBool(before);
    after = checkedBool(after);
    previousNewline = checkedBool(previousNewline);
    nextNewline = checkedBool(nextNewline);
    lineAnchors = checkedBool(lineAnchors);
    return (operation === vmBegin && (position === 0 || (lineAnchors && previousNewline))) || (operation === vmEnd && (position === length || (lineAnchors && nextNewline))) || (operation === vmAbsoluteBegin && position === 0) || (operation === vmAbsoluteEnd && position === length) || (operation === vmWordBegin && before === false && after) || (operation === vmWordEnd && before && after === false) || (operation === vmBoundary && !(before === after)) || (operation === vmNotBoundary && before === after);
}
interface CollatingName {
    characters: string[];
}
function copyCollatingName(value: CollatingName): CollatingName {
    return { characters: checkedChars(value.characters) };
}
function collatingNameEq(name: CollatingName, expected: string): boolean {
    name = copyCollatingName(name);
    expected = checkedString(expected);
    const characters: string[] = Array.from(expected);
    if (!(name.characters.length === characters.length)) {
        return false;
    }
    let index: number = 0;
    while (index < characters.length) {
        if (!(indexChar(name.characters, checkedIndex(index)) === indexChar(characters, checkedIndex(index)))) {
            return false;
        }
        index = checkedAdd(index, 1);
    }
    return true;
}
function captureCollatingValue(characters: string[]): number {
    characters = checkedChars(characters);
    if (characters.length === 1) {
        return checkedChar(indexChar(characters, checkedIndex(0))).codePointAt(0)!;
    }
    const name: CollatingName = { characters: characters };
    if (collatingNameEq(name, "NUL")) {
        return 0;
    }
    if (collatingNameEq(name, "SOH")) {
        return 1;
    }
    if (collatingNameEq(name, "STX")) {
        return 2;
    }
    if (collatingNameEq(name, "ETX")) {
        return 3;
    }
    if (collatingNameEq(name, "EOT")) {
        return 4;
    }
    if (collatingNameEq(name, "ENQ")) {
        return 5;
    }
    if (collatingNameEq(name, "ACK")) {
        return 6;
    }
    if (collatingNameEq(name, "BEL")) {
        return 7;
    }
    if (collatingNameEq(name, "alert")) {
        return 7;
    }
    if (collatingNameEq(name, "BS")) {
        return 8;
    }
    if (collatingNameEq(name, "backspace")) {
        return 8;
    }
    if (collatingNameEq(name, "HT")) {
        return 9;
    }
    if (collatingNameEq(name, "tab")) {
        return 9;
    }
    if (collatingNameEq(name, "LF")) {
        return 10;
    }
    if (collatingNameEq(name, "newline")) {
        return 10;
    }
    if (collatingNameEq(name, "VT")) {
        return 11;
    }
    if (collatingNameEq(name, "vertical-tab")) {
        return 11;
    }
    if (collatingNameEq(name, "FF")) {
        return 12;
    }
    if (collatingNameEq(name, "form-feed")) {
        return 12;
    }
    if (collatingNameEq(name, "CR")) {
        return 13;
    }
    if (collatingNameEq(name, "carriage-return")) {
        return 13;
    }
    if (collatingNameEq(name, "SO")) {
        return 14;
    }
    if (collatingNameEq(name, "SI")) {
        return 15;
    }
    if (collatingNameEq(name, "DLE")) {
        return 16;
    }
    if (collatingNameEq(name, "DC1")) {
        return 17;
    }
    if (collatingNameEq(name, "DC2")) {
        return 18;
    }
    if (collatingNameEq(name, "DC3")) {
        return 19;
    }
    if (collatingNameEq(name, "DC4")) {
        return 20;
    }
    if (collatingNameEq(name, "NAK")) {
        return 21;
    }
    if (collatingNameEq(name, "SYN")) {
        return 22;
    }
    if (collatingNameEq(name, "ETB")) {
        return 23;
    }
    if (collatingNameEq(name, "CAN")) {
        return 24;
    }
    if (collatingNameEq(name, "EM")) {
        return 25;
    }
    if (collatingNameEq(name, "SUB")) {
        return 26;
    }
    if (collatingNameEq(name, "ESC")) {
        return 27;
    }
    if (collatingNameEq(name, "IS4")) {
        return 28;
    }
    if (collatingNameEq(name, "FS")) {
        return 28;
    }
    if (collatingNameEq(name, "IS3")) {
        return 29;
    }
    if (collatingNameEq(name, "GS")) {
        return 29;
    }
    if (collatingNameEq(name, "IS2")) {
        return 30;
    }
    if (collatingNameEq(name, "RS")) {
        return 30;
    }
    if (collatingNameEq(name, "IS1")) {
        return 31;
    }
    if (collatingNameEq(name, "US")) {
        return 31;
    }
    if (collatingNameEq(name, "space")) {
        return 32;
    }
    if (collatingNameEq(name, "exclamation-mark")) {
        return 33;
    }
    if (collatingNameEq(name, "quotation-mark")) {
        return 34;
    }
    if (collatingNameEq(name, "number-sign")) {
        return 35;
    }
    if (collatingNameEq(name, "dollar-sign")) {
        return 36;
    }
    if (collatingNameEq(name, "percent-sign")) {
        return 37;
    }
    if (collatingNameEq(name, "ampersand")) {
        return 38;
    }
    if (collatingNameEq(name, "apostrophe")) {
        return 39;
    }
    if (collatingNameEq(name, "left-parenthesis")) {
        return 40;
    }
    if (collatingNameEq(name, "right-parenthesis")) {
        return 41;
    }
    if (collatingNameEq(name, "asterisk")) {
        return 42;
    }
    if (collatingNameEq(name, "plus-sign")) {
        return 43;
    }
    if (collatingNameEq(name, "comma")) {
        return 44;
    }
    if (collatingNameEq(name, "hyphen")) {
        return 45;
    }
    if (collatingNameEq(name, "hyphen-minus")) {
        return 45;
    }
    if (collatingNameEq(name, "period")) {
        return 46;
    }
    if (collatingNameEq(name, "full-stop")) {
        return 46;
    }
    if (collatingNameEq(name, "slash")) {
        return 47;
    }
    if (collatingNameEq(name, "solidus")) {
        return 47;
    }
    if (collatingNameEq(name, "zero")) {
        return 48;
    }
    if (collatingNameEq(name, "one")) {
        return 49;
    }
    if (collatingNameEq(name, "two")) {
        return 50;
    }
    if (collatingNameEq(name, "three")) {
        return 51;
    }
    if (collatingNameEq(name, "four")) {
        return 52;
    }
    if (collatingNameEq(name, "five")) {
        return 53;
    }
    if (collatingNameEq(name, "six")) {
        return 54;
    }
    if (collatingNameEq(name, "seven")) {
        return 55;
    }
    if (collatingNameEq(name, "eight")) {
        return 56;
    }
    if (collatingNameEq(name, "nine")) {
        return 57;
    }
    if (collatingNameEq(name, "colon")) {
        return 58;
    }
    if (collatingNameEq(name, "semicolon")) {
        return 59;
    }
    if (collatingNameEq(name, "less-than-sign")) {
        return 60;
    }
    if (collatingNameEq(name, "equals-sign")) {
        return 61;
    }
    if (collatingNameEq(name, "greater-than-sign")) {
        return 62;
    }
    if (collatingNameEq(name, "question-mark")) {
        return 63;
    }
    if (collatingNameEq(name, "commercial-at")) {
        return 64;
    }
    if (collatingNameEq(name, "left-square-bracket")) {
        return 91;
    }
    if (collatingNameEq(name, "backslash")) {
        return 92;
    }
    if (collatingNameEq(name, "reverse-solidus")) {
        return 92;
    }
    if (collatingNameEq(name, "right-square-bracket")) {
        return 93;
    }
    if (collatingNameEq(name, "circumflex")) {
        return 94;
    }
    if (collatingNameEq(name, "circumflex-accent")) {
        return 94;
    }
    if (collatingNameEq(name, "underscore")) {
        return 95;
    }
    if (collatingNameEq(name, "low-line")) {
        return 95;
    }
    if (collatingNameEq(name, "grave-accent")) {
        return 96;
    }
    if (collatingNameEq(name, "left-brace")) {
        return 123;
    }
    if (collatingNameEq(name, "left-curly-bracket")) {
        return 123;
    }
    if (collatingNameEq(name, "vertical-line")) {
        return 124;
    }
    if (collatingNameEq(name, "right-brace")) {
        return 125;
    }
    if (collatingNameEq(name, "right-curly-bracket")) {
        return 125;
    }
    if (collatingNameEq(name, "tilde")) {
        return 126;
    }
    if (collatingNameEq(name, "DEL")) {
        return 127;
    }
    return 2147483647;
}
function parseCaptureClassAtom(source: string[], syntax: string, groups: number): CaptureClassAtom {
    source = checkedChars(source);
    syntax = checkedChar(syntax);
    groups = checkedIndex(groups);
    const position: number = 0;
    let rangeEndpoint: boolean = true;
    let valid: boolean = position < source.length;
    let end: number = position;
    let kind: number = captureClassRange;
    let value: number = 0;
    let complement: boolean = false;
    if (valid) {
        const atom: string = indexChar(source, checkedIndex(position));
        value = checkedIndex(checkedChar(atom).codePointAt(0)!);
        end = checkedAdd(end, 1);
        if (atom === "[" && checkedSubtract(source.length, position) >= 2 && (indexChar(source, checkedIndex(checkedAdd(position, 1))) === ":" || indexChar(source, checkedIndex(checkedAdd(position, 1))) === "." || indexChar(source, checkedIndex(checkedAdd(position, 1))) === "=")) {
            valid = checkedBool(false);
            if (indexChar(source, checkedIndex(checkedAdd(position, 1))) === "." || indexChar(source, checkedIndex(checkedAdd(position, 1))) === "=") {
                const marker: string = indexChar(source, checkedIndex(checkedAdd(position, 1)));
                rangeEndpoint = checkedBool(marker === ".");
                end = checkedIndex(checkedAdd(position, 2));
                let name: string[] = [];
                while (checkedAdd(end, 1) < source.length && (!(indexChar(source, checkedIndex(end)) === marker) || !(indexChar(source, checkedIndex(checkedAdd(end, 1))) === "]"))) {
                    pushChar(name, indexChar(source, checkedIndex(end)));
                    end = checkedAdd(end, 1);
                }
                if (checkedAdd(end, 1) < source.length && name.length > 0) {
                    value = checkedIndex(captureCollatingValue(name));
                    valid = checkedBool(!(value === 2147483647));
                    end = checkedAdd(end, 2);
                }
            }
            else if (indexChar(source, checkedIndex(checkedAdd(position, 1))) === ":" && checkedSubtract(source.length, position) >= 8) {
                kind = checkedIndex(posixClassKind(indexChar(source, checkedIndex(checkedAdd(position, 2))), indexChar(source, checkedIndex(checkedAdd(position, 3))), indexChar(source, checkedIndex(checkedAdd(position, 4))), indexChar(source, checkedIndex(checkedAdd(position, 5))), indexChar(source, checkedIndex(checkedAdd(position, 6))), indexChar(source, checkedIndex(checkedAdd(position, 7)))));
                if (kind > 0) {
                    end = checkedIndex(checkedSubtract(checkedAdd(position, posixClassWidth(kind)), 2));
                    valid = checkedBool(end <= source.length && indexChar(source, checkedIndex(checkedSubtract(end, 2))) === ":" && indexChar(source, checkedIndex(checkedSubtract(end, 1))) === "]");
                }
            }
        }
        else if (atom === "\\" && syntax === "a") {
            valid = checkedBool(end < source.length);
            if (valid) {
                const escaped: string = indexChar(source, checkedIndex(end));
                end = checkedAdd(end, 1);
                value = checkedIndex(checkedChar(escaped).codePointAt(0)!);
                if (escaped === "x" || escaped === "u" || escaped === "U" || escaped === "c" || (value >= 48 && value <= 57)) {
                    const numeric: CaptureNumeric = parseCaptureNumeric(source, groups, false);
                    valid = checkedBool(numeric.valid && numeric.backreference === false);
                    value = checkedIndex(numeric.value);
                    end = checkedIndex(numeric.end);
                }
                else if (escaped === "d" || escaped === "D") {
                    kind = checkedIndex(1);
                    complement = checkedBool(escaped === "D");
                }
                else if (escaped === "s" || escaped === "S") {
                    kind = checkedIndex(4);
                    complement = checkedBool(escaped === "S");
                }
                else if (escaped === "w" || escaped === "W") {
                    kind = checkedIndex(14);
                    complement = checkedBool(escaped === "W");
                }
                else if (escaped === "a") {
                    value = checkedIndex(7);
                }
                else if (escaped === "b") {
                    value = checkedIndex(8);
                }
                else if (escaped === "B") {
                    value = checkedIndex(92);
                }
                else if (escaped === "e") {
                    value = checkedIndex(27);
                }
                else if (escaped === "f") {
                    value = checkedIndex(12);
                }
                else if (escaped === "n") {
                    value = checkedIndex(10);
                }
                else if (escaped === "r") {
                    value = checkedIndex(13);
                }
                else if (escaped === "t") {
                    value = checkedIndex(9);
                }
                else if (escaped === "v") {
                    value = checkedIndex(11);
                }
                else if ((value >= 48 && value <= 57) || (value >= 65 && value <= 90) || (value >= 97 && value <= 122)) {
                    valid = checkedBool(false);
                }
            }
        }
    }
    return { valid: valid, rangeEndpoint: rangeEndpoint, end: end, kind: kind, value: value, complement: complement };
}
function parseCaptureClass(source: string[], syntax: string, groups: number): CaptureClass {
    source = checkedChars(source);
    syntax = checkedChar(syntax);
    groups = checkedIndex(groups);
    let position: number = 1;
    let negated: boolean = false;
    if (position < source.length && indexChar(source, checkedIndex(position)) === "^") {
        negated = checkedBool(true);
        position = checkedAdd(position, 1);
    }
    const first: number = position;
    let members: CaptureClassMember[] = [];
    let valid: boolean = false;
    while (position < source.length) {
        if (indexChar(source, checkedIndex(position)) === "]" && position > first) {
            valid = checkedBool(true);
            break;
        }
        if (indexChar(source, checkedIndex(position)) === "-" && position > first && checkedAdd(position, 1) < source.length && !(indexChar(source, checkedIndex(checkedAdd(position, 1))) === "]")) {
            break;
        }
        let lookahead: string[] = [];
        let look: number = position;
        while (look < source.length && checkedSubtract(look, position) < 257) {
            pushChar(lookahead, indexChar(source, checkedIndex(look)));
            look = checkedAdd(look, 1);
        }
        const atom: CaptureClassAtom = parseCaptureClassAtom(lookahead, syntax, groups);
        if (atom.valid === false) {
            break;
        }
        position = checkedAdd(position, atom.end);
        let upper: number = atom.value;
        if (checkedSubtract(source.length, position) >= 2 && indexChar(source, checkedIndex(position)) === "-" && !(indexChar(source, checkedIndex(checkedAdd(position, 1))) === "]")) {
            let lookahead: string[] = [];
            let look: number = checkedAdd(position, 1);
            while (look < source.length && checkedSubtract(look, position) < 258) {
                pushChar(lookahead, indexChar(source, checkedIndex(look)));
                look = checkedAdd(look, 1);
            }
            const bound: CaptureClassAtom = parseCaptureClassAtom(lookahead, syntax, groups);
            if (bound.valid === false || atom.rangeEndpoint === false || bound.rangeEndpoint === false || !(atom.kind === captureClassRange) || !(bound.kind === captureClassRange) || bound.value < atom.value) {
                break;
            }
            upper = checkedIndex(bound.value);
            position = checkedAdd(position, checkedAdd(1, bound.end));
        }
        pushStruct(members, { kind: atom.kind, lower: atom.value, upper: upper, complement: atom.complement }, copyCaptureClassMember);
    }
    pushStruct(members, { kind: 0, lower: 0, upper: 0, complement: false }, copyCaptureClassMember);
    return { valid: valid, negated: negated, members: members };
}
function captureClassMemberMatches(member: CaptureClassMember, actual: string, sensitive: boolean): boolean {
    member = copyCaptureClassMember(member);
    actual = checkedChar(actual);
    sensitive = checkedBool(sensitive);
    const codepoint: number = checkedChar(actual).codePointAt(0)!;
    const digit: boolean = codepoint >= 48 && codepoint <= 57;
    const upper: boolean = codepoint >= 65 && codepoint <= 90;
    const lower: boolean = codepoint >= 97 && codepoint <= 122;
    const letter: boolean = upper || lower;
    const space: boolean = (codepoint >= 9 && codepoint <= 13) || codepoint === 32;
    const kind: number = member.kind;
    let matched: boolean = (kind === 1 && digit) || (kind === 2 && letter) || (kind === 3 && (upper || (sensitive === false && lower))) || (kind === 4 && space) || (kind === 5 && (digit || letter)) || (kind === 6 && codepoint <= 127) || (kind === 7 && (codepoint === 32 || codepoint === 9)) || (kind === 8 && (codepoint <= 31 || (codepoint >= 127 && codepoint <= 159))) || (kind === 9 && codepoint >= 33 && codepoint <= 126) || (kind === 10 && (lower || (sensitive === false && upper))) || (kind === 11 && codepoint >= 32 && codepoint <= 126) || (kind === 12 && ((codepoint >= 33 && codepoint <= 47) || (codepoint >= 58 && codepoint <= 64) || (codepoint >= 91 && codepoint <= 96) || (codepoint >= 123 && codepoint <= 126))) || (kind === 13 && (digit || (codepoint >= 65 && codepoint <= 70) || (codepoint >= 97 && codepoint <= 102))) || (kind === 14 && (digit || letter || codepoint === 95));
    if (kind === captureClassRange) {
        matched = checkedBool(codepoint >= member.lower && codepoint <= member.upper);
        if (sensitive === false) {
            let alternate: number = codepoint;
            if (upper) {
                alternate = checkedAdd(alternate, 32);
            }
            else if (lower) {
                alternate = checkedIndex(checkedSubtract(alternate, 32));
            }
            matched = checkedBool(matched || (alternate >= member.lower && alternate <= member.upper));
        }
    }
    return !(matched === member.complement);
}
function capturePatternSource(pattern: string, syntax: string, expanded: boolean): CaptureSource {
    pattern = checkedString(pattern);
    syntax = checkedChar(syntax);
    expanded = checkedBool(expanded);
    const source: string[] = Array.from(pattern);
    let position: number = 0;
    let valid: boolean = true;
    let caseMode: string = " ";
    let newlineMode: string = " ";
    let effectiveExpanded: boolean = expanded;
    if (!(syntax === "q") && source.length >= 4 && indexChar(source, checkedIndex(0)) === "*" && indexChar(source, checkedIndex(1)) === "*" && indexChar(source, checkedIndex(2)) === "*" && (indexChar(source, checkedIndex(3)) === ":" || indexChar(source, checkedIndex(3)) === "=")) {
        position = checkedIndex(4);
        syntax = checkedChar("a");
        if (indexChar(source, checkedIndex(3)) === "=") {
            syntax = checkedChar("q");
        }
    }
    if (syntax === "a" && checkedSubtract(source.length, position) >= 3 && indexChar(source, checkedIndex(position)) === "(" && indexChar(source, checkedIndex(checkedAdd(position, 1))) === "?" && (((checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 2)))).codePointAt(0)!) >= 65 && (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 2)))).codePointAt(0)!) <= 90) || ((checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 2)))).codePointAt(0)!) >= 97 && (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 2)))).codePointAt(0)!) <= 122))) {
        position = checkedAdd(position, 2);
        while (position < source.length && !(indexChar(source, checkedIndex(position)) === ")")) {
            const option: string = indexChar(source, checkedIndex(position));
            if (option === "b" || option === "e" || option === "q") {
                syntax = checkedChar(option);
            }
            else if (option === "i" || option === "c") {
                caseMode = checkedChar(option);
            }
            else if (option === "n" || option === "m" || option === "p" || option === "w" || option === "s") {
                newlineMode = checkedChar(option);
            }
            else if (option === "x") {
                effectiveExpanded = checkedBool(true);
            }
            else if (option === "t") {
                effectiveExpanded = checkedBool(false);
            }
            else {
                valid = checkedBool(false);
                break;
            }
            position = checkedAdd(position, 1);
        }
        if (position === source.length) {
            valid = checkedBool(false);
        }
        else {
            position = checkedAdd(position, 1);
        }
    }
    if (syntax === "q") {
        effectiveExpanded = checkedBool(false);
        newlineMode = checkedChar("s");
    }
    let atoms: string[] = [];
    let tokenEnds: number[] = [];
    while (valid && position < source.length) {
        const atom: string = indexChar(source, checkedIndex(position));
        const tokenStart: number = atoms.length;
        if (syntax === "q") {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
        }
        else if (atom === "[") {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
            if (position < source.length && indexChar(source, checkedIndex(position)) === "^") {
                pushChar(atoms, indexChar(source, checkedIndex(position)));
                position = checkedAdd(position, 1);
            }
            const first: number = position;
            let special: string = " ";
            while (position < source.length) {
                const current: string = indexChar(source, checkedIndex(position));
                pushChar(atoms, current);
                position = checkedAdd(position, 1);
                if (special === " " && syntax === "a" && current === "\\" && position < source.length) {
                    const marker: string = indexChar(source, checkedIndex(position));
                    pushChar(atoms, marker);
                    position = checkedAdd(position, 1);
                    if (marker === "c" && position < source.length) {
                        pushChar(atoms, indexChar(source, checkedIndex(position)));
                        position = checkedAdd(position, 1);
                    }
                }
                else if (!(special === " ")) {
                    if (current === special && position < source.length && indexChar(source, checkedIndex(position)) === "]") {
                        pushChar(atoms, "]");
                        position = checkedAdd(position, 1);
                        special = checkedChar(" ");
                    }
                }
                else if (current === "[" && position < source.length && (indexChar(source, checkedIndex(position)) === ":" || indexChar(source, checkedIndex(position)) === "." || indexChar(source, checkedIndex(position)) === "=")) {
                    special = checkedChar(indexChar(source, checkedIndex(position)));
                    pushChar(atoms, special);
                    position = checkedAdd(position, 1);
                }
                else if (current === "]" && position > checkedAdd(first, 1)) {
                    break;
                }
            }
        }
        else if (atom === "\\") {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
            if (position < source.length) {
                const marker: string = indexChar(source, checkedIndex(position));
                pushChar(atoms, marker);
                position = checkedAdd(position, 1);
                if (syntax === "a" && marker === "c" && position < source.length) {
                    pushChar(atoms, indexChar(source, checkedIndex(position)));
                    position = checkedAdd(position, 1);
                }
                else if (syntax === "a" && (marker === "x" || marker === "u" || marker === "U" || ((checkedChar(marker).codePointAt(0)!) >= 48 && (checkedChar(marker).codePointAt(0)!) <= 57))) {
                    let limit: number = 255;
                    if (marker === "u") {
                        limit = checkedIndex(4);
                    }
                    else if (marker === "U") {
                        limit = checkedIndex(8);
                    }
                    let digits: number = 0;
                    while (position < source.length && digits < limit) {
                        const digit: number = captureDigitValue(indexChar(source, checkedIndex(position)));
                        if (digit === 16 || ((checkedChar(marker).codePointAt(0)!) >= 48 && (checkedChar(marker).codePointAt(0)!) <= 57 && digit > 9)) {
                            break;
                        }
                        pushChar(atoms, indexChar(source, checkedIndex(position)));
                        position = checkedAdd(position, 1);
                        digits = checkedAdd(digits, 1);
                    }
                }
            }
        }
        else if (syntax === "a" && atom === "(" && checkedSubtract(source.length, position) >= 3 && indexChar(source, checkedIndex(checkedAdd(position, 1))) === "?" && indexChar(source, checkedIndex(checkedAdd(position, 2))) === "#") {
            position = checkedAdd(position, 3);
            while (position < source.length && !(indexChar(source, checkedIndex(position)) === ")")) {
                position = checkedAdd(position, 1);
            }
            if (position < source.length) {
                position = checkedAdd(position, 1);
            }
        }
        else if (syntax === "a" && atom === "(") {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
            if (position < source.length && indexChar(source, checkedIndex(position)) === "?") {
                pushChar(atoms, "?");
                position = checkedAdd(position, 1);
                if (position < source.length) {
                    const marker: string = indexChar(source, checkedIndex(position));
                    pushChar(atoms, marker);
                    position = checkedAdd(position, 1);
                    if (marker === "<" && position < source.length) {
                        pushChar(atoms, indexChar(source, checkedIndex(position)));
                        position = checkedAdd(position, 1);
                    }
                }
            }
        }
        else if (syntax === "a" && (atom === "*" || atom === "+" || atom === "?")) {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
            if (position < source.length && indexChar(source, checkedIndex(position)) === "?") {
                pushChar(atoms, "?");
                position = checkedAdd(position, 1);
            }
        }
        else if (effectiveExpanded && atom === "#") {
            while (position < source.length && !(indexChar(source, checkedIndex(position)) === "\n")) {
                position = checkedAdd(position, 1);
            }
        }
        else if (effectiveExpanded && (atom === " " || ((checkedChar(atom).codePointAt(0)!) >= 9 && (checkedChar(atom).codePointAt(0)!) <= 13))) {
            position = checkedAdd(position, 1);
        }
        else {
            pushChar(atoms, atom);
            position = checkedAdd(position, 1);
        }
        if (!(syntax === "q") && atoms.length > tokenStart) {
            const basicBound: boolean = syntax === "b" && checkedSubtract(atoms.length, tokenStart) === 2 && indexChar(atoms, checkedIndex(tokenStart)) === "\\" && indexChar(atoms, checkedIndex(checkedAdd(tokenStart, 1))) === "{";
            if (basicBound || (!(syntax === "b") && indexChar(atoms, checkedIndex(tokenStart)) === "{")) {
                let inBound: boolean = basicBound;
                let first: boolean = true;
                while (position < source.length) {
                    const current: string = indexChar(source, checkedIndex(position));
                    if (effectiveExpanded && (current === " " || ((checkedChar(current).codePointAt(0)!) >= 9 && (checkedChar(current).codePointAt(0)!) <= 13))) {
                        position = checkedAdd(position, 1);
                    }
                    else if (effectiveExpanded && current === "#") {
                        while (position < source.length && !(indexChar(source, checkedIndex(position)) === "\n")) {
                            position = checkedAdd(position, 1);
                        }
                    }
                    else {
                        if (first && (checkedChar(current).codePointAt(0)!) >= 48 && (checkedChar(current).codePointAt(0)!) <= 57) {
                            inBound = checkedBool(true);
                        }
                        first = checkedBool(false);
                        if (inBound === false) {
                            break;
                        }
                        pushChar(atoms, current);
                        position = checkedAdd(position, 1);
                        if (basicBound && current === "\\") {
                            if (position < source.length && indexChar(source, checkedIndex(position)) === "}") {
                                pushChar(atoms, "}");
                                position = checkedAdd(position, 1);
                            }
                            else {
                                valid = checkedBool(false);
                            }
                            break;
                        }
                        else if (basicBound === false && current === "}") {
                            if (syntax === "a" && position < source.length && indexChar(source, checkedIndex(position)) === "?") {
                                pushChar(atoms, "?");
                                position = checkedAdd(position, 1);
                            }
                            break;
                        }
                        else if (!(current === ",") && ((checkedChar(current).codePointAt(0)!) < 48 || (checkedChar(current).codePointAt(0)!) > 57)) {
                            valid = checkedBool(false);
                            break;
                        }
                    }
                }
            }
        }
        while (tokenEnds.length < atoms.length) {
            pushIndex(tokenEnds, atoms.length);
        }
    }
    return { valid: valid, syntax: syntax, caseMode: caseMode, newlineMode: newlineMode, atoms: atoms, tokenEnds: tokenEnds };
}
function compileCaptureProgramAtoms(source: string[], tokenEnds: number[], syntax: string, valid: boolean, caseMode: string, newlineMode: string, capturing: boolean, caseSensitive: boolean, dotCrossesNewline: boolean, lineAnchors: boolean): CompiledRegex {
    source = checkedChars(source);
    tokenEnds = checkedIndices(tokenEnds);
    syntax = checkedChar(syntax);
    valid = checkedBool(valid);
    caseMode = checkedChar(caseMode);
    newlineMode = checkedChar(newlineMode);
    capturing = checkedBool(capturing);
    caseSensitive = checkedBool(caseSensitive);
    dotCrossesNewline = checkedBool(dotCrossesNewline);
    lineAnchors = checkedBool(lineAnchors);
    let limited: boolean = false;
    let classMembers: CaptureClassMember[] = [];
    let nodes: CaptureNode[] = [];
    pushStruct(nodes, makeCaptureNode(nodeEmpty, 0, 0, 0, " ", 0, 1, 0), copyCaptureNode);
    let frames: CaptureFrame[] = [];
    pushStruct(frames, { operation: nodeGroup, sequence: 0, alternative: 0, group: 0, first: 1, branched: false }, copyCaptureFrame);
    let frameCount: number = 1;
    let groups: number = 0;
    let closed: number[] = [];
    pushIndex(closed, 0);
    let backreferences: boolean = false;
    let assertions: boolean = false;
    let assertionDepth: number = 0;
    let position: number = 0;
    let basicStarLiteral: boolean = true;
    while (position < source.length && valid) {
        let atom: string = indexChar(source, checkedIndex(position));
        let literal: boolean = syntax === "q";
        if (syntax === "b") {
            if (atom === "\\" && checkedSubtract(source.length, position) >= 2 && (indexChar(source, checkedIndex(checkedAdd(position, 1))) === "(" || indexChar(source, checkedIndex(checkedAdd(position, 1))) === ")")) {
                position = checkedAdd(position, 1);
                atom = checkedChar(indexChar(source, checkedIndex(position)));
            }
            else if (atom === "+" || atom === "?" || atom === "|" || atom === "(" || atom === ")" || atom === "{" || atom === "}") {
                literal = checkedBool(true);
            }
            else if (atom === "^" && indexStruct(frames, checkedIndex(checkedSubtract(frameCount, 1)), copyCaptureFrame).sequence > 0) {
                literal = checkedBool(true);
            }
            else if (atom === "$" && checkedAdd(position, 1) < source.length && (checkedSubtract(source.length, position) < 3 || !(indexChar(source, checkedIndex(checkedAdd(position, 1))) === "\\") || !(indexChar(source, checkedIndex(checkedAdd(position, 2))) === ")"))) {
                literal = checkedBool(true);
            }
            else if (atom === "*" && basicStarLiteral) {
                literal = checkedBool(true);
            }
        }
        if (syntax === "e" && atom === ")" && frameCount === 1) {
            literal = checkedBool(true);
        }
        if (atom === "]" || atom === "}" || (atom === "{" && (indexNumber(tokenEnds, checkedIndex(position)) === checkedAdd(position, 1) || checkedSubtract(source.length, position) < 2 || (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 1)))).codePointAt(0)!) < 48 || (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 1)))).codePointAt(0)!) > 57))) {
            literal = checkedBool(true);
        }
        let node: number = 0;
        let hasAtom: boolean = false;
        if (literal) {
            node = checkedIndex(nodes.length);
            pushStruct(nodes, makeCaptureNode(vmLiteral, 0, 0, 0, atom, 0, 1, 0), copyCaptureNode);
            position = checkedAdd(position, 1);
            hasAtom = checkedBool(true);
        }
        else if (atom === "(") {
            basicStarLiteral = checkedBool(true);
            let group: number = 0;
            const first: number = checkedAdd(groups, 1);
            let operation: number = nodeGroup;
            position = checkedAdd(position, 1);
            if (!(syntax === "b") && position < source.length && indexChar(source, checkedIndex(position)) === "?" && indexNumber(tokenEnds, checkedIndex(checkedSubtract(position, 1))) > position) {
                if (!(syntax === "a")) {
                    valid = checkedBool(false);
                }
                position = checkedAdd(position, 1);
                if (position < source.length && indexChar(source, checkedIndex(position)) === ":") {
                    position = checkedAdd(position, 1);
                }
                else {
                    let behind: boolean = false;
                    if (position < source.length && indexChar(source, checkedIndex(position)) === "<") {
                        behind = checkedBool(true);
                        position = checkedAdd(position, 1);
                    }
                    if (position < source.length && (indexChar(source, checkedIndex(position)) === "=" || indexChar(source, checkedIndex(position)) === "!")) {
                        operation = checkedIndex(nodeLookahead);
                        if (behind) {
                            operation = checkedIndex(nodeLookbehind);
                        }
                        if (indexChar(source, checkedIndex(position)) === "!") {
                            operation = checkedIndex(nodeNotLookahead);
                            if (behind) {
                                operation = checkedIndex(nodeNotLookbehind);
                            }
                        }
                        position = checkedAdd(position, 1);
                        assertions = checkedBool(true);
                        assertionDepth = checkedAdd(assertionDepth, 1);
                        if (assertionDepth > 64) {
                            limited = checkedBool(true);
                            valid = checkedBool(false);
                        }
                    }
                    else {
                        valid = checkedBool(false);
                    }
                }
            }
            else if (assertionDepth === 0) {
                groups = checkedAdd(groups, 1);
                group = checkedIndex(groups);
                pushIndex(closed, 0);
            }
            const frame: CaptureFrame = copyCaptureFrame({ operation: operation, sequence: 0, alternative: 0, group: group, first: first, branched: false });
            if (frameCount === frames.length) {
                pushStruct(frames, frame, copyCaptureFrame);
            }
            else {
                frames[checkedIndexIn(frames, frameCount)] = copyCaptureFrame(frame);
            }
            frameCount = checkedAdd(frameCount, 1);
        }
        else if (atom === "|") {
            const frame: CaptureFrame = copyCaptureFrame(indexStruct(frames, checkedIndex(checkedSubtract(frameCount, 1)), copyCaptureFrame));
            let alternative: number = frame.sequence;
            if (frame.branched) {
                alternative = checkedIndex(nodes.length);
                pushStruct(nodes, makeCaptureNode(nodeAlternative, frame.alternative, frame.sequence, 0, " ", 1, frame.first, groups), copyCaptureNode);
            }
            frames[checkedIndexIn(frames, checkedSubtract(frameCount, 1))] = copyCaptureFrame({ operation: frame.operation, sequence: 0, alternative: alternative, branched: true, group: frame.group, first: frame.first });
            position = checkedAdd(position, 1);
        }
        else if (atom === ")") {
            if (frameCount === 1) {
                valid = checkedBool(false);
            }
            else {
                frameCount = checkedIndex(checkedSubtract(frameCount, 1));
                const frame: CaptureFrame = copyCaptureFrame(indexStruct(frames, checkedIndex(frameCount), copyCaptureFrame));
                let inner: number = frame.sequence;
                if (frame.branched) {
                    inner = checkedIndex(nodes.length);
                    pushStruct(nodes, makeCaptureNode(nodeAlternative, frame.alternative, frame.sequence, 0, " ", 1, frame.first, groups), copyCaptureNode);
                }
                let preference: number = indexStruct(nodes, checkedIndex(inner), copyCaptureNode).preference;
                if (!(frame.operation === nodeGroup)) {
                    preference = checkedIndex(0);
                    assertionDepth = checkedIndex(checkedSubtract(assertionDepth, 1));
                }
                node = checkedIndex(nodes.length);
                pushStruct(nodes, makeCaptureNode(frame.operation, inner, 0, frame.group, " ", preference, frame.first, groups), copyCaptureNode);
                if (frame.group > 0) {
                    closed[checkedIndexIn(closed, frame.group)] = checkedIndex(1);
                }
                position = checkedAdd(position, 1);
                hasAtom = checkedBool(true);
            }
        }
        else if (atom === "^" || atom === "$") {
            let operation: number = vmBegin;
            if (atom === "$") {
                operation = checkedIndex(vmEnd);
            }
            node = checkedIndex(nodes.length);
            pushStruct(nodes, makeCaptureNode(operation, 0, 0, 0, " ", 0, 1, 0), copyCaptureNode);
            position = checkedAdd(position, 1);
            hasAtom = checkedBool(true);
        }
        else {
            let operation: number = 0;
            let member: string = " ";
            let reference: number = 0;
            if (atom === ".") {
                operation = checkedIndex(vmAny);
                position = checkedAdd(position, 1);
            }
            else if (atom === "[" && checkedSubtract(source.length, position) >= 7 && indexChar(source, checkedIndex(checkedAdd(position, 1))) === "[" && indexChar(source, checkedIndex(checkedAdd(position, 2))) === ":" && (indexChar(source, checkedIndex(checkedAdd(position, 3))) === "<" || indexChar(source, checkedIndex(checkedAdd(position, 3))) === ">") && indexChar(source, checkedIndex(checkedAdd(position, 4))) === ":" && indexChar(source, checkedIndex(checkedAdd(position, 5))) === "]" && indexChar(source, checkedIndex(checkedAdd(position, 6))) === "]") {
                operation = checkedIndex(vmWordBegin);
                if (indexChar(source, checkedIndex(checkedAdd(position, 3))) === ">") {
                    operation = checkedIndex(vmWordEnd);
                }
                position = checkedAdd(position, 7);
            }
            else if (atom === "[") {
                operation = checkedIndex(vmClass);
                reference = checkedIndex(classMembers.length);
                let classAtoms: string[] = [];
                pushChar(classAtoms, "[");
                position = checkedAdd(position, 1);
                if (position < source.length && indexChar(source, checkedIndex(position)) === "^") {
                    pushChar(classAtoms, "^");
                    position = checkedAdd(position, 1);
                }
                const first: number = position;
                let special: string = " ";
                while (position < source.length) {
                    const current: string = indexChar(source, checkedIndex(position));
                    pushChar(classAtoms, current);
                    position = checkedAdd(position, 1);
                    if (special === " " && syntax === "a" && current === "\\" && position < source.length) {
                        const marker: string = indexChar(source, checkedIndex(position));
                        pushChar(classAtoms, marker);
                        position = checkedAdd(position, 1);
                        if (marker === "c" && position < source.length) {
                            pushChar(classAtoms, indexChar(source, checkedIndex(position)));
                            position = checkedAdd(position, 1);
                        }
                    }
                    else if (!(special === " ")) {
                        if (current === special && position < source.length && indexChar(source, checkedIndex(position)) === "]") {
                            pushChar(classAtoms, "]");
                            position = checkedAdd(position, 1);
                            special = checkedChar(" ");
                        }
                    }
                    else if (current === "[" && position < source.length && (indexChar(source, checkedIndex(position)) === ":" || indexChar(source, checkedIndex(position)) === "." || indexChar(source, checkedIndex(position)) === "=")) {
                        special = checkedChar(indexChar(source, checkedIndex(position)));
                        pushChar(classAtoms, special);
                        position = checkedAdd(position, 1);
                    }
                    else if (current === "]" && position > checkedAdd(first, 1)) {
                        break;
                    }
                }
                const parsedClass: CaptureClass = parseCaptureClass(classAtoms, syntax, groups);
                valid = checkedBool(parsedClass.valid);
                if (parsedClass.negated) {
                    member = checkedChar("^");
                }
                let index: number = 0;
                while (index < parsedClass.members.length) {
                    pushStruct(classMembers, indexStruct(parsedClass.members, checkedIndex(index), copyCaptureClassMember), copyCaptureClassMember);
                    index = checkedAdd(index, 1);
                }
            }
            else if (atom === "\\" && checkedSubtract(source.length, position) >= 2) {
                const escaped: string = indexChar(source, checkedIndex(checkedAdd(position, 1)));
                const escapeStart: number = position;
                position = checkedAdd(position, 2);
                if (syntax === "e" || (syntax === "b" && !(escaped === "<") && !(escaped === ">") && ((checkedChar(escaped).codePointAt(0)!) < 49 || (checkedChar(escaped).codePointAt(0)!) > 57))) {
                    operation = checkedIndex(vmLiteral);
                    member = checkedChar(escaped);
                    if (syntax === "b" && escaped === "{") {
                        valid = checkedBool(false);
                    }
                }
                else if (syntax === "b" && (escaped === "<" || escaped === ">")) {
                    operation = checkedIndex(vmWordBegin);
                    if (escaped === ">") {
                        operation = checkedIndex(vmWordEnd);
                    }
                }
                else if (escaped === "A" || escaped === "Z" || escaped === "m" || escaped === "y" || escaped === "Y") {
                    operation = checkedIndex(vmAbsoluteBegin);
                    if (escaped === "Z") {
                        operation = checkedIndex(vmAbsoluteEnd);
                    }
                    else if (escaped === "m") {
                        operation = checkedIndex(vmWordBegin);
                    }
                    else if (escaped === "y") {
                        operation = checkedIndex(vmBoundary);
                    }
                    else if (escaped === "Y") {
                        operation = checkedIndex(vmNotBoundary);
                    }
                }
                else if (escaped === "d" || escaped === "D" || escaped === "s" || escaped === "S" || escaped === "W") {
                    operation = checkedIndex(vmClass);
                    reference = checkedIndex(classMembers.length);
                    let kind: number = 14;
                    if (escaped === "d" || escaped === "D") {
                        kind = checkedIndex(1);
                    }
                    else if (escaped === "s" || escaped === "S") {
                        kind = checkedIndex(4);
                    }
                    pushStruct(classMembers, { kind: kind, lower: 0, upper: 0, complement: escaped === "D" || escaped === "S" || escaped === "W" }, copyCaptureClassMember);
                    pushStruct(classMembers, { kind: 0, lower: 0, upper: 0, complement: false }, copyCaptureClassMember);
                }
                else if (escaped === "a" || escaped === "b" || escaped === "B" || escaped === "e" || escaped === "f" || escaped === "t" || escaped === "v") {
                    operation = checkedIndex(vmNumeric);
                    reference = checkedIndex(7);
                    if (escaped === "b") {
                        reference = checkedIndex(8);
                    }
                    else if (escaped === "B") {
                        reference = checkedIndex(92);
                    }
                    else if (escaped === "e") {
                        reference = checkedIndex(27);
                    }
                    else if (escaped === "f") {
                        reference = checkedIndex(12);
                    }
                    else if (escaped === "t") {
                        reference = checkedIndex(9);
                    }
                    else if (escaped === "v") {
                        reference = checkedIndex(11);
                    }
                }
                else if (escaped === "w") {
                    operation = checkedIndex(vmWord);
                }
                else if (escaped === "M") {
                    operation = checkedIndex(vmWordEnd);
                }
                else if (escaped === "n" || escaped === "r" || ((checkedChar(escaped).codePointAt(0)!) < 48 || (checkedChar(escaped).codePointAt(0)!) > 57) && ((checkedChar(escaped).codePointAt(0)!) < 65 || (checkedChar(escaped).codePointAt(0)!) > 90) && ((checkedChar(escaped).codePointAt(0)!) < 97 || (checkedChar(escaped).codePointAt(0)!) > 122)) {
                    operation = checkedIndex(vmLiteral);
                    member = checkedChar(escaped);
                    if (escaped === "n") {
                        member = checkedChar("\n");
                    }
                    else if (escaped === "r") {
                        member = checkedChar("\r");
                    }
                }
                else if (escaped === "c" || escaped === "x" || escaped === "u" || escaped === "U" || ((checkedChar(escaped).codePointAt(0)!) >= 48 && (checkedChar(escaped).codePointAt(0)!) <= 57)) {
                    const limit: number = indexNumber(tokenEnds, checkedIndex(escapeStart));
                    let window: string[] = [];
                    let next: number = escapeStart;
                    while (next < limit && checkedSubtract(next, escapeStart) < 257) {
                        pushChar(window, indexChar(source, checkedIndex(next)));
                        next = checkedAdd(next, 1);
                    }
                    const numeric: CaptureNumeric = parseCaptureNumeric(window, groups, syntax === "b");
                    valid = checkedBool(numeric.valid);
                    if (valid) {
                        reference = checkedIndex(checkedIndex(numeric.value));
                        position = checkedIndex(checkedAdd(escapeStart, numeric.end));
                        operation = checkedIndex(vmNumeric);
                        if (numeric.backreference) {
                            operation = checkedIndex(vmBackref);
                            valid = checkedBool(reference < closed.length && indexNumber(closed, checkedIndex(reference)) > 0);
                        }
                    }
                }
                else {
                    valid = checkedBool(false);
                }
            }
            else if (simpleLiteralChar(atom)) {
                operation = checkedIndex(vmLiteral);
                member = checkedChar(atom);
                position = checkedAdd(position, 1);
            }
            else {
                valid = checkedBool(false);
            }
            if (valid === false) {
                break;
            }
            node = checkedIndex(nodes.length);
            pushStruct(nodes, makeCaptureNode(operation, 0, 0, reference, member, 0, 1, 0), copyCaptureNode);
            if (operation === vmBackref) {
                backreferences = checkedBool(true);
                if (assertionDepth > 0) {
                    valid = checkedBool(false);
                }
            }
            hasAtom = checkedBool(true);
        }
        if (hasAtom && valid) {
            basicStarLiteral = checkedBool(indexStruct(nodes, checkedIndex(node), copyCaptureNode).operation === vmBegin);
            let repeated: boolean = false;
            let lower: number = 0;
            let upper: number = 0;
            let unbounded: boolean = false;
            let fixed: boolean = false;
            let quantifierEnd: number = position;
            if (!(syntax === "q") && position < source.length) {
                let basicBound: boolean = false;
                if (syntax === "b" && checkedSubtract(source.length, position) >= 2 && indexChar(source, checkedIndex(position)) === "\\" && indexChar(source, checkedIndex(checkedAdd(position, 1))) === "{") {
                    basicBound = checkedBool(true);
                    position = checkedAdd(position, 1);
                }
                quantifierEnd = checkedIndex(indexNumber(tokenEnds, checkedIndex(position)));
                const quantifier: string = indexChar(source, checkedIndex(position));
                if ((quantifier === "*" && (!(syntax === "b") || basicStarLiteral === false)) || (!(syntax === "b") && (quantifier === "+" || quantifier === "?"))) {
                    repeated = checkedBool(true);
                    unbounded = checkedBool(!(quantifier === "?"));
                    upper = checkedIndex(1);
                    if (quantifier === "+") {
                        lower = checkedIndex(1);
                    }
                    position = checkedAdd(position, 1);
                }
                else if ((!(syntax === "b") || basicBound) && quantifier === "{" && quantifierEnd > checkedAdd(position, 1) && checkedSubtract(source.length, position) >= 2 && (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 1)))).codePointAt(0)!) >= 48 && (checkedChar(indexChar(source, checkedIndex(checkedAdd(position, 1)))).codePointAt(0)!) <= 57) {
                    repeated = checkedBool(true);
                    fixed = checkedBool(true);
                    position = checkedAdd(position, 1);
                    while (position < source.length && (checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!) >= 48 && (checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!) <= 57) {
                        const double: number = checkedAdd(lower, lower);
                        const four: number = checkedAdd(double, double);
                        lower = checkedIndex(checkedAdd(checkedAdd(checkedAdd(four, four), double), checkedIndex((checkedSubtract((checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!), 48)))));
                        position = checkedAdd(position, 1);
                        if (lower > 255) {
                            valid = checkedBool(false);
                            break;
                        }
                    }
                    upper = checkedIndex(lower);
                    if (position < source.length && indexChar(source, checkedIndex(position)) === ",") {
                        fixed = checkedBool(false);
                        position = checkedAdd(position, 1);
                        upper = checkedIndex(0);
                        unbounded = checkedBool(true);
                        while (position < source.length && (checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!) >= 48 && (checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!) <= 57) {
                            unbounded = checkedBool(false);
                            const double: number = checkedAdd(upper, upper);
                            const four: number = checkedAdd(double, double);
                            upper = checkedIndex(checkedAdd(checkedAdd(checkedAdd(four, four), double), checkedIndex((checkedSubtract((checkedChar(indexChar(source, checkedIndex(position))).codePointAt(0)!), 48)))));
                            position = checkedAdd(position, 1);
                            if (upper > 255) {
                                valid = checkedBool(false);
                                break;
                            }
                        }
                    }
                    if (basicBound && position < source.length && indexChar(source, checkedIndex(position)) === "\\") {
                        position = checkedAdd(position, 1);
                    }
                    else if (basicBound) {
                        valid = checkedBool(false);
                    }
                    if (position === source.length || !(indexChar(source, checkedIndex(position)) === "}") || (unbounded === false && upper < lower)) {
                        valid = checkedBool(false);
                    }
                    else {
                        position = checkedAdd(position, 1);
                    }
                }
                if (basicBound && repeated === false) {
                    valid = checkedBool(false);
                }
            }
            if (repeated && valid) {
                const inner: CaptureNode = copyCaptureNode(indexStruct(nodes, checkedIndex(node), copyCaptureNode));
                if (captureAssertion(inner.operation) || (inner.operation >= nodeLookahead && inner.operation <= nodeNotLookbehind)) {
                    valid = checkedBool(false);
                }
                let preference: number = 1;
                if (syntax === "a" && position < quantifierEnd && indexChar(source, checkedIndex(position)) === "?") {
                    preference = checkedIndex(2);
                    position = checkedAdd(position, 1);
                }
                if (fixed) {
                    preference = checkedIndex(inner.preference);
                }
                if (lower === 0 && upper === 0 && unbounded === false) {
                    preference = checkedIndex(0);
                }
                const child: number = node;
                node = checkedIndex(nodes.length);
                pushStruct(nodes, { operation: nodeRepeat, left: child, right: 0, group: 0, atom: " ", lower: lower, upper: upper, unbounded: unbounded, preference: preference, first: inner.first, last: inner.last }, copyCaptureNode);
            }
            const frame: CaptureFrame = copyCaptureFrame(indexStruct(frames, checkedIndex(checkedSubtract(frameCount, 1)), copyCaptureFrame));
            let sequence: number = node;
            if (frame.sequence > 0) {
                let preference: number = indexStruct(nodes, checkedIndex(frame.sequence), copyCaptureNode).preference;
                if (preference === 0) {
                    preference = checkedIndex(indexStruct(nodes, checkedIndex(node), copyCaptureNode).preference);
                }
                sequence = checkedIndex(nodes.length);
                pushStruct(nodes, makeCaptureNode(nodeSequence, frame.sequence, node, 0, " ", preference, frame.first, groups), copyCaptureNode);
            }
            frames[checkedIndexIn(frames, checkedSubtract(frameCount, 1))] = copyCaptureFrame({ operation: frame.operation, sequence: sequence, alternative: frame.alternative, branched: frame.branched, group: frame.group, first: frame.first });
        }
    }
    if (!(frameCount === 1)) {
        valid = checkedBool(false);
    }
    const rootFrame: CaptureFrame = copyCaptureFrame(indexStruct(frames, checkedIndex(0), copyCaptureFrame));
    let root: number = rootFrame.sequence;
    if (rootFrame.branched) {
        root = checkedIndex(nodes.length);
        pushStruct(nodes, makeCaptureNode(nodeAlternative, rootFrame.alternative, rootFrame.sequence, 0, " ", 1, 1, groups), copyCaptureNode);
    }
    let captureMinimums: number[] = [];
    let captureMaximums: number[] = [];
    let captureIndex: number = 0;
    while (captureIndex <= groups) {
        pushIndex(captureMinimums, 0);
        pushIndex(captureMaximums, maxCaptureWork);
        captureIndex = checkedAdd(captureIndex, 1);
    }
    let references: number[] = [];
    let minimums: number[] = [];
    let maximums: number[] = [];
    let firstLiterals: number[] = [];
    let lastLiterals: number[] = [];
    let index: number = 0;
    while (index < nodes.length) {
        const node: CaptureNode = copyCaptureNode(indexStruct(nodes, checkedIndex(index), copyCaptureNode));
        let value: number = 0;
        if (node.operation === vmBackref) {
            value = checkedIndex(1);
        }
        if (node.left > 0 && indexNumber(references, checkedIndex(node.left)) > 0) {
            value = checkedIndex(1);
        }
        if (node.right > 0 && indexNumber(references, checkedIndex(node.right)) > 0) {
            value = checkedIndex(1);
        }
        pushIndex(references, value);
        let minimum: number = 0;
        let maximum: number = 0;
        let firstLiteral: number = 0;
        let lastLiteral: number = 0;
        if (node.operation === vmLiteral || node.operation === vmAny || node.operation === vmWord || node.operation === vmClass || node.operation === vmNumeric) {
            minimum = checkedIndex(1);
            maximum = checkedIndex(1);
            if (node.operation === vmLiteral) {
                firstLiteral = checkedIndex(checkedAdd((checkedIndex((checkedChar(node.atom).codePointAt(0)!))), 1));
                lastLiteral = checkedIndex(firstLiteral);
            }
            else if (node.operation === vmNumeric) {
                firstLiteral = checkedIndex(checkedAdd(node.group, 1));
                lastLiteral = checkedIndex(firstLiteral);
            }
        }
        else if (node.operation === vmBackref) {
            minimum = checkedIndex(indexNumber(captureMinimums, checkedIndex(node.group)));
            maximum = checkedIndex(indexNumber(captureMaximums, checkedIndex(node.group)));
        }
        else if (node.operation === nodeSequence) {
            minimum = checkedIndex(captureWidthSum(indexNumber(minimums, checkedIndex(node.left)), indexNumber(minimums, checkedIndex(node.right))));
            maximum = checkedIndex(captureWidthSum(indexNumber(maximums, checkedIndex(node.left)), indexNumber(maximums, checkedIndex(node.right))));
            if (indexNumber(minimums, checkedIndex(node.left)) > 0) {
                firstLiteral = checkedIndex(indexNumber(firstLiterals, checkedIndex(node.left)));
            }
            if (indexNumber(minimums, checkedIndex(node.right)) > 0) {
                lastLiteral = checkedIndex(indexNumber(lastLiterals, checkedIndex(node.right)));
            }
        }
        else if (node.operation === nodeAlternative) {
            minimum = checkedIndex(indexNumber(minimums, checkedIndex(node.left)));
            if (indexNumber(minimums, checkedIndex(node.right)) < minimum) {
                minimum = checkedIndex(indexNumber(minimums, checkedIndex(node.right)));
            }
            maximum = checkedIndex(indexNumber(maximums, checkedIndex(node.left)));
            if (indexNumber(maximums, checkedIndex(node.right)) > maximum) {
                maximum = checkedIndex(indexNumber(maximums, checkedIndex(node.right)));
            }
            if (indexNumber(firstLiterals, checkedIndex(node.left)) === indexNumber(firstLiterals, checkedIndex(node.right))) {
                firstLiteral = checkedIndex(indexNumber(firstLiterals, checkedIndex(node.left)));
            }
            if (indexNumber(lastLiterals, checkedIndex(node.left)) === indexNumber(lastLiterals, checkedIndex(node.right))) {
                lastLiteral = checkedIndex(indexNumber(lastLiterals, checkedIndex(node.left)));
            }
        }
        else if (node.operation === nodeGroup) {
            minimum = checkedIndex(indexNumber(minimums, checkedIndex(node.left)));
            maximum = checkedIndex(indexNumber(maximums, checkedIndex(node.left)));
            firstLiteral = checkedIndex(indexNumber(firstLiterals, checkedIndex(node.left)));
            lastLiteral = checkedIndex(indexNumber(lastLiterals, checkedIndex(node.left)));
        }
        else if (node.operation === nodeRepeat) {
            minimum = checkedIndex(captureWidthRepeat(indexNumber(minimums, checkedIndex(node.left)), node.lower));
            maximum = checkedIndex(captureWidthRepeat(indexNumber(maximums, checkedIndex(node.left)), node.upper));
            if (node.unbounded && indexNumber(maximums, checkedIndex(node.left)) > 0) {
                maximum = checkedIndex(maxCaptureWork);
            }
            if (node.lower > 0 && indexNumber(minimums, checkedIndex(node.left)) > 0) {
                firstLiteral = checkedIndex(indexNumber(firstLiterals, checkedIndex(node.left)));
                lastLiteral = checkedIndex(indexNumber(lastLiterals, checkedIndex(node.left)));
            }
        }
        if (node.operation === nodeGroup && node.group > 0) {
            captureMinimums[checkedIndexIn(captureMinimums, node.group)] = checkedIndex(minimum);
            captureMaximums[checkedIndexIn(captureMaximums, node.group)] = checkedIndex(maximum);
        }
        pushIndex(minimums, minimum);
        pushIndex(maximums, maximum);
        pushIndex(firstLiterals, firstLiteral);
        pushIndex(lastLiterals, lastLiteral);
        index = checkedAdd(index, 1);
    }
    index = checkedIndex(nodes.length);
    while (index > 0) {
        index = checkedIndex(checkedSubtract(index, 1));
        while (indexStruct(nodes, checkedIndex(index), copyCaptureNode).operation === nodeSequence && indexStruct(nodes, checkedIndex(indexStruct(nodes, checkedIndex(index), copyCaptureNode).left), copyCaptureNode).operation === nodeSequence) {
            const current: CaptureNode = copyCaptureNode(indexStruct(nodes, checkedIndex(index), copyCaptureNode));
            const left: CaptureNode = copyCaptureNode(indexStruct(nodes, checkedIndex(current.left), copyCaptureNode));
            let preference: number = indexStruct(nodes, checkedIndex(left.right), copyCaptureNode).preference;
            if (preference === 0) {
                preference = checkedIndex(indexStruct(nodes, checkedIndex(current.right), copyCaptureNode).preference);
            }
            nodes[checkedIndexIn(nodes, current.left)] = copyCaptureNode(makeCaptureNode(nodeSequence, left.right, current.right, 0, " ", preference, current.first, current.last));
            let reference: number = 0;
            if (indexNumber(references, checkedIndex(left.right)) > 0 || indexNumber(references, checkedIndex(current.right)) > 0) {
                reference = checkedIndex(1);
            }
            references[checkedIndexIn(references, current.left)] = checkedIndex(reference);
            minimums[checkedIndexIn(minimums, current.left)] = checkedIndex(captureWidthSum(indexNumber(minimums, checkedIndex(left.right)), indexNumber(minimums, checkedIndex(current.right))));
            maximums[checkedIndexIn(maximums, current.left)] = checkedIndex(captureWidthSum(indexNumber(maximums, checkedIndex(left.right)), indexNumber(maximums, checkedIndex(current.right))));
            firstLiterals[checkedIndexIn(firstLiterals, current.left)] = checkedIndex(0);
            if (indexNumber(minimums, checkedIndex(left.right)) > 0) {
                firstLiterals[checkedIndexIn(firstLiterals, current.left)] = checkedIndex(indexNumber(firstLiterals, checkedIndex(left.right)));
            }
            lastLiterals[checkedIndexIn(lastLiterals, current.left)] = checkedIndex(0);
            if (indexNumber(minimums, checkedIndex(current.right)) > 0) {
                lastLiterals[checkedIndexIn(lastLiterals, current.left)] = checkedIndex(indexNumber(lastLiterals, checkedIndex(current.right)));
            }
            nodes[checkedIndexIn(nodes, index)] = copyCaptureNode(makeCaptureNode(nodeSequence, left.left, current.left, 0, " ", current.preference, current.first, current.last));
        }
    }
    const shortest: boolean = indexStruct(nodes, checkedIndex(root), copyCaptureNode).preference === 2;
    const interpreted: boolean = backreferences || assertions || capturing;
    const regular: boolean = backreferences === false && assertions === false;
    let prefilter: boolean = true;
    let instructions: CaptureInstruction[] = [];
    pushStruct(instructions, makeCaptureStep(vmJump, 1, 0, 0, " "), copyCaptureInstruction);
    pushStruct(instructions, makeCaptureStep(vmAccept, 0, 0, 0, " "), copyCaptureInstruction);
    let tasks: CaptureBuildTask[] = [];
    pushStruct(tasks, { node: root, entry: 0, exit: 1 }, copyCaptureBuildTask);
    let head: number = 0;
    while (head < tasks.length && valid && prefilter) {
        if (instructions.length > maxCaptureInstructions) {
            prefilter = checkedBool(false);
            if (regular) {
                limited = checkedBool(true);
                valid = checkedBool(false);
            }
            break;
        }
        const task: CaptureBuildTask = copyCaptureBuildTask(indexStruct(tasks, checkedIndex(head), copyCaptureBuildTask));
        head = checkedAdd(head, 1);
        const node: CaptureNode = copyCaptureNode(indexStruct(nodes, checkedIndex(task.node), copyCaptureNode));
        if (node.operation === nodeEmpty) {
            instructions[checkedIndexIn(instructions, task.entry)] = copyCaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, " "));
        }
        else if (node.operation === nodeSequence) {
            const middle: number = instructions.length;
            pushStruct(instructions, makeCaptureStep(vmJump, 0, 0, 0, " "), copyCaptureInstruction);
            pushStruct(tasks, { node: node.left, entry: task.entry, exit: middle }, copyCaptureBuildTask);
            pushStruct(tasks, { node: node.right, entry: middle, exit: task.exit }, copyCaptureBuildTask);
        }
        else if (node.operation === nodeAlternative) {
            const left: number = instructions.length;
            pushStruct(instructions, makeCaptureStep(vmJump, 0, 0, 0, " "), copyCaptureInstruction);
            const right: number = instructions.length;
            pushStruct(instructions, makeCaptureStep(vmJump, 0, 0, 0, " "), copyCaptureInstruction);
            instructions[checkedIndexIn(instructions, task.entry)] = copyCaptureInstruction(makeCaptureStep(vmSplit, left, right, 0, " "));
            pushStruct(tasks, { node: node.left, entry: left, exit: task.exit }, copyCaptureBuildTask);
            pushStruct(tasks, { node: node.right, entry: right, exit: task.exit }, copyCaptureBuildTask);
        }
        else if (node.operation === nodeGroup) {
            const begin: number = instructions.length;
            instructions[checkedIndexIn(instructions, task.entry)] = copyCaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, " "));
            pushStruct(instructions, makeCaptureStep(vmClear, node.first, node.last, 0, " "), copyCaptureInstruction);
            if (node.group > 0) {
                pushStruct(instructions, makeCaptureStep(vmOpen, 0, 0, node.group, " "), copyCaptureInstruction);
            }
            const inner: number = instructions.length;
            pushStruct(instructions, makeCaptureStep(vmJump, 0, 0, 0, " "), copyCaptureInstruction);
            const end: number = instructions.length;
            if (node.group > 0) {
                pushStruct(instructions, makeCaptureStep(vmClose, 0, 0, node.group, " "), copyCaptureInstruction);
            }
            pushStruct(instructions, makeCaptureStep(vmJump, task.exit, 0, 0, " "), copyCaptureInstruction);
            pushStruct(tasks, { node: node.left, entry: inner, exit: end }, copyCaptureBuildTask);
        }
        else if (node.operation === nodeRepeat) {
            let entry: number = task.entry;
            let copies: number = node.upper;
            if (node.unbounded) {
                copies = checkedIndex(checkedAdd(node.lower, 1));
            }
            let count: number = 0;
            while (count < copies) {
                const begin: number = instructions.length;
                pushStruct(instructions, makeCaptureStep(vmClear, node.first, node.last, 0, " "), copyCaptureInstruction);
                const inner: number = instructions.length;
                pushStruct(instructions, makeCaptureStep(vmJump, 0, 0, 0, " "), copyCaptureInstruction);
                const next: number = instructions.length;
                pushStruct(instructions, makeCaptureStep(vmJump, task.exit, 0, 0, " "), copyCaptureInstruction);
                if (count < node.lower) {
                    instructions[checkedIndexIn(instructions, entry)] = copyCaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, " "));
                }
                else {
                    instructions[checkedIndexIn(instructions, entry)] = copyCaptureInstruction(makeCaptureStep(vmSplit, begin, task.exit, 0, " "));
                }
                let exit: number = next;
                if (node.unbounded && count === node.lower) {
                    exit = checkedIndex(entry);
                }
                pushStruct(tasks, { node: node.left, entry: inner, exit: exit }, copyCaptureBuildTask);
                entry = checkedIndex(next);
                count = checkedAdd(count, 1);
            }
            instructions[checkedIndexIn(instructions, entry)] = copyCaptureInstruction(makeCaptureStep(vmJump, task.exit, 0, 0, " "));
        }
        else {
            const begin: number = instructions.length;
            instructions[checkedIndexIn(instructions, task.entry)] = copyCaptureInstruction(makeCaptureStep(vmJump, begin, 0, 0, " "));
            pushStruct(instructions, makeCaptureStep(node.operation, 0, 0, node.group, node.atom), copyCaptureInstruction);
            pushStruct(instructions, makeCaptureStep(vmJump, task.exit, 0, 0, " "), copyCaptureInstruction);
        }
    }
    if (instructions.length > maxCaptureInstructions) {
        prefilter = checkedBool(false);
        if (regular) {
            limited = checkedBool(true);
            valid = checkedBool(false);
        }
    }
    return { valid: valid, limited: limited, nodes: nodes, root: root, references: references, minimums: minimums, maximums: maximums, firstLiterals: firstLiterals, lastLiterals: lastLiterals, interpreted: interpreted, regular: regular, prefilter: prefilter, instructions: instructions, classMembers: classMembers, caseMode: caseMode, newlineMode: newlineMode, shortest: shortest, captures: groups, backreferences: backreferences, caseSensitive: caseSensitive, dotCrossesNewline: dotCrossesNewline, lineAnchors: lineAnchors };
}
function makeCaptureDissectFrame(node: number, begin: number, end: number, capture: number, prefix: boolean): CaptureDissectFrame {
    node = checkedIndex(node);
    begin = checkedIndex(begin);
    end = checkedIndex(end);
    capture = checkedIndex(capture);
    prefix = checkedBool(prefix);
    return { node: node, begin: begin, end: end, capture: capture, phase: dissectEnter, cursor: 0, path: 0, prefix: prefix };
}
function captureRepeatEndpoint(begin: number, end: number, minimum: number, maximum: number, shortest: boolean): number {
    begin = checkedIndex(begin);
    end = checkedIndex(end);
    minimum = checkedIndex(minimum);
    maximum = checkedIndex(maximum);
    shortest = checkedBool(shortest);
    let width: number = maximum;
    if (shortest) {
        width = checkedIndex(minimum);
    }
    if (width > checkedSubtract(end, begin)) {
        width = checkedIndex(checkedSubtract(end, begin));
    }
    return checkedAdd(begin, width);
}
function captureBoundaryMatches(expected: number, actual: string, caseSensitive: boolean): boolean {
    expected = checkedIndex(expected);
    actual = checkedChar(actual);
    caseSensitive = checkedBool(caseSensitive);
    if (expected === 0) {
        return true;
    }
    let actualCode: number = checkedAdd((checkedIndex((checkedChar(actual).codePointAt(0)!))), 1);
    let expectedCode: number = expected;
    if (caseSensitive === false) {
        if (actualCode >= 66 && actualCode <= 91) {
            actualCode = checkedAdd(actualCode, 32);
        }
        if (expectedCode >= 66 && expectedCode <= 91) {
            expectedCode = checkedAdd(expectedCode, 32);
        }
    }
    return actualCode === expectedCode;
}
function executeCaptureTree(program: CompiledRegex, subject: string, from: number, exactEnd: number, exactMatch: boolean, caseSensitive: boolean, dotCrossesNewline: boolean, lineAnchors: boolean, counting: boolean, capturing: boolean, collecting: boolean, startWork: number, batch: MatchSpan[], batchMode: boolean): CaptureRunResult {
    subject = checkedString(subject);
    from = checkedIndex(from);
    exactEnd = checkedIndex(exactEnd);
    exactMatch = checkedBool(exactMatch);
    caseSensitive = checkedBool(caseSensitive);
    dotCrossesNewline = checkedBool(dotCrossesNewline);
    lineAnchors = checkedBool(lineAnchors);
    counting = checkedBool(counting);
    capturing = checkedBool(capturing);
    collecting = checkedBool(collecting);
    startWork = checkedIndex(startWork);
    batch = checkedStructs(batch, copyMatchSpan);
    batchMode = checkedBool(batchMode);
    let count: number = 0;
    let allGroups: CaptureSpan[] = [];
    let matches: MatchSpan[] = [];
    const haystack: string[] = Array.from(subject);
    let width: number = 0;
    if (program.backreferences || capturing) {
        width = checkedIndex(checkedAdd(program.captures, 1));
    }
    let work: number = startWork;
    let start: number = from;
    let batchIndex: number = 0;
    if (batchMode) {
        if (batch.length === 0) {
            return completeSearchResult(count, allGroups, matches, work);
        }
        start = checkedIndex(indexStruct(batch, checkedIndex(0), copyMatchSpan).start);
    }
    while (start <= haystack.length) {
        let nextStart: number = checkedAdd(start, 1);
        if (indexNumber(program.minimums, checkedIndex(program.root)) > checkedSubtract(haystack.length, start)) {
            if (batchMode) {
                return captureTreeResult(2, 0, work);
            }
            return completeSearchResult(count, allGroups, matches, work);
        }
        let minimumEnd: number = checkedAdd(start, indexNumber(program.minimums, checkedIndex(program.root)));
        let maximumEnd: number = haystack.length;
        if (indexNumber(program.maximums, checkedIndex(program.root)) < checkedSubtract(haystack.length, start)) {
            maximumEnd = checkedIndex(checkedAdd(start, indexNumber(program.maximums, checkedIndex(program.root))));
        }
        if (exactMatch) {
            minimumEnd = checkedIndex(exactEnd);
            maximumEnd = checkedIndex(exactEnd);
        }
        if (batchMode) {
            minimumEnd = checkedIndex(indexStruct(batch, checkedIndex(batchIndex), copyMatchSpan).end);
            maximumEnd = checkedIndex(minimumEnd);
        }
        let matchEnd: number = maximumEnd;
        if (program.shortest) {
            matchEnd = checkedIndex(minimumEnd);
        }
        let searching: boolean = true;
        let foundMatch: boolean = false;
        while (searching) {
            let captures: CaptureRegister[] = [];
            let group: number = 0;
            while (group < width) {
                pushStruct(captures, { start: 0, end: 0, status: 0 }, copyCaptureRegister);
                group = checkedAdd(group, 1);
            }
            let frames: CaptureDissectFrame[] = [];
            pushStruct(frames, makeCaptureDissectFrame(program.root, start, matchEnd, 0, false), copyCaptureDissectFrame);
            let paths: CaptureRepeatPath[] = [];
            pushStruct(paths, { begin: 0, cursor: 0, capture: 0, count: 0, previous: 0 }, copyCaptureRepeatPath);
            let depth: number = 1;
            let success: boolean = false;
            let returned: number = 0;
            while (depth > 0) {
                if (work === maxCaptureWork) {
                    return captureTreeResult(2, 0, work);
                }
                work = checkedAdd(work, 1);
                const frame: CaptureDissectFrame = copyCaptureDissectFrame(indexStruct(frames, checkedIndex(checkedSubtract(depth, 1)), copyCaptureDissectFrame));
                const node: CaptureNode = copyCaptureNode(indexStruct(program.nodes, checkedIndex(frame.node), copyCaptureNode));
                let phase: number = frame.phase;
                let cursor: number = frame.cursor;
                let path: number = frame.path;
                let complete: boolean = false;
                let child: boolean = false;
                let childNode: number = node.left;
                let childBegin: number = frame.begin;
                let childEnd: number = frame.end;
                let childCapture: number = frame.capture;
                let childPrefix: boolean = false;
                let clear: boolean = false;
                let advance: boolean = false;
                let lower: number = node.lower;
                let upper: number = node.upper;
                if (frame.prefix) {
                    lower = checkedIndex(checkedSubtract(lower, 1));
                    if (node.unbounded === false) {
                        upper = checkedIndex(checkedSubtract(upper, 1));
                    }
                    if (frame.begin === frame.end && lower > 1) {
                        lower = checkedIndex(1);
                        upper = checkedIndex(1);
                    }
                }
                const repeatedReference: boolean = node.operation === nodeRepeat && indexStruct(program.nodes, checkedIndex(node.left), copyCaptureNode).operation === vmBackref && (node.unbounded || upper > 0);
                const childShortest: boolean = indexStruct(program.nodes, checkedIndex(node.left), copyCaptureNode).preference === 2;
                let minimum: number = indexNumber(program.minimums, checkedIndex(frame.node));
                let maximum: number = indexNumber(program.maximums, checkedIndex(frame.node));
                if (frame.prefix) {
                    minimum = checkedIndex(captureWidthRepeat(indexNumber(program.minimums, checkedIndex(node.left)), lower));
                    maximum = checkedIndex(captureWidthRepeat(indexNumber(program.maximums, checkedIndex(node.left)), upper));
                    if (node.unbounded && indexNumber(program.maximums, checkedIndex(node.left)) > 0) {
                        maximum = checkedIndex(maxCaptureWork);
                    }
                }
                if (phase === dissectEnter && (checkedSubtract(frame.end, frame.begin) < minimum || checkedSubtract(frame.end, frame.begin) > maximum)) {
                    success = checkedBool(false);
                    complete = checkedBool(true);
                }
                else if (phase === dissectEnter) {
                    success = checkedBool(false);
                    returned = checkedIndex(frame.capture);
                    if (node.operation === nodeSequence) {
                        const span: number = checkedSubtract(frame.end, frame.begin);
                        const leftMinimum: number = indexNumber(program.minimums, checkedIndex(node.left));
                        const rightMinimum: number = indexNumber(program.minimums, checkedIndex(node.right));
                        if (leftMinimum > span || rightMinimum > span) {
                            complete = checkedBool(true);
                        }
                        else {
                            let lower: number = checkedAdd(frame.begin, leftMinimum);
                            if (indexNumber(program.maximums, checkedIndex(node.right)) < span && checkedSubtract(frame.end, indexNumber(program.maximums, checkedIndex(node.right))) > lower) {
                                lower = checkedIndex(checkedSubtract(frame.end, indexNumber(program.maximums, checkedIndex(node.right))));
                            }
                            let upper: number = checkedSubtract(frame.end, rightMinimum);
                            if (indexNumber(program.maximums, checkedIndex(node.left)) < span && checkedAdd(frame.begin, indexNumber(program.maximums, checkedIndex(node.left))) < upper) {
                                upper = checkedIndex(checkedAdd(frame.begin, indexNumber(program.maximums, checkedIndex(node.left))));
                            }
                            if (lower > upper) {
                                complete = checkedBool(true);
                            }
                            else {
                                cursor = checkedIndex(upper);
                                if (childShortest) {
                                    cursor = checkedIndex(lower);
                                }
                                phase = checkedIndex(dissectLeft);
                                let possible: boolean = true;
                                if (cursor > frame.begin && captureBoundaryMatches(indexNumber(program.lastLiterals, checkedIndex(node.left)), indexChar(haystack, checkedIndex(checkedSubtract(cursor, 1))), caseSensitive) === false) {
                                    possible = checkedBool(false);
                                }
                                if (cursor < frame.end && captureBoundaryMatches(indexNumber(program.firstLiterals, checkedIndex(node.right)), indexChar(haystack, checkedIndex(cursor)), caseSensitive) === false) {
                                    possible = checkedBool(false);
                                }
                                if (possible === false) {
                                    advance = checkedBool(true);
                                }
                                else {
                                    child = checkedBool(true);
                                    childEnd = checkedIndex(cursor);
                                }
                            }
                        }
                    }
                    else if (node.operation === nodeAlternative) {
                        child = checkedBool(true);
                        phase = checkedIndex(dissectAlternative);
                    }
                    else if (node.operation === nodeGroup) {
                        child = checkedBool(true);
                        clear = checkedBool(true);
                        phase = checkedIndex(dissectGroup);
                    }
                    else if (node.operation >= nodeLookahead && node.operation <= nodeNotLookbehind) {
                        if (!(frame.begin === frame.end)) {
                            complete = checkedBool(true);
                        }
                        else {
                            let available: number = checkedSubtract(haystack.length, frame.begin);
                            if (node.operation >= nodeLookbehind) {
                                available = checkedIndex(frame.begin);
                            }
                            const minimumWidth: number = indexNumber(program.minimums, checkedIndex(node.left));
                            let maximumWidth: number = indexNumber(program.maximums, checkedIndex(node.left));
                            if (maximumWidth > available) {
                                maximumWidth = checkedIndex(available);
                            }
                            if (minimumWidth > available) {
                                success = checkedBool(node.operation === nodeNotLookahead || node.operation === nodeNotLookbehind);
                                complete = checkedBool(true);
                            }
                            else {
                                cursor = checkedIndex(checkedAdd(frame.begin, minimumWidth));
                                childEnd = checkedIndex(cursor);
                                if (node.operation >= nodeLookbehind) {
                                    cursor = checkedIndex(checkedSubtract(frame.begin, maximumWidth));
                                    childBegin = checkedIndex(cursor);
                                    childEnd = checkedIndex(frame.begin);
                                }
                                child = checkedBool(true);
                                phase = checkedIndex(dissectAssertion);
                            }
                        }
                    }
                    else if (node.operation === nodeRepeat && repeatedReference === false) {
                        if (frame.prefix === false && lower > 0 && indexNumber(program.references, checkedIndex(node.left)) === 0) {
                            cursor = checkedIndex(frame.end);
                            if (node.preference === 2) {
                                cursor = checkedIndex(frame.begin);
                            }
                            child = checkedBool(true);
                            childNode = checkedIndex(frame.node);
                            childPrefix = checkedBool(true);
                            childEnd = checkedIndex(cursor);
                            phase = checkedIndex(dissectPrefix);
                        }
                        else if (upper === 0 && node.unbounded === false) {
                            success = checkedBool(frame.begin === frame.end);
                            complete = checkedBool(true);
                        }
                        else if (childShortest && lower === 0 && frame.begin === frame.end) {
                            success = checkedBool(true);
                            complete = checkedBool(true);
                        }
                        else {
                            const endpoint: number = captureRepeatEndpoint(frame.begin, frame.end, indexNumber(program.minimums, checkedIndex(node.left)), indexNumber(program.maximums, checkedIndex(node.left)), childShortest);
                            path = checkedIndex(paths.length);
                            pushStruct(paths, { begin: frame.begin, cursor: endpoint, capture: frame.capture, count: 0, previous: 0 }, copyCaptureRepeatPath);
                            phase = checkedIndex(dissectIteration);
                        }
                    }
                    else {
                        let matched: boolean = false;
                        let end: number = frame.begin;
                        if (node.operation === nodeEmpty) {
                            matched = checkedBool(true);
                        }
                        else if (captureAssertion(node.operation)) {
                            const before: boolean = end > 0 && zeroWidthWord(indexChar(haystack, checkedIndex(checkedSubtract(end, 1))));
                            const after: boolean = end < haystack.length && zeroWidthWord(indexChar(haystack, checkedIndex(end)));
                            const previousNewline: boolean = end > 0 && indexChar(haystack, checkedIndex(checkedSubtract(end, 1))) === "\n";
                            const nextNewline: boolean = end < haystack.length && indexChar(haystack, checkedIndex(end)) === "\n";
                            matched = checkedBool(captureAssertionMatches(node.operation, end, haystack.length, before, after, previousNewline, nextNewline, lineAnchors));
                        }
                        else if (node.operation === vmBackref || repeatedReference) {
                            let reference: number = node.group;
                            let minimumRepeats: number = 1;
                            let maximumRepeats: number = 1;
                            let unboundedRepeats: boolean = false;
                            if (repeatedReference) {
                                reference = checkedIndex(indexStruct(program.nodes, checkedIndex(node.left), copyCaptureNode).group);
                                minimumRepeats = checkedIndex(lower);
                                maximumRepeats = checkedIndex(upper);
                                unboundedRepeats = checkedBool(node.unbounded);
                            }
                            const register: CaptureRegister = copyCaptureRegister(indexStruct(captures, checkedIndex(checkedAdd(frame.capture, reference)), copyCaptureRegister));
                            const length: number = checkedSubtract(register.end, register.start);
                            matched = checkedBool(register.status === 2);
                            if (length === 0) {
                                matched = checkedBool(matched && end === frame.end);
                            }
                            else {
                                let repeats: number = 0;
                                while (matched && end < frame.end) {
                                    matched = checkedBool(length <= checkedSubtract(frame.end, end) && (unboundedRepeats || repeats < maximumRepeats));
                                    let offset: number = 0;
                                    while (matched && offset < length) {
                                        if (work === maxCaptureWork) {
                                            return captureTreeResult(2, 0, work);
                                        }
                                        work = checkedAdd(work, 1);
                                        const actual: string = indexChar(haystack, checkedIndex(checkedAdd(end, offset)));
                                        const expected: string = indexChar(haystack, checkedIndex(checkedAdd(register.start, offset)));
                                        matched = checkedBool(actual === expected || (caseSensitive === false && asciiLowercase(actual) === asciiLowercase(expected)));
                                        offset = checkedAdd(offset, 1);
                                    }
                                    if (matched) {
                                        end = checkedAdd(end, length);
                                        repeats = checkedAdd(repeats, 1);
                                    }
                                }
                                matched = checkedBool(matched && repeats >= minimumRepeats);
                            }
                        }
                        else if (node.operation === vmClass) {
                            if (end < haystack.length) {
                                let classPosition: number = node.group;
                                let included: boolean = false;
                                while (indexStruct(program.classMembers, checkedIndex(classPosition), copyCaptureClassMember).kind > 0) {
                                    if (work === maxCaptureWork) {
                                        return captureTreeResult(2, 0, work);
                                    }
                                    work = checkedAdd(work, 1);
                                    if (captureClassMemberMatches(indexStruct(program.classMembers, checkedIndex(classPosition), copyCaptureClassMember), indexChar(haystack, checkedIndex(end)), caseSensitive)) {
                                        included = checkedBool(true);
                                    }
                                    classPosition = checkedAdd(classPosition, 1);
                                }
                                const negated: boolean = node.atom === "^";
                                matched = checkedBool(!(included === negated) && (negated === false || dotCrossesNewline || !(indexChar(haystack, checkedIndex(end)) === "\n")));
                                if (matched) {
                                    end = checkedAdd(end, 1);
                                }
                            }
                        }
                        else if (end < haystack.length) {
                            const actual: string = indexChar(haystack, checkedIndex(end));
                            let numericLower: number = node.group;
                            if (numericLower >= 65 && numericLower <= 90) {
                                numericLower = checkedAdd(numericLower, 32);
                            }
                            matched = checkedBool((node.operation === vmAny && (dotCrossesNewline || !(actual === "\n"))) || (node.operation === vmWord && zeroWidthWord(actual)) || (node.operation === vmNumeric && ((checkedIndex((checkedChar(actual).codePointAt(0)!))) === node.group || (caseSensitive === false && (checkedIndex((checkedChar(asciiLowercase(actual)).codePointAt(0)!))) === numericLower))) || (node.operation === vmLiteral && (actual === node.atom || (caseSensitive === false && asciiLowercase(actual) === asciiLowercase(node.atom)))));
                            if (matched) {
                                end = checkedAdd(end, 1);
                            }
                        }
                        success = checkedBool(matched && end === frame.end);
                        complete = checkedBool(true);
                    }
                }
                else if (phase === dissectLeft || phase === dissectPrefix) {
                    if (success) {
                        child = checkedBool(true);
                        childBegin = checkedIndex(cursor);
                        childCapture = checkedIndex(returned);
                        childNode = checkedIndex(node.right);
                        phase = checkedIndex(dissectRight);
                        if (node.operation === nodeRepeat) {
                            childNode = checkedIndex(node.left);
                            phase = checkedIndex(dissectLastRepeat);
                            clear = checkedBool(true);
                        }
                    }
                    else {
                        advance = checkedBool(true);
                    }
                }
                else if (phase === dissectRight || phase === dissectLastRepeat) {
                    if (success) {
                        complete = checkedBool(true);
                    }
                    else {
                        advance = checkedBool(true);
                    }
                }
                else if (phase === dissectGroup) {
                    if (success && width > 0 && node.group > 0) {
                        const snapshot: number = captures.length;
                        group = checkedIndex(0);
                        while (group < width) {
                            if (work === maxCaptureWork) {
                                return captureTreeResult(2, 0, work);
                            }
                            work = checkedAdd(work, 1);
                            if (group === node.group) {
                                pushStruct(captures, { start: frame.begin, end: frame.end, status: 2 }, copyCaptureRegister);
                            }
                            else {
                                pushStruct(captures, indexStruct(captures, checkedIndex(checkedAdd(returned, group)), copyCaptureRegister), copyCaptureRegister);
                            }
                            group = checkedAdd(group, 1);
                        }
                        returned = checkedIndex(snapshot);
                    }
                    complete = checkedBool(true);
                }
                else if (phase === dissectAlternative) {
                    if (success) {
                        complete = checkedBool(true);
                    }
                    else {
                        child = checkedBool(true);
                        childNode = checkedIndex(node.right);
                        phase = checkedIndex(dissectLastAlternative);
                    }
                }
                else if (phase === dissectLastAlternative) {
                    complete = checkedBool(true);
                }
                else if (phase === dissectAssertion) {
                    if (success) {
                        success = checkedBool(node.operation === nodeLookahead || node.operation === nodeLookbehind);
                        returned = checkedIndex(frame.capture);
                        complete = checkedBool(true);
                    }
                    else {
                        let limit: number = haystack.length;
                        if (node.operation >= nodeLookbehind) {
                            limit = checkedIndex(checkedSubtract(frame.begin, indexNumber(program.minimums, checkedIndex(node.left))));
                        }
                        else if (indexNumber(program.maximums, checkedIndex(node.left)) < checkedSubtract(haystack.length, frame.begin)) {
                            limit = checkedIndex(checkedAdd(frame.begin, indexNumber(program.maximums, checkedIndex(node.left))));
                        }
                        if (cursor === limit) {
                            success = checkedBool(node.operation === nodeNotLookahead || node.operation === nodeNotLookbehind);
                            returned = checkedIndex(frame.capture);
                            complete = checkedBool(true);
                        }
                        else {
                            cursor = checkedAdd(cursor, 1);
                            child = checkedBool(true);
                            if (node.operation >= nodeLookbehind) {
                                childBegin = checkedIndex(cursor);
                                childEnd = checkedIndex(frame.begin);
                            }
                            else {
                                childEnd = checkedIndex(cursor);
                            }
                        }
                    }
                }
                else if (phase === dissectIteration) {
                    const current: CaptureRepeatPath = copyCaptureRepeatPath(indexStruct(paths, checkedIndex(path), copyCaptureRepeatPath));
                    const count: number = checkedAdd(current.count, 1);
                    let minimum: number = lower;
                    if (minimum === 0) {
                        minimum = checkedIndex(1);
                    }
                    let maximum: number = checkedSubtract(frame.end, frame.begin);
                    if (node.unbounded === false && upper < maximum) {
                        maximum = checkedIndex(upper);
                    }
                    if (maximum < minimum) {
                        maximum = checkedIndex(minimum);
                    }
                    if ((current.cursor === current.begin && !(current.cursor === frame.end) && (count >= minimum || checkedSubtract(minimum, count) < checkedSubtract(frame.end, current.cursor))) || (count === maximum && !(current.cursor === frame.end)) || (current.cursor === frame.end && count < minimum)) {
                        phase = checkedIndex(dissectIterationAdvance);
                    }
                    else {
                        child = checkedBool(true);
                        childBegin = checkedIndex(current.begin);
                        childEnd = checkedIndex(current.cursor);
                        childCapture = checkedIndex(current.capture);
                        clear = checkedBool(true);
                        phase = checkedIndex(dissectIterationResult);
                    }
                }
                else if (phase === dissectIterationResult) {
                    const current: CaptureRepeatPath = copyCaptureRepeatPath(indexStruct(paths, checkedIndex(path), copyCaptureRepeatPath));
                    if (success && current.cursor === frame.end) {
                        complete = checkedBool(true);
                    }
                    else if (success) {
                        const endpoint: number = captureRepeatEndpoint(current.cursor, frame.end, indexNumber(program.minimums, checkedIndex(node.left)), indexNumber(program.maximums, checkedIndex(node.left)), childShortest);
                        const previous: number = path;
                        path = checkedIndex(paths.length);
                        pushStruct(paths, { begin: current.cursor, cursor: endpoint, capture: returned, count: checkedAdd(current.count, 1), previous: previous }, copyCaptureRepeatPath);
                        phase = checkedIndex(dissectIteration);
                    }
                    else {
                        phase = checkedIndex(dissectIterationAdvance);
                    }
                }
                else if (phase === dissectIterationAdvance) {
                    const current: CaptureRepeatPath = copyCaptureRepeatPath(indexStruct(paths, checkedIndex(path), copyCaptureRepeatPath));
                    let endpoint: number = current.cursor;
                    const limit: number = captureRepeatEndpoint(current.begin, frame.end, indexNumber(program.minimums, checkedIndex(node.left)), indexNumber(program.maximums, checkedIndex(node.left)), childShortest === false);
                    if (endpoint === limit) {
                        path = checkedIndex(current.previous);
                        if (path === 0) {
                            success = checkedBool(lower === 0 && frame.begin === frame.end);
                            returned = checkedIndex(frame.capture);
                            complete = checkedBool(true);
                        }
                    }
                    else {
                        if (childShortest) {
                            endpoint = checkedAdd(endpoint, 1);
                        }
                        else {
                            endpoint = checkedIndex(checkedSubtract(endpoint, 1));
                        }
                        paths[checkedIndexIn(paths, path)] = copyCaptureRepeatPath({ begin: current.begin, cursor: endpoint, capture: current.capture, count: current.count, previous: current.previous });
                        phase = checkedIndex(dissectIteration);
                    }
                }
                if (advance) {
                    let ascending: boolean = childShortest;
                    if (node.operation === nodeRepeat) {
                        ascending = checkedBool(node.preference === 2);
                    }
                    let lower: number = frame.begin;
                    let upper: number = frame.end;
                    if (node.operation === nodeSequence) {
                        lower = checkedAdd(lower, indexNumber(program.minimums, checkedIndex(node.left)));
                        if (indexNumber(program.maximums, checkedIndex(node.right)) < checkedSubtract(frame.end, frame.begin) && checkedSubtract(frame.end, indexNumber(program.maximums, checkedIndex(node.right))) > lower) {
                            lower = checkedIndex(checkedSubtract(frame.end, indexNumber(program.maximums, checkedIndex(node.right))));
                        }
                        upper = checkedIndex(checkedSubtract(frame.end, indexNumber(program.minimums, checkedIndex(node.right))));
                        if (indexNumber(program.maximums, checkedIndex(node.left)) < checkedSubtract(frame.end, frame.begin) && checkedAdd(frame.begin, indexNumber(program.maximums, checkedIndex(node.left))) < upper) {
                            upper = checkedIndex(checkedAdd(frame.begin, indexNumber(program.maximums, checkedIndex(node.left))));
                        }
                    }
                    let choosing: boolean = true;
                    while (choosing) {
                        if ((ascending && cursor === upper) || (ascending === false && cursor === lower)) {
                            success = checkedBool(false);
                            complete = checkedBool(true);
                            choosing = checkedBool(false);
                        }
                        else {
                            if (work === maxCaptureWork) {
                                return captureTreeResult(2, 0, work);
                            }
                            work = checkedAdd(work, 1);
                            if (ascending) {
                                cursor = checkedAdd(cursor, 1);
                            }
                            else {
                                cursor = checkedIndex(checkedSubtract(cursor, 1));
                            }
                            let possible: boolean = true;
                            if (node.operation === nodeSequence) {
                                if (cursor > frame.begin && captureBoundaryMatches(indexNumber(program.lastLiterals, checkedIndex(node.left)), indexChar(haystack, checkedIndex(checkedSubtract(cursor, 1))), caseSensitive) === false) {
                                    possible = checkedBool(false);
                                }
                                if (cursor < frame.end && captureBoundaryMatches(indexNumber(program.firstLiterals, checkedIndex(node.right)), indexChar(haystack, checkedIndex(cursor)), caseSensitive) === false) {
                                    possible = checkedBool(false);
                                }
                            }
                            if (possible) {
                                child = checkedBool(true);
                                childEnd = checkedIndex(cursor);
                                phase = checkedIndex(dissectLeft);
                                if (node.operation === nodeRepeat) {
                                    childNode = checkedIndex(frame.node);
                                    childPrefix = checkedBool(true);
                                    phase = checkedIndex(dissectPrefix);
                                }
                                choosing = checkedBool(false);
                            }
                        }
                    }
                }
                if (complete) {
                    depth = checkedIndex(checkedSubtract(depth, 1));
                }
                else {
                    frames[checkedIndexIn(frames, checkedSubtract(depth, 1))] = copyCaptureDissectFrame({ node: frame.node, begin: frame.begin, end: frame.end, capture: frame.capture, phase: phase, cursor: cursor, path: path, prefix: frame.prefix });
                    if (child) {
                        if (clear && width > 0) {
                            const snapshot: number = captures.length;
                            group = checkedIndex(0);
                            while (group < width) {
                                if (work === maxCaptureWork) {
                                    return captureTreeResult(2, 0, work);
                                }
                                work = checkedAdd(work, 1);
                                if (group >= node.first && group <= node.last) {
                                    pushStruct(captures, { start: 0, end: 0, status: 0 }, copyCaptureRegister);
                                }
                                else {
                                    pushStruct(captures, indexStruct(captures, checkedIndex(checkedAdd(childCapture, group)), copyCaptureRegister), copyCaptureRegister);
                                }
                                group = checkedAdd(group, 1);
                            }
                            childCapture = checkedIndex(snapshot);
                        }
                        const next: CaptureDissectFrame = copyCaptureDissectFrame(makeCaptureDissectFrame(childNode, childBegin, childEnd, childCapture, childPrefix));
                        if (depth === frames.length) {
                            pushStruct(frames, next, copyCaptureDissectFrame);
                        }
                        else {
                            frames[checkedIndexIn(frames, depth)] = copyCaptureDissectFrame(next);
                        }
                        depth = checkedAdd(depth, 1);
                    }
                }
            }
            if (success) {
                foundMatch = checkedBool(true);
                if (capturing) {
                    let groups: CaptureSpan[] = [];
                    pushStruct(groups, { matched: true, start: start, end: matchEnd }, copyCaptureSpan);
                    group = checkedIndex(1);
                    while (group < width) {
                        if (work === maxCaptureWork) {
                            return captureTreeResult(2, 0, work);
                        }
                        work = checkedAdd(work, 1);
                        const register: CaptureRegister = copyCaptureRegister(indexStruct(captures, checkedIndex(checkedAdd(returned, group)), copyCaptureRegister));
                        pushStruct(groups, { matched: register.status === 2, start: register.start, end: register.end }, copyCaptureSpan);
                        group = checkedAdd(group, 1);
                    }
                    if (counting === false) {
                        return { kind: 0, start: start, end: matchEnd, count: 1, groups: groups, matches: matches, groupWidth: 0, work: work };
                    }
                    let groupIndex: number = 0;
                    while (groupIndex < groups.length) {
                        if (work === maxCaptureWork) {
                            return captureTreeResult(2, 0, work);
                        }
                        work = checkedAdd(work, 1);
                        pushStruct(allGroups, indexStruct(groups, checkedIndex(groupIndex), copyCaptureSpan), copyCaptureSpan);
                        groupIndex = checkedAdd(groupIndex, 1);
                    }
                }
                if (counting === false) {
                    return makeCaptureRunResult(0, start, matchEnd, 1);
                }
                count = checkedAdd(count, 1);
                if (collecting && capturing === false) {
                    pushStruct(matches, { start: start, end: matchEnd }, copyMatchSpan);
                }
                nextStart = checkedIndex(matchEnd);
                if (matchEnd === start) {
                    if (matchEnd === haystack.length) {
                        return completeSearchResult(count, allGroups, matches, work);
                    }
                    nextStart = checkedAdd(nextStart, 1);
                }
                break;
            }
            if (program.shortest) {
                if (matchEnd === maximumEnd) {
                    searching = checkedBool(false);
                }
                else {
                    matchEnd = checkedAdd(matchEnd, 1);
                }
            }
            else if (matchEnd === minimumEnd) {
                searching = checkedBool(false);
            }
            else {
                matchEnd = checkedIndex(checkedSubtract(matchEnd, 1));
            }
        }
        if (exactMatch) {
            return captureTreeResult(2, 0, work);
        }
        if (batchMode) {
            if (foundMatch === false) {
                return captureTreeResult(2, 0, work);
            }
            batchIndex = checkedAdd(batchIndex, 1);
            if (batchIndex === batch.length) {
                return completeSearchResult(count, allGroups, matches, work);
            }
            start = checkedIndex(indexStruct(batch, checkedIndex(batchIndex), copyMatchSpan).start);
        }
        else {
            start = checkedIndex(nextStart);
        }
    }
    return completeSearchResult(count, allGroups, matches, work);
}
function executeCaptureTreeSearch(program: CompiledRegex, subject: string, from: number, exactEnd: number, exactMatch: boolean, caseSensitive: boolean, dotCrossesNewline: boolean, lineAnchors: boolean, counting: boolean, capturing: boolean, collecting: boolean, startWork: number): CaptureRunResult {
    subject = checkedString(subject);
    from = checkedIndex(from);
    exactEnd = checkedIndex(exactEnd);
    exactMatch = checkedBool(exactMatch);
    caseSensitive = checkedBool(caseSensitive);
    dotCrossesNewline = checkedBool(dotCrossesNewline);
    lineAnchors = checkedBool(lineAnchors);
    counting = checkedBool(counting);
    capturing = checkedBool(capturing);
    collecting = checkedBool(collecting);
    startWork = checkedIndex(startWork);
    const batch: MatchSpan[] = [];
    return executeCaptureTree(program, subject, from, exactEnd, exactMatch, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, startWork, batch, false);
}
function completeProgramSearch(program: CompiledRegex, subject: string, caseSensitive: boolean, dotCrossesNewline: boolean, lineAnchors: boolean, count: number, matches: MatchSpan[], work: number, captureAll: boolean): CaptureRunResult {
    subject = checkedString(subject);
    caseSensitive = checkedBool(caseSensitive);
    dotCrossesNewline = checkedBool(dotCrossesNewline);
    lineAnchors = checkedBool(lineAnchors);
    count = checkedIndex(count);
    matches = checkedStructs(matches, copyMatchSpan);
    work = checkedIndex(work);
    captureAll = checkedBool(captureAll);
    if (captureAll) {
        return executeCaptureTree(program, subject, 0, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, true, true, true, work, matches, true);
    }
    const groups: CaptureSpan[] = [];
    return completeSearchResult(count, groups, matches, work);
}
function executeCaptureProgram(program: CompiledRegex, subject: string, from: number, caseSensitive: boolean, dotCrossesNewline: boolean, lineAnchors: boolean, counting: boolean, capturing: boolean, collecting: boolean): CaptureRunResult {
    subject = checkedString(subject);
    from = checkedIndex(from);
    caseSensitive = checkedBool(caseSensitive);
    dotCrossesNewline = checkedBool(dotCrossesNewline);
    lineAnchors = checkedBool(lineAnchors);
    counting = checkedBool(counting);
    capturing = checkedBool(capturing);
    collecting = checkedBool(collecting);
    if (program.caseMode === "i") {
        caseSensitive = checkedBool(false);
    }
    else if (program.caseMode === "c") {
        caseSensitive = checkedBool(true);
    }
    if (program.newlineMode === "m" || program.newlineMode === "n") {
        dotCrossesNewline = checkedBool(false);
        lineAnchors = checkedBool(true);
    }
    else if (program.newlineMode === "p") {
        dotCrossesNewline = checkedBool(false);
        lineAnchors = checkedBool(false);
    }
    else if (program.newlineMode === "w") {
        dotCrossesNewline = checkedBool(true);
        lineAnchors = checkedBool(true);
    }
    else if (program.newlineMode === "s") {
        dotCrossesNewline = checkedBool(true);
        lineAnchors = checkedBool(false);
    }
    if (program.interpreted && program.prefilter === false) {
        return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0);
    }
    let count: number = 0;
    let matches: MatchSpan[] = [];
    let work: number = 0;
    const projected: boolean = program.regular === false;
    const haystack: string[] = Array.from(subject);
    if (from > haystack.length) {
        return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting);
    }
    let seenEpochs: number[] = [];
    let seenStarts: number[] = [];
    let instructionIndex: number = 0;
    while (instructionIndex < program.instructions.length) {
        pushIndex(seenEpochs, 0);
        pushIndex(seenStarts, 0);
        instructionIndex = checkedAdd(instructionIndex, 1);
    }
    let searchFrom: number = from;
    let epoch: number = 0;
    while (searchFrom <= haystack.length) {
        let stack: PatternWorkState[] = [];
        let stackLen: number = 0;
        let next: PatternWorkState[] = [];
        let nextLen: number = 0;
        let found: boolean = false;
        let bestStart: number = searchFrom;
        let bestEnd: number = searchFrom;
        let position: number = searchFrom;
        while (position <= haystack.length) {
            epoch = checkedAdd(epoch, 1);
            if (found === false) {
                const seed: PatternWorkState = copyPatternWorkState({ pattern: 0, subject: position });
                if (stackLen === stack.length) {
                    pushStruct(stack, seed, copyPatternWorkState);
                }
                else {
                    stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(seed);
                }
                stackLen = checkedAdd(stackLen, 1);
            }
            while (stackLen > 0) {
                stackLen = checkedIndex(checkedSubtract(stackLen, 1));
                const state: PatternWorkState = copyPatternWorkState(indexStruct(stack, checkedIndex(stackLen), copyPatternWorkState));
                if (work === maxCaptureWork) {
                    if (projected) {
                        return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0);
                    }
                    return makeCaptureRunResult(2, 0, 0, 0);
                }
                work = checkedAdd(work, 1);
                const instruction: number = state.pattern;
                const start: number = state.subject;
                if (!(indexNumber(seenEpochs, checkedIndex(instruction)) === epoch) || indexNumber(seenStarts, checkedIndex(instruction)) > start) {
                    seenEpochs[checkedIndexIn(seenEpochs, instruction)] = checkedIndex(epoch);
                    seenStarts[checkedIndexIn(seenStarts, instruction)] = checkedIndex(start);
                    const step: CaptureInstruction = copyCaptureInstruction(indexStruct(program.instructions, checkedIndex(instruction), copyCaptureInstruction));
                    if (step.operation === vmAccept) {
                        if (projected) {
                            return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0);
                        }
                        if (found === false || start < bestStart || (start === bestStart && ((program.shortest && position < bestEnd) || (program.shortest === false && position > bestEnd)))) {
                            found = checkedBool(true);
                            bestStart = checkedIndex(start);
                            bestEnd = checkedIndex(position);
                        }
                    }
                    else if (projected && (step.operation === vmBackref || (step.operation >= nodeLookahead && step.operation <= nodeNotLookbehind))) {
                        const resumed: PatternWorkState = copyPatternWorkState({ pattern: checkedAdd(instruction, 1), subject: start });
                        if (stackLen === stack.length) {
                            pushStruct(stack, resumed, copyPatternWorkState);
                        }
                        else {
                            stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(resumed);
                        }
                        stackLen = checkedAdd(stackLen, 1);
                        if (step.operation === vmBackref && position < haystack.length) {
                            if (nextLen === next.length) {
                                pushStruct(next, state, copyPatternWorkState);
                            }
                            else {
                                next[checkedIndexIn(next, nextLen)] = copyPatternWorkState(state);
                            }
                            nextLen = checkedAdd(nextLen, 1);
                        }
                    }
                    else if (captureAssertion(step.operation)) {
                        const before: boolean = position > 0 && zeroWidthWord(indexChar(haystack, checkedIndex(checkedSubtract(position, 1))));
                        const after: boolean = position < haystack.length && zeroWidthWord(indexChar(haystack, checkedIndex(position)));
                        const previousNewline: boolean = position > 0 && indexChar(haystack, checkedIndex(checkedSubtract(position, 1))) === "\n";
                        const nextNewline: boolean = position < haystack.length && indexChar(haystack, checkedIndex(position)) === "\n";
                        if (captureAssertionMatches(step.operation, position, haystack.length, before, after, previousNewline, nextNewline, lineAnchors)) {
                            const resumed: PatternWorkState = copyPatternWorkState({ pattern: checkedAdd(instruction, 1), subject: start });
                            if (stackLen === stack.length) {
                                pushStruct(stack, resumed, copyPatternWorkState);
                            }
                            else {
                                stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(resumed);
                            }
                            stackLen = checkedAdd(stackLen, 1);
                        }
                    }
                    else if (step.operation === vmSplit) {
                        const skipped: PatternWorkState = copyPatternWorkState({ pattern: step.alternate, subject: start });
                        if (stackLen === stack.length) {
                            pushStruct(stack, skipped, copyPatternWorkState);
                        }
                        else {
                            stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(skipped);
                        }
                        stackLen = checkedAdd(stackLen, 1);
                        const branch: PatternWorkState = copyPatternWorkState({ pattern: step.target, subject: start });
                        if (stackLen === stack.length) {
                            pushStruct(stack, branch, copyPatternWorkState);
                        }
                        else {
                            stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(branch);
                        }
                        stackLen = checkedAdd(stackLen, 1);
                    }
                    else if (step.operation === vmJump || step.operation === vmClear || step.operation === vmOpen || step.operation === vmClose) {
                        let target: number = checkedAdd(instruction, 1);
                        if (step.operation === vmJump) {
                            target = checkedIndex(step.target);
                        }
                        const resumed: PatternWorkState = copyPatternWorkState({ pattern: target, subject: start });
                        if (stackLen === stack.length) {
                            pushStruct(stack, resumed, copyPatternWorkState);
                        }
                        else {
                            stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(resumed);
                        }
                        stackLen = checkedAdd(stackLen, 1);
                    }
                    else if (step.operation === vmClass) {
                        if (position < haystack.length) {
                            let classPosition: number = step.group;
                            let included: boolean = false;
                            while (indexStruct(program.classMembers, checkedIndex(classPosition), copyCaptureClassMember).kind > 0) {
                                if (work === maxCaptureWork) {
                                    if (projected) {
                                        return executeCaptureTreeSearch(program, subject, from, 0, false, caseSensitive, dotCrossesNewline, lineAnchors, counting, capturing, collecting, 0);
                                    }
                                    return makeCaptureRunResult(2, 0, 0, 0);
                                }
                                work = checkedAdd(work, 1);
                                if (captureClassMemberMatches(indexStruct(program.classMembers, checkedIndex(classPosition), copyCaptureClassMember), indexChar(haystack, checkedIndex(position)), caseSensitive)) {
                                    included = checkedBool(true);
                                }
                                classPosition = checkedAdd(classPosition, 1);
                            }
                            const negated: boolean = step.atom === "^";
                            const matched: boolean = !(included === negated) && (negated === false || dotCrossesNewline || !(indexChar(haystack, checkedIndex(position)) === "\n"));
                            if (matched) {
                                const resumed: PatternWorkState = copyPatternWorkState({ pattern: checkedAdd(instruction, 1), subject: start });
                                if (nextLen === next.length) {
                                    pushStruct(next, resumed, copyPatternWorkState);
                                }
                                else {
                                    next[checkedIndexIn(next, nextLen)] = copyPatternWorkState(resumed);
                                }
                                nextLen = checkedAdd(nextLen, 1);
                            }
                        }
                    }
                    else if (position < haystack.length) {
                        const actual: string = indexChar(haystack, checkedIndex(position));
                        const codepoint: number = checkedChar(actual).codePointAt(0)!;
                        const lowercase: number = checkedChar(asciiLowercase(actual)).codePointAt(0)!;
                        const word: boolean = (codepoint >= 48 && codepoint <= 57) || (lowercase >= 97 && lowercase <= 122) || actual === "_";
                        let numericLower: number = step.group;
                        if (numericLower >= 65 && numericLower <= 90) {
                            numericLower = checkedAdd(numericLower, 32);
                        }
                        const matched: boolean = (step.operation === vmAny && (dotCrossesNewline || !(actual === "\n"))) || (step.operation === vmWord && word) || (step.operation === vmNumeric && (checkedIndex((checkedChar(actual).codePointAt(0)!)) === step.group || (caseSensitive === false && checkedIndex((checkedChar(asciiLowercase(actual)).codePointAt(0)!)) === numericLower))) || (step.operation === vmLiteral && (actual === step.atom || (caseSensitive === false && asciiLowercase(actual) === asciiLowercase(step.atom))));
                        if (matched) {
                            const resumed: PatternWorkState = copyPatternWorkState({ pattern: checkedAdd(instruction, 1), subject: start });
                            if (nextLen === next.length) {
                                pushStruct(next, resumed, copyPatternWorkState);
                            }
                            else {
                                next[checkedIndexIn(next, nextLen)] = copyPatternWorkState(resumed);
                            }
                            nextLen = checkedAdd(nextLen, 1);
                        }
                    }
                }
            }
            let keep: number = 0;
            let index: number = 0;
            while (index < nextLen) {
                const state: PatternWorkState = copyPatternWorkState(indexStruct(next, checkedIndex(index), copyPatternWorkState));
                if (found === false || state.subject < bestStart || (program.shortest === false && state.subject === bestStart)) {
                    next[checkedIndexIn(next, keep)] = copyPatternWorkState(state);
                    keep = checkedAdd(keep, 1);
                }
                index = checkedAdd(index, 1);
            }
            nextLen = checkedIndex(keep);
            if (found && nextLen === 0) {
                break;
            }
            if (position === haystack.length) {
                break;
            }
            position = checkedAdd(position, 1);
            stackLen = checkedIndex(0);
            index = checkedIndex(0);
            while (index < nextLen) {
                const state: PatternWorkState = copyPatternWorkState(indexStruct(next, checkedIndex(index), copyPatternWorkState));
                if (stackLen === stack.length) {
                    pushStruct(stack, state, copyPatternWorkState);
                }
                else {
                    stack[checkedIndexIn(stack, stackLen)] = copyPatternWorkState(state);
                }
                stackLen = checkedAdd(stackLen, 1);
                index = checkedAdd(index, 1);
            }
            nextLen = checkedIndex(0);
        }
        if (found) {
            if (counting === false) {
                if (capturing) {
                    return executeCaptureTreeSearch(program, subject, bestStart, bestEnd, true, caseSensitive, dotCrossesNewline, lineAnchors, false, true, false, work);
                }
                return makeCaptureRunResult(0, bestStart, bestEnd, 1);
            }
            count = checkedAdd(count, 1);
            if (collecting) {
                pushStruct(matches, { start: bestStart, end: bestEnd }, copyMatchSpan);
            }
            searchFrom = checkedIndex(bestEnd);
            if (bestEnd === bestStart) {
                if (bestEnd === haystack.length) {
                    return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting);
                }
                searchFrom = checkedAdd(searchFrom, 1);
            }
        }
        else {
            return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting);
        }
    }
    return completeProgramSearch(program, subject, caseSensitive, dotCrossesNewline, lineAnchors, count, matches, work, capturing && collecting);
}
function simpleLiteralChar(atom: string): boolean {
    atom = checkedChar(atom);
    return !(atom === "\\") && !(atom === ".") && !(atom === "^") && !(atom === "$") && !(atom === "*") && !(atom === "+") && !(atom === "?") && !(atom === "{") && !(atom === "}") && !(atom === "[") && !(atom === "]") && !(atom === "(") && !(atom === ")") && !(atom === "|");
}
