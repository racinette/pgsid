/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's erf and erfc, which keep fdlibm's rational approximations and use the
// Arm-derived exp in the tails; PostgreSQL calls them through derf and derfc.

/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's expm1, log1p, __expo2 and hyperbolic functions, which PostgreSQL calls
// through dsinh, dcosh, dtanh, dasinh, dacosh and datanh. musl sets no errno, so overflowing
// sinh and cosh return infinity rather than an error, as in PGlite.

/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's asin, acos, atan and atan2, which PostgreSQL calls through dasin,
// dacos, datan and datan2. Sign tests use the bit pattern so that negative zero keeps its sign.

// Portions Copyright (c) 1999-2025, PostgreSQL Global Development Group.

/*
PostgreSQL Database Management System
(also known as Postgres, formerly known as Postgres95)

Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group

Portions Copyright (c) 1994, The Regents of the University of California

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
*/

/*
PostgreSQL Database Management System
(also known as Postgres, formerly known as Postgres95)

Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group

Portions Copyright (c) 1994, The Regents of the University of California

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.


Copyright (c) 2021-2025, PostgreSQL Global Development Group
Portions Copyright (c) 1992-1994, Regents of the University of California

Copyright (c) 1992, 1993
The Regents of the University of California. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the University nor the names of its contributors may
   be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*
XML name character ranges from libxml2 v2.14.5.

 Copyright (C) 1998-2012 Daniel Veillard.  All Rights Reserved.
 Copyright (C) The Libxml2 Contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is fur-
nished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FIT-
NESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/*
 Copyright (C) 1998-2012 Daniel Veillard.  All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is fur-
nished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FIT-
NESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2010-2017 Christopher Swenson.
 * Copyright (c) 2012 Vojtech Fried.
 * Copyright (c) 2012 Google Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
import * as checkruntime from "../checkruntime/runtime.js";
import * as langruntime from "../langruntime/runtime.js";
const sqlstateDivisionByZero = 3452582;
const jsonpathParseRange = 3452547;
interface JsonpathScanSource {
    characters: string[];
}
interface JsonpathScanRead {
    kind: number;
    end: number;
    text: string[];
    error: number;
}
const jsonpathScanInt = 259;
const jsonpathScanNumeric = 260;
const jsonpathScanSyntax = 6819553;
function jsonpathScanSpace(character: string): boolean {
    character = langruntime.checkedChar(character);
    return character === " " || character === "\t" || character === "\n" || character === "\r" || character === "\f";
}
function jsonpathScanSpecial(character: string): boolean {
    character = langruntime.checkedChar(character);
    return character === "?" || character === "%" || character === "$" || character === "." || character === "[" || character === "]" || character === "{" || character === "}" || character === "(" || character === ")" || character === "|" || character === "&" || character === "!" || character === "=" || character === "<" || character === ">" || character === "@" || character === "#" || character === "," || character === "*" || character === ":" || character === "-" || character === "+" || character === "/";
}
function jsonpathScanOther(character: string): boolean {
    character = langruntime.checkedChar(character);
    return jsonpathScanSpace(character) === false && jsonpathScanSpecial(character) === false && !(character === "\\") && !(character === "\"");
}
function jsonpathScanHex(character: string): number {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    if (code >= 48 && code <= 57) {
        return langruntime.checkedSignedSubtract(code, 48);
    }
    if (code >= 65 && code <= 70) {
        return langruntime.checkedSignedSubtract(code, 55);
    }
    if (code >= 97 && code <= 102) {
        return langruntime.checkedSignedSubtract(code, 87);
    }
    return langruntime.checkedSignedNegate(1);
}
function jsonpathScanDigits(source: JsonpathScanSource, begin: number, radix: number): number {
    begin = langruntime.checkedIndex(begin);
    radix = langruntime.checkedI32(radix);
    let position: number = begin;
    while (position < source.characters.length) {
        const digit: number = jsonpathScanHex(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)));
        if (digit < 0 || digit >= radix) {
            return position;
        }
        position = langruntime.checkedAdd(position, 1);
        if (langruntime.checkedAdd(position, 1) < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "_") {
            const next: number = jsonpathScanHex(langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(position, 1))));
            if (next >= 0 && next < radix) {
                position = langruntime.checkedAdd(position, 1);
            }
        }
    }
    return position;
}
function jsonpathScanEmptyRead(kind: number, end: number, error: number): JsonpathScanRead {
    kind = langruntime.checkedI32(kind);
    end = langruntime.checkedIndex(end);
    error = langruntime.checkedIndex(error);
    const text: string[] = [];
    return { kind: kind, end: end, text: text, error: error };
}
function jsonpathScanNumber(source: JsonpathScanSource, begin: number): JsonpathScanRead {
    begin = langruntime.checkedIndex(begin);
    let integer: number = begin;
    if (langruntime.indexChar(source.characters, langruntime.checkedIndex(begin)) === "0") {
        integer = langruntime.checkedAdd(integer, 1);
    }
    else {
        integer = langruntime.checkedIndex(jsonpathScanDigits(source, begin, 10));
    }
    let decimal: number = begin;
    if (integer < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(integer)) === ".") {
        decimal = langruntime.checkedIndex(jsonpathScanDigits(source, langruntime.checkedAdd(integer, 1), 10));
    }
    let base: number = integer;
    if (decimal > base) {
        base = langruntime.checkedIndex(decimal);
    }
    let real: number = begin;
    let failedReal: number = begin;
    if (base > begin && base < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(base)) === "e" || langruntime.indexChar(source.characters, langruntime.checkedIndex(base)) === "E")) {
        let digits: number = langruntime.checkedAdd(base, 1);
        if (digits < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(digits)) === "+" || langruntime.indexChar(source.characters, langruntime.checkedIndex(digits)) === "-")) {
            digits = langruntime.checkedAdd(digits, 1);
            failedReal = langruntime.checkedIndex(digits);
        }
        const end: number = jsonpathScanDigits(source, digits, 10);
        if (end > digits) {
            real = langruntime.checkedIndex(end);
        }
    }
    let prefixed: number = begin;
    if (langruntime.checkedAdd(begin, 2) < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(begin)) === "0") {
        const prefix: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(begin, 1)));
        let radix: number = 0;
        if (prefix === "x" || prefix === "X") {
            radix = langruntime.checkedI32(16);
        }
        if (prefix === "o" || prefix === "O") {
            radix = langruntime.checkedI32(8);
        }
        if (prefix === "b" || prefix === "B") {
            radix = langruntime.checkedI32(2);
        }
        if (radix > 0) {
            const end: number = jsonpathScanDigits(source, langruntime.checkedAdd(begin, 2), radix);
            if (end > langruntime.checkedAdd(begin, 2)) {
                prefixed = langruntime.checkedIndex(end);
            }
        }
    }
    let kind: number = jsonpathScanInt;
    let end: number = integer;
    if (decimal > end) {
        end = langruntime.checkedIndex(decimal);
        kind = langruntime.checkedI32(jsonpathScanNumeric);
    }
    if (real > end) {
        end = langruntime.checkedIndex(real);
        kind = langruntime.checkedI32(jsonpathScanNumeric);
    }
    if (prefixed > end) {
        end = langruntime.checkedIndex(prefixed);
        kind = langruntime.checkedI32(jsonpathScanInt);
    }
    let junk: number = begin;
    if (integer > begin && integer < source.characters.length && jsonpathScanOther(langruntime.indexChar(source.characters, langruntime.checkedIndex(integer)))) {
        junk = langruntime.checkedIndex(langruntime.checkedAdd(integer, 1));
    }
    if (decimal > begin && decimal < source.characters.length && jsonpathScanOther(langruntime.indexChar(source.characters, langruntime.checkedIndex(decimal))) && langruntime.checkedAdd(decimal, 1) > junk) {
        junk = langruntime.checkedIndex(langruntime.checkedAdd(decimal, 1));
    }
    if (real > begin && real < source.characters.length && jsonpathScanOther(langruntime.indexChar(source.characters, langruntime.checkedIndex(real))) && langruntime.checkedAdd(real, 1) > junk) {
        junk = langruntime.checkedIndex(langruntime.checkedAdd(real, 1));
    }
    let error: number = 0;
    if (failedReal > end) {
        end = langruntime.checkedIndex(failedReal);
        error = langruntime.checkedIndex(jsonpathScanSyntax);
    }
    if (junk > end) {
        end = langruntime.checkedIndex(junk);
        error = langruntime.checkedIndex(jsonpathScanSyntax);
    }
    let other: number = begin;
    while (other < source.characters.length && jsonpathScanOther(langruntime.indexChar(source.characters, langruntime.checkedIndex(other)))) {
        other = langruntime.checkedAdd(other, 1);
    }
    if (other > end || (other === end && other > begin && !(error === 0) && (langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))).codePointAt(0)!) >= 128)) {
        return jsonpathScanEmptyRead(0, begin, 0);
    }
    return jsonpathScanEmptyRead(kind, end, error);
}
function jsonpathRadixLiteral(source: JsonpathScanSource, radix: number): checkruntime.TextValue {
    radix = langruntime.checkedI32(radix);
    let position: number = 2;
    while (position < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "0" || langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "_")) {
        position = langruntime.checkedAdd(position, 1);
    }
    if (position === source.characters.length) {
        return { kind: "Value", value: "0" };
    }
    let words: number[] = [];
    langruntime.pushIndex(words, 0);
    while (position < source.characters.length) {
        let factor: bigint = 1n;
        let chunk: bigint = 0n;
        const base: bigint = BigInt(langruntime.checkedI32(radix));
        while (position < source.characters.length && factor <= langruntime.checkedI64Divide(268435456n, base)) {
            const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
            position = langruntime.checkedAdd(position, 1);
            if (!(character === "_")) {
                const digit: bigint = BigInt(langruntime.checkedI32(jsonpathScanHex(character)));
                chunk = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(chunk, base), digit));
                factor = langruntime.checkedI64(langruntime.checkedI64Multiply(factor, base));
            }
        }
        let index: number = 0;
        let carry: bigint = chunk;
        while (index < words.length) {
            const word: number = langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(words, langruntime.checkedIndex(index))));
            const combined: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(word))), factor), carry);
            words[langruntime.checkedIndexIn(words, index)] = langruntime.checkedIndex(langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Remainder(combined, 10000n))))), 0));
            carry = langruntime.checkedI64(langruntime.checkedI64Divide(combined, 10000n));
            index = langruntime.checkedAdd(index, 1);
        }
        while (carry > 0n) {
            langruntime.pushIndex(words, langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Remainder(carry, 10000n))))), 0));
            carry = langruntime.checkedI64(langruntime.checkedI64Divide(carry, 10000n));
        }
        if (words.length > 32768) {
            return { kind: "Error", value: checkruntime.makeSqlError(jsonpathParseRange) };
        }
    }
    let output: string = "";
    let index: number = words.length;
    let leading: boolean = true;
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        const word: number = langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(words, langruntime.checkedIndex(index))));
        let divisor: number = 1000;
        while (divisor > 0) {
            const digit: number = langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(word, divisor)), 10);
            if (leading === false || digit > 0 || divisor === 1) {
                output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(48, digit)), " "));
                leading = langruntime.checkedBool(false);
            }
            divisor = langruntime.checkedI32(langruntime.checkedSignedDivide(divisor, 10));
        }
    }
    return { kind: "Value", value: output };
}
function jsonpathNumericLiteral(input: string): checkruntime.TextValue {
    input = langruntime.checkedString(input);
    const source: JsonpathScanSource = { characters: Array.from(input) };
    if (source.characters.length > 2 && langruntime.indexChar(source.characters, langruntime.checkedIndex(0)) === "0") {
        const prefix: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(1));
        let radix: number = 0;
        if (prefix === "x" || prefix === "X") {
            radix = langruntime.checkedI32(16);
        }
        if (prefix === "o" || prefix === "O") {
            radix = langruntime.checkedI32(8);
        }
        if (prefix === "b" || prefix === "B") {
            radix = langruntime.checkedI32(2);
        }
        if (radix > 0) {
            return jsonpathRadixLiteral(source, radix);
        }
    }
    let clean: string = "";
    if (langruntime.indexChar(source.characters, langruntime.checkedIndex(0)) === ".") {
        clean = clean + langruntime.checkedChar("0");
    }
    let position: number = 0;
    while (position < source.characters.length) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        let appendCharacter: boolean = !(character === "_");
        if (character === "." && (langruntime.checkedAdd(position, 1) === source.characters.length || langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(position, 1))) === "e" || langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(position, 1))) === "E")) {
            appendCharacter = langruntime.checkedBool(false);
        }
        if (appendCharacter) {
            clean = clean + langruntime.checkedChar(character);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    const parsed: checkruntime.JsonbValue = checkruntime.jsonbFromText({ kind: "Value", value: clean });
    return checkruntime.jsonbToText(parsed);
}
function numericCompare(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
    let unresolvedFlavor: number = 0;
    if (left.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (right.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (left.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (right.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor134: number = unresolvedFlavor;
    if (left.kind === "Unknown") {
        if (conditionFlavor134 < 1) {
            conditionFlavor134 = langruntime.checkedI32(1);
        }
    }
    if (left.kind === "Unimplemented") {
        conditionFlavor134 = langruntime.checkedI32(2);
    }
    if (right.kind === "Unknown") {
        if (conditionFlavor134 < 1) {
            conditionFlavor134 = langruntime.checkedI32(1);
        }
    }
    if (right.kind === "Unimplemented") {
        conditionFlavor134 = langruntime.checkedI32(2);
    }
    if ((checkruntime.equalNumericValue(left, { kind: "Unknown" }) || checkruntime.equalNumericValue(left, { kind: "Unimplemented" })) || (checkruntime.equalNumericValue(right, { kind: "Unknown" }) || checkruntime.equalNumericValue(right, { kind: "Unimplemented" }))) {
        return checkruntime.int4Unresolved(conditionFlavor134);
    }
    if (checkruntime.equalNumericValue(left, { kind: "Null" }) || checkruntime.equalNumericValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            const a: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(leftValue));
            const b: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(rightValue));
            if (a.valid === false || b.valid === false) {
                return checkruntime.int4Unresolved(unresolvedFlavor);
            }
            if (a.special < b.special) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a.special > b.special) {
                return { kind: "Value", value: 1 };
            }
            if (!(a.special === 1)) {
                return { kind: "Value", value: 0 };
            }
            if (a.sign < b.sign) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a.sign > b.sign) {
                return { kind: "Value", value: 1 };
            }
            if (a.sign === 0) {
                return { kind: "Value", value: 0 };
            }
            if (a.weight < b.weight) {
                return { kind: "Value", value: langruntime.checkedSignedSubtract(0, a.sign) };
            }
            if (a.weight > b.weight) {
                return { kind: "Value", value: a.sign };
            }
            const leftChars: string[] = Array.from(leftValue);
            const rightChars: string[] = Array.from(rightValue);
            let i: number = a.first;
            let j: number = b.first;
            while (i < a.end || j < b.end) {
                while (i < a.end && (langruntime.indexChar(leftChars, langruntime.checkedIndex(i)) === "." || langruntime.indexChar(leftChars, langruntime.checkedIndex(i)) === "_")) {
                    i = langruntime.checkedAdd(i, 1);
                }
                while (j < b.end && (langruntime.indexChar(rightChars, langruntime.checkedIndex(j)) === "." || langruntime.indexChar(rightChars, langruntime.checkedIndex(j)) === "_")) {
                    j = langruntime.checkedAdd(j, 1);
                }
                let x: string = "0";
                let y: string = "0";
                if (i < a.end) {
                    x = langruntime.checkedChar(langruntime.indexChar(leftChars, langruntime.checkedIndex(i)));
                    i = langruntime.checkedAdd(i, 1);
                }
                if (j < b.end) {
                    y = langruntime.checkedChar(langruntime.indexChar(rightChars, langruntime.checkedIndex(j)));
                    j = langruntime.checkedAdd(j, 1);
                }
                const xCode: number = langruntime.checkedChar(x).codePointAt(0)!;
                const yCode: number = langruntime.checkedChar(y).codePointAt(0)!;
                if (xCode < yCode) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(0, a.sign) };
                }
                if (xCode > yCode) {
                    return { kind: "Value", value: a.sign };
                }
            }
            return { kind: "Value", value: 0 };
        }
    }
    return checkruntime.int4Unresolved(unresolvedFlavor);
}
export function numericEqFw7r(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    let unresolvedFlavor: number = 0;
    if (left.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (right.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (left.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (right.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    const result: checkruntime.Int4Value = numericCompare(left, right);
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor964: number = unresolvedFlavor;
    if (result.kind === "Unknown") {
        if (conditionFlavor964 < 1) {
            conditionFlavor964 = langruntime.checkedI32(1);
        }
    }
    if (result.kind === "Unimplemented") {
        conditionFlavor964 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" }) || checkruntime.equalInt4Value(result, { kind: "Unimplemented" })) {
        return checkruntime.boolUnresolved(conditionFlavor964);
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order === 0 };
    }
    return checkruntime.boolUnresolved(unresolvedFlavor);
}
function numericWorkMagnitude(left: NumericWork, right: NumericWork): number {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    if (left.sign === 0) {
        if (right.sign === 0) {
            return 0;
        }
        return langruntime.checkedSignedNegate(1);
    }
    if (right.sign === 0) {
        return 1;
    }
    if (left.weight < right.weight) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.weight > right.weight) {
        return 1;
    }
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let index: number = 0;
    while (index < first.length || index < second.length) {
        let a: number = 0;
        let b: number = 0;
        if (index < first.length) {
            a = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index))));
        }
        if (index < second.length) {
            b = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index))));
        }
        if (a < b) {
            return langruntime.checkedSignedNegate(1);
        }
        if (a > b) {
            return 1;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return 0;
}
function numericWorkSum(left: NumericWork, right: NumericWork, subtract: boolean): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    subtract = langruntime.checkedBool(subtract);
    let scale: number = left.scale;
    if (right.scale > scale) {
        scale = langruntime.checkedI32(right.scale);
    }
    let sign: number = left.sign;
    let otherSign: number = right.sign;
    if (subtract) {
        otherSign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, otherSign));
    }
    const adding: boolean = sign === otherSign;
    let swap: boolean = false;
    if (adding === false) {
        const order: number = numericWorkMagnitude(copyNumericWork(left), copyNumericWork(right));
        if (order < 0) {
            swap = langruntime.checkedBool(true);
            sign = langruntime.checkedI32(otherSign);
        }
        if (order === 0) {
            sign = langruntime.checkedI32(0);
        }
    }
    let weight: number = left.weight;
    if (right.weight > weight) {
        weight = langruntime.checkedI32(right.weight);
    }
    weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let aIndex: number = 0;
    let bIndex: number = 0;
    let aDigits: NumericWireDigit[] = [];
    let bDigits: NumericWireDigit[] = [];
    let position: number = weight;
    while (position >= langruntime.checkedSignedSubtract(0, scale)) {
        let a: number = 0;
        let b: number = 0;
        if (position <= left.weight && aIndex < first.length) {
            a = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(aIndex))));
            aIndex = langruntime.checkedAdd(aIndex, 1);
        }
        if (position <= right.weight && bIndex < second.length) {
            b = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(bIndex))));
            bIndex = langruntime.checkedAdd(bIndex, 1);
        }
        langruntime.pushStruct(aDigits, { value: a }, copyNumericWireDigit);
        langruntime.pushStruct(bDigits, { value: b }, copyNumericWireDigit);
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    let result: NumericWireDigit[] = [];
    let index: number = 0;
    while (index < aDigits.length) {
        langruntime.pushStruct(result, { value: 0 }, copyNumericWireDigit);
        index = langruntime.checkedAdd(index, 1);
    }
    let carry: number = 0;
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        let a: number = langruntime.indexStruct(aDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value;
        let b: number = langruntime.indexStruct(bDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value;
        if (swap) {
            a = langruntime.checkedI32(langruntime.indexStruct(bDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value);
            b = langruntime.checkedI32(langruntime.indexStruct(aDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value);
        }
        let digit: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(a, b), carry);
        if (adding) {
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(digit, 10));
            digit = langruntime.checkedI32(langruntime.checkedSignedRemainder(digit, 10));
        }
        else {
            digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(a, b), carry));
            carry = langruntime.checkedI32(0);
            if (digit < 0) {
                digit = langruntime.checkedI32(langruntime.checkedSignedAdd(digit, 10));
                carry = langruntime.checkedI32(1);
            }
        }
        result[langruntime.checkedIndexIn(result, index)] = copyNumericWireDigit({ value: digit });
    }
    let end: number = result.length;
    while (end > 0 && langruntime.indexStruct(result, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)), copyNumericWireDigit).value === 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let start: number = 0;
    while (start < end && langruntime.indexStruct(result, langruntime.checkedIndex(start), copyNumericWireDigit).value === 0) {
        start = langruntime.checkedAdd(start, 1);
        weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
    }
    let digits: string = "";
    index = langruntime.checkedIndex(start);
    while (index < end) {
        digits = digits + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(langruntime.indexStruct(result, langruntime.checkedIndex(index), copyNumericWireDigit).value, 48)), "0"));
        index = langruntime.checkedAdd(index, 1);
    }
    if (start === end) {
        sign = langruntime.checkedI32(0);
        weight = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits };
}
function numericWorkAdd(left: NumericWork, right: NumericWork, subtract: boolean): checkruntime.NumericValue {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    subtract = langruntime.checkedBool(subtract);
    const work: NumericWork = numericWorkSum(left, right, subtract);
    if (work.weight > 131071) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    return { kind: "Value", value: numericWorkText(work) };
}
function numericProductWords(characters: string[]): NumericWireDigit[] {
    characters = langruntime.checkedChars(characters);
    let words: NumericWireDigit[] = [];
    let end: number = characters.length;
    while (end > 0) {
        let value: number = 0;
        let factor: number = 1;
        let width: number = 0;
        while (end > 0 && width < 4) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
            value = langruntime.checkedI32(langruntime.checkedSignedAdd(value, langruntime.checkedSignedMultiply(numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(end))), factor)));
            factor = langruntime.checkedI32(langruntime.checkedSignedMultiply(factor, 10));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        }
        langruntime.pushStruct(words, { value: value }, copyNumericWireDigit);
    }
    return words;
}
function numericWorkProduct(left: NumericWork, right: NumericWork): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    const scale: number = langruntime.checkedSignedAdd(left.scale, right.scale);
    const sign: number = langruntime.checkedSignedMultiply(left.sign, right.sign);
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let aCount: number = 0;
    let bCount: number = 0;
    let index: number = 0;
    while (index < first.length) {
        aCount = langruntime.checkedI32(langruntime.checkedSignedAdd(aCount, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    index = langruntime.checkedIndex(0);
    while (index < second.length) {
        bCount = langruntime.checkedI32(langruntime.checkedSignedAdd(bCount, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    const a: NumericWireDigit[] = numericProductWords(first);
    const b: NumericWireDigit[] = numericProductWords(second);
    let result: NumericWireDigit[] = [];
    index = langruntime.checkedIndex(0);
    while (index < langruntime.checkedAdd(langruntime.checkedAdd(a.length, b.length), 1)) {
        langruntime.pushStruct(result, { value: 0 }, copyNumericWireDigit);
        index = langruntime.checkedAdd(index, 1);
    }
    let aIndex: number = 0;
    while (aIndex < a.length) {
        let bIndex: number = 0;
        let carry: number = 0;
        while (bIndex < b.length) {
            const offset: number = langruntime.checkedAdd(aIndex, bIndex);
            const product: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(a, langruntime.checkedIndex(aIndex), copyNumericWireDigit).value, langruntime.indexStruct(b, langruntime.checkedIndex(bIndex), copyNumericWireDigit).value), langruntime.indexStruct(result, langruntime.checkedIndex(offset), copyNumericWireDigit).value), carry);
            result[langruntime.checkedIndexIn(result, offset)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(product, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(product, 10000));
            bIndex = langruntime.checkedAdd(bIndex, 1);
        }
        let offset: number = langruntime.checkedAdd(aIndex, bIndex);
        while (carry > 0) {
            const word: number = langruntime.checkedSignedAdd(langruntime.indexStruct(result, langruntime.checkedIndex(offset), copyNumericWireDigit).value, carry);
            result[langruntime.checkedIndexIn(result, offset)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(word, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(word, 10000));
            offset = langruntime.checkedAdd(offset, 1);
        }
        aIndex = langruntime.checkedAdd(aIndex, 1);
    }
    let end: number = result.length;
    while (end > 0 && langruntime.indexStruct(result, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)), copyNumericWireDigit).value === 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let coefficient: string = "";
    let count: number = 0;
    while (end > 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        let word: number = langruntime.indexStruct(result, langruntime.checkedIndex(end), copyNumericWireDigit).value;
        let place: number = 1000;
        while (place > 0) {
            const digit: number = langruntime.checkedSignedDivide(word, place);
            word = langruntime.checkedI32(langruntime.checkedSignedRemainder(word, place));
            if (!(coefficient === "") || !(digit === 0)) {
                coefficient = coefficient + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(digit, 48)), "0"));
                count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
            }
            place = langruntime.checkedI32(langruntime.checkedSignedDivide(place, 10));
        }
    }
    let weight: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(left.weight, right.weight), count), aCount), bCount), 1);
    const characters: string[] = Array.from(coefficient);
    end = langruntime.checkedIndex(characters.length);
    while (end > 0 && langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === "0") {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let digits: string = "";
    index = langruntime.checkedIndex(0);
    while (index < end) {
        digits = digits + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    if (sign === 0) {
        weight = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits };
}
function numericWorkMultiply(left: NumericWork, right: NumericWork): checkruntime.NumericValue {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    const work: NumericWork = numericWorkProduct(left, right);
    const scale: number = work.scale;
    return numericWorkRound(work, scale, 1);
}
function numericArithmetic(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    mode = langruntime.checkedI32(mode);
    let unresolvedFlavor: number = 0;
    if (left.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (right.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (left.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (right.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor2854: number = unresolvedFlavor;
    if (left.kind === "Unknown") {
        if (conditionFlavor2854 < 1) {
            conditionFlavor2854 = langruntime.checkedI32(1);
        }
    }
    if (left.kind === "Unimplemented") {
        conditionFlavor2854 = langruntime.checkedI32(2);
    }
    if (right.kind === "Unknown") {
        if (conditionFlavor2854 < 1) {
            conditionFlavor2854 = langruntime.checkedI32(1);
        }
    }
    if (right.kind === "Unimplemented") {
        conditionFlavor2854 = langruntime.checkedI32(2);
    }
    if ((checkruntime.equalNumericValue(left, { kind: "Unknown" }) || checkruntime.equalNumericValue(left, { kind: "Unimplemented" })) || (checkruntime.equalNumericValue(right, { kind: "Unknown" }) || checkruntime.equalNumericValue(right, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor2854);
    }
    if (checkruntime.equalNumericValue(left, { kind: "Null" }) || checkruntime.equalNumericValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: NumericWork = numericWorkFromValue(a);
            const second: NumericWork = numericWorkFromValue(b);
            if (first.valid === false || second.valid === false) {
                return checkruntime.numericUnresolved(unresolvedFlavor);
            }
            if (first.special === 3 || second.special === 3) {
                return checkruntime.makeNumericValue("NaN");
            }
            if (!(first.special === 1) || !(second.special === 1)) {
                let leftSign: number = first.sign;
                let rightSign: number = second.sign;
                if (first.special === 0) {
                    leftSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (first.special === 2) {
                    leftSign = langruntime.checkedI32(1);
                }
                if (second.special === 0) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (second.special === 2) {
                    rightSign = langruntime.checkedI32(1);
                }
                if (mode === 1) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, rightSign));
                }
                let resultSign: number = leftSign;
                if (mode === 2) {
                    resultSign = langruntime.checkedI32(langruntime.checkedSignedMultiply(leftSign, rightSign));
                }
                else if (first.special === 1) {
                    resultSign = langruntime.checkedI32(rightSign);
                }
                else if (!(second.special === 1) && !(leftSign === rightSign)) {
                    resultSign = langruntime.checkedI32(0);
                }
                if (resultSign === 0) {
                    return checkruntime.makeNumericValue("NaN");
                }
                if (resultSign < 0) {
                    return checkruntime.makeNumericValue("-Infinity");
                }
                return checkruntime.makeNumericValue("Infinity");
            }
            if (mode === 2) {
                return numericWorkMultiply(first, second);
            }
            return numericWorkAdd(first, second, mode === 1);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericAddO3d7(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 0);
}
export function numericSubYs09(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 1);
}
export function numericMulBj4l(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 2);
}
function numericDivisionScale(left: NumericWork, right: NumericWork): number {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    let firstWeight: number = 0;
    let secondWeight: number = 0;
    let firstDigit: number = 0;
    let secondDigit: number = 0;
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    if (!(left.sign === 0)) {
        firstWeight = langruntime.checkedI32(langruntime.checkedSignedDivide(left.weight, 4));
        let width: number = langruntime.checkedSignedRemainder(left.weight, 4);
        if (width < 0) {
            firstWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(firstWeight, 1));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 4));
        }
        width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        let index: number = 0;
        while (width > 0) {
            firstDigit = langruntime.checkedI32(langruntime.checkedSignedMultiply(firstDigit, 10));
            if (index < first.length) {
                firstDigit = langruntime.checkedI32(langruntime.checkedSignedAdd(firstDigit, numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index)))));
            }
            index = langruntime.checkedAdd(index, 1);
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
    }
    if (!(right.sign === 0)) {
        secondWeight = langruntime.checkedI32(langruntime.checkedSignedDivide(right.weight, 4));
        let width: number = langruntime.checkedSignedRemainder(right.weight, 4);
        if (width < 0) {
            secondWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(secondWeight, 1));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 4));
        }
        width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        let index: number = 0;
        while (width > 0) {
            secondDigit = langruntime.checkedI32(langruntime.checkedSignedMultiply(secondDigit, 10));
            if (index < second.length) {
                secondDigit = langruntime.checkedI32(langruntime.checkedSignedAdd(secondDigit, numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index)))));
            }
            index = langruntime.checkedAdd(index, 1);
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
    }
    let quotientWeight: number = langruntime.checkedSignedSubtract(firstWeight, secondWeight);
    if (firstDigit <= secondDigit) {
        quotientWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(quotientWeight, 1));
    }
    let scale: number = langruntime.checkedSignedSubtract(16, langruntime.checkedSignedMultiply(quotientWeight, 4));
    if (scale < left.scale) {
        scale = langruntime.checkedI32(left.scale);
    }
    if (scale < right.scale) {
        scale = langruntime.checkedI32(right.scale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    return scale;
}
function numericDivisionWork(left: NumericWork, right: NumericWork, scale: number, rounding: boolean): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    scale = langruntime.checkedI32(scale);
    rounding = langruntime.checkedBool(rounding);
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let denominator: NumericWireDigit[] = [];
    let remainder: NumericWireDigit[] = [];
    langruntime.pushStruct(remainder, { value: 0 }, copyNumericWireDigit);
    let secondExponent: number = langruntime.checkedSignedAdd(right.weight, 1);
    let index: number = 0;
    while (index < second.length) {
        langruntime.pushStruct(denominator, { value: numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index))) }, copyNumericWireDigit);
        langruntime.pushStruct(remainder, { value: 0 }, copyNumericWireDigit);
        secondExponent = langruntime.checkedI32(langruntime.checkedSignedSubtract(secondExponent, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    let position: number = langruntime.checkedSignedSubtract(left.weight, secondExponent);
    let boundary: number = langruntime.checkedSignedSubtract(0, scale);
    if (rounding) {
        boundary = langruntime.checkedI32(langruntime.checkedSignedSubtract(boundary, 1));
    }
    let coefficient: string = "";
    let weight: number = 0;
    let sign: number = 0;
    index = langruntime.checkedIndex(0);
    while (position >= boundary && !(left.sign === 0)) {
        let cursor: number = 0;
        while (langruntime.checkedAdd(cursor, 1) < remainder.length) {
            remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit(langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        let digit: number = 0;
        if (index < first.length) {
            digit = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index))));
        }
        remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: digit });
        index = langruntime.checkedAdd(index, 1);
        let quotient: number = 0;
        let subtract: boolean = true;
        while (subtract) {
            subtract = langruntime.checkedBool(!(langruntime.indexStruct(remainder, langruntime.checkedIndex(0), copyNumericWireDigit).value === 0));
            if (subtract === false) {
                let order: number = 0;
                cursor = langruntime.checkedIndex(0);
                while (cursor < denominator.length && order === 0) {
                    if (langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit).value < langruntime.indexStruct(denominator, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                        order = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                    }
                    if (langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit).value > langruntime.indexStruct(denominator, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                        order = langruntime.checkedI32(1);
                    }
                    cursor = langruntime.checkedAdd(cursor, 1);
                }
                subtract = langruntime.checkedBool(order >= 0);
            }
            if (subtract) {
                let borrow: number = 0;
                cursor = langruntime.checkedIndex(denominator.length);
                while (cursor > 0) {
                    let difference: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, langruntime.indexStruct(denominator, langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1)), copyNumericWireDigit).value), borrow);
                    borrow = langruntime.checkedI32(0);
                    if (difference < 0) {
                        difference = langruntime.checkedI32(langruntime.checkedSignedAdd(difference, 10));
                        borrow = langruntime.checkedI32(1);
                    }
                    remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: difference });
                    cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
                }
                remainder[langruntime.checkedIndexIn(remainder, 0)] = copyNumericWireDigit({ value: langruntime.checkedSignedSubtract(langruntime.indexStruct(remainder, langruntime.checkedIndex(0), copyNumericWireDigit).value, borrow) });
                quotient = langruntime.checkedI32(langruntime.checkedSignedAdd(quotient, 1));
            }
        }
        if (!(quotient === 0) && sign === 0) {
            sign = langruntime.checkedI32(langruntime.checkedSignedMultiply(left.sign, right.sign));
            weight = langruntime.checkedI32(position);
        }
        if (!(sign === 0)) {
            coefficient = coefficient + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(quotient, 48)), "0"));
        }
        let nonzero: boolean = false;
        cursor = langruntime.checkedIndex(0);
        while (cursor < remainder.length) {
            if (!(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value === 0)) {
                nonzero = langruntime.checkedBool(true);
            }
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        if (index >= first.length && nonzero === false) {
            position = langruntime.checkedI32(boundary);
        }
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: coefficient };
}
function numericDivision(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    mode = langruntime.checkedI32(mode);
    let unresolvedFlavor: number = 0;
    if (left.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (right.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (left.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (right.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor1864: number = unresolvedFlavor;
    if (left.kind === "Unknown") {
        if (conditionFlavor1864 < 1) {
            conditionFlavor1864 = langruntime.checkedI32(1);
        }
    }
    if (left.kind === "Unimplemented") {
        conditionFlavor1864 = langruntime.checkedI32(2);
    }
    if (right.kind === "Unknown") {
        if (conditionFlavor1864 < 1) {
            conditionFlavor1864 = langruntime.checkedI32(1);
        }
    }
    if (right.kind === "Unimplemented") {
        conditionFlavor1864 = langruntime.checkedI32(2);
    }
    if ((checkruntime.equalNumericValue(left, { kind: "Unknown" }) || checkruntime.equalNumericValue(left, { kind: "Unimplemented" })) || (checkruntime.equalNumericValue(right, { kind: "Unknown" }) || checkruntime.equalNumericValue(right, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor1864);
    }
    if (checkruntime.equalNumericValue(left, { kind: "Null" }) || checkruntime.equalNumericValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const first: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const second: string = langruntime.checkedString(right.value);
            const a: NumericWork = numericWorkFromValue(first);
            const b: NumericWork = numericWorkFromValue(second);
            if (a.valid === false || b.valid === false) {
                return checkruntime.numericUnresolved(unresolvedFlavor);
            }
            if (a.special === 3 || b.special === 3) {
                return { kind: "Value", value: "NaN" };
            }
            if (b.special === 1 && b.sign === 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (!(a.special === 1)) {
                if (mode === 2 || !(b.special === 1)) {
                    return { kind: "Value", value: "NaN" };
                }
                let sign: number = b.sign;
                if (a.special === 0) {
                    sign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, sign));
                }
                if (sign < 0) {
                    return { kind: "Value", value: "-Infinity" };
                }
                return { kind: "Value", value: "Infinity" };
            }
            if (!(b.special === 1)) {
                if (mode === 2) {
                    return { kind: "Value", value: first };
                }
                return { kind: "Value", value: "0" };
            }
            if (mode === 2) {
                const quotient: NumericWork = numericDivisionWork(copyNumericWork(a), copyNumericWork(b), 0, false);
                const product: checkruntime.NumericValue = numericWorkMultiply(quotient, b);
                if (product.kind === "Value") {
                    const multiplied: string = langruntime.checkedString(product.value);
                    return numericWorkAdd(a, numericWorkFromValue(multiplied), true);
                }
                return product;
            }
            let scale: number = 0;
            let rounding: boolean = false;
            if (mode === 0) {
                scale = langruntime.checkedI32(numericDivisionScale(copyNumericWork(a), copyNumericWork(b)));
                rounding = langruntime.checkedBool(true);
            }
            const quotient: NumericWork = numericDivisionWork(a, b, scale, rounding);
            let roundMode: number = 0;
            if (rounding) {
                roundMode = langruntime.checkedI32(1);
            }
            return numericWorkRound(quotient, scale, roundMode);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericDivPnzm(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 0);
}
export function numericMod8ywz(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 2);
}
export function numericAbs6g5e(input: checkruntime.NumericValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor420: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor420 < 1) {
            conditionFlavor420 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor420 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) {
        return checkruntime.numericUnresolved(conditionFlavor420);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        let special: number = work.special;
        let sign: number = work.sign;
        const outputScale: number = work.scale;
        if (sign < 0) {
            sign = langruntime.checkedI32(1);
        }
        if (special === 0) {
            special = langruntime.checkedI32(2);
        }
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericCmp6h4s(input: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
    const result: checkruntime.Int4Value = numericCompare(input, right);
    return result;
}
export function numericUminusWcmy(input: checkruntime.NumericValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor950: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor950 < 1) {
            conditionFlavor950 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor950 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) {
        return checkruntime.numericUnresolved(conditionFlavor950);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        let special: number = work.special;
        let sign: number = work.sign;
        const outputScale: number = work.scale;
        sign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, sign));
        if (special === 0) {
            special = langruntime.checkedI32(2);
        }
        else if (special === 2) {
            special = langruntime.checkedI32(0);
        }
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function sign2rsu(input: checkruntime.NumericValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor1490: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor1490 < 1) {
            conditionFlavor1490 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor1490 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) {
        return checkruntime.numericUnresolved(conditionFlavor1490);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        if (work.special === 3) {
            return { kind: "Value", value: "NaN" };
        }
        if (work.special === 0 || work.sign < 0) {
            return { kind: "Value", value: "-1" };
        }
        if (work.special === 2 || work.sign > 0) {
            return { kind: "Value", value: "1" };
        }
        return { kind: "Value", value: "0" };
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function roundMmpo(input: checkruntime.NumericValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor510: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor510 < 1) {
            conditionFlavor510 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor510 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) {
        return checkruntime.numericUnresolved(conditionFlavor510);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        return numericWorkRound(work, 0, 1);
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function roundOtcq(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (scale.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (scale.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (scale.kind === "Error") {
        const error: checkruntime.SqlError = scale.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor690: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor690 < 1) {
            conditionFlavor690 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor690 = langruntime.checkedI32(2);
    }
    if (scale.kind === "Unknown") {
        if (conditionFlavor690 < 1) {
            conditionFlavor690 = langruntime.checkedI32(1);
        }
    }
    if (scale.kind === "Unimplemented") {
        conditionFlavor690 = langruntime.checkedI32(2);
    }
    if ((checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) || (checkruntime.equalInt4Value(scale, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor690);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericWorkRound(work, precision, 1);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function truncDghz(input: checkruntime.NumericValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor840: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor840 < 1) {
            conditionFlavor840 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor840 = langruntime.checkedI32(2);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) {
        return checkruntime.numericUnresolved(conditionFlavor840);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        return numericWorkRound(work, 0, 0);
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function truncHay3(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (scale.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (scale.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (scale.kind === "Error") {
        const error: checkruntime.SqlError = scale.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor1020: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor1020 < 1) {
            conditionFlavor1020 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor1020 = langruntime.checkedI32(2);
    }
    if (scale.kind === "Unknown") {
        if (conditionFlavor1020 < 1) {
            conditionFlavor1020 = langruntime.checkedI32(1);
        }
    }
    if (scale.kind === "Unimplemented") {
        conditionFlavor1020 = langruntime.checkedI32(2);
    }
    if ((checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalNumericValue(input, { kind: "Unimplemented" })) || (checkruntime.equalInt4Value(scale, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor1020);
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return checkruntime.numericUnresolved(unresolvedFlavor);
        }
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericWorkRound(work, precision, 0);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
interface NumericWireDigit {
    value: number;
}
function copyNumericWireDigit(value: NumericWireDigit): NumericWireDigit {
    return { value: langruntime.checkedI32(value.value) };
}
function numericWireDecimalDigit(character: string): number {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    if (code >= 48 && code <= 57) {
        return langruntime.checkedSignedSubtract(code, 48);
    }
    return langruntime.checkedSignedNegate(1);
}
function numericWireScale(input: string): number {
    input = langruntime.checkedString(input);
    const chars: string[] = Array.from(input);
    let index: number = 0;
    let point: boolean = false;
    let power: boolean = false;
    let fractional: number = 0;
    let exponent: number = 0;
    let sign: number = 1;
    while (index < chars.length) {
        const digit: number = numericWireDecimalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        if (digit >= 0) {
            if (power) {
                exponent = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(exponent, 10), digit));
            }
            else if (point) {
                fractional = langruntime.checkedI32(langruntime.checkedSignedAdd(fractional, 1));
            }
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".") {
            point = langruntime.checkedBool(true);
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "e" || langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "E") {
            power = langruntime.checkedBool(true);
        }
        else if (power && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-") {
            sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    const scale: number = langruntime.checkedSignedSubtract(fractional, langruntime.checkedSignedMultiply(exponent, sign));
    if (scale < 0) {
        return 0;
    }
    return scale;
}
const numericSupportRangeError = 3452547;
interface NumericWork {
    valid: boolean;
    special: number;
    sign: number;
    weight: number;
    scale: number;
    digits: string;
}
function copyNumericWork(value: NumericWork): NumericWork {
    return { valid: langruntime.checkedBool(value.valid), special: langruntime.checkedI32(value.special), sign: langruntime.checkedI32(value.sign), weight: langruntime.checkedI32(value.weight), scale: langruntime.checkedI32(value.scale), digits: langruntime.checkedString(value.digits) };
}
function numericWorkFromValue(value: string): NumericWork {
    value = langruntime.checkedString(value);
    const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
    let digits: string = "";
    let scale: number = 0;
    if (layout.valid && layout.special === 1) {
        scale = langruntime.checkedI32(numericWireScale(value));
        const characters: string[] = Array.from(value);
        let index: number = layout.first;
        while (index < layout.end) {
            const character: string = langruntime.indexChar(characters, langruntime.checkedIndex(index));
            if (numericWireDecimalDigit(character) >= 0) {
                digits = digits + langruntime.checkedChar(character);
            }
            index = langruntime.checkedAdd(index, 1);
        }
    }
    return { valid: layout.valid, special: layout.special, sign: layout.sign, weight: layout.weight, scale: scale, digits: digits };
}
function numericWorkZeros(count: number): string {
    count = langruntime.checkedI32(count);
    let remaining: number = count;
    let block: string = "0";
    let output: string = "";
    while (remaining > 0) {
        if (langruntime.checkedSignedRemainder(remaining, 2) === 1) {
            output = output + block;
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedDivide(remaining, 2));
        if (remaining > 0) {
            const copy: string = langruntime.checkedString(block);
            block = block + copy;
        }
    }
    return output;
}
function numericWorkText(work: NumericWork): string {
    work = copyNumericWork(work);
    if (work.special === 0) {
        return "-Infinity";
    }
    if (work.special === 2) {
        return "Infinity";
    }
    if (work.special === 3) {
        return "NaN";
    }
    const digits: string[] = Array.from(work.digits);
    let output: string = "";
    if (work.sign < 0) {
        output = output + langruntime.checkedChar("-");
    }
    if (work.sign === 0) {
        output = output + langruntime.checkedChar("0");
        if (work.scale > 0) {
            output = output + langruntime.checkedChar(".");
            output = output + numericWorkZeros(work.scale);
        }
        return output;
    }
    let index: number = 0;
    if (work.weight >= 0) {
        let length: number = 0;
        while (index < digits.length) {
            length = langruntime.checkedI32(langruntime.checkedSignedAdd(length, 1));
            index = langruntime.checkedAdd(index, 1);
        }
        index = langruntime.checkedIndex(0);
        let positions: number = langruntime.checkedSignedAdd(work.weight, 1);
        if (length <= positions) {
            output = output + work.digits;
            output = output + numericWorkZeros(langruntime.checkedSignedSubtract(positions, length));
            index = langruntime.checkedIndex(digits.length);
        }
        else {
            while (positions > 0) {
                output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
                positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, 1));
            }
        }
    }
    else {
        output = output + langruntime.checkedChar("0");
    }
    if (work.scale > 0) {
        output = output + langruntime.checkedChar(".");
        let positions: number = work.scale;
        if (work.weight < langruntime.checkedSignedNegate(1)) {
            let leading: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(0, work.weight), 1);
            if (leading > positions) {
                leading = langruntime.checkedI32(positions);
            }
            output = output + numericWorkZeros(leading);
            positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, leading));
        }
        while (positions > 0 && index < digits.length) {
            output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
            positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, 1));
        }
        output = output + numericWorkZeros(positions);
    }
    return output;
}
function numericWorkRounded(work: NumericWork, scale: number, mode: number): NumericWork {
    work = copyNumericWork(work);
    scale = langruntime.checkedI32(scale);
    mode = langruntime.checkedI32(mode);
    const original: string[] = Array.from(work.digits);
    const boundary: number = langruntime.checkedSignedSubtract(0, scale);
    let digits: string[] = [];
    let position: number = work.weight;
    let index: number = 0;
    while (index < original.length && position >= boundary) {
        langruntime.pushChar(digits, langruntime.indexChar(original, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    let increase: boolean = false;
    if (index < original.length) {
        if (mode === 1 && position === langruntime.checkedSignedSubtract(boundary, 1) && numericWireDecimalDigit(langruntime.indexChar(original, langruntime.checkedIndex(index))) >= 5) {
            increase = langruntime.checkedBool(true);
        }
        if (mode === 2 && work.sign > 0) {
            increase = langruntime.checkedBool(true);
        }
        if (mode === 3 && work.sign < 0) {
            increase = langruntime.checkedBool(true);
        }
    }
    let weight: number = work.weight;
    let leadingCarry: boolean = false;
    if (increase) {
        if (digits.length === 0) {
            langruntime.pushChar(digits, "1");
            weight = langruntime.checkedI32(boundary);
        }
        else {
            let carry: boolean = true;
            let cursor: number = digits.length;
            const symbols: string[] = Array.from("0123456789");
            while (cursor > 0 && carry) {
                cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
                if (langruntime.indexChar(digits, langruntime.checkedIndex(cursor)) === "9") {
                    digits[langruntime.checkedIndexIn(digits, cursor)] = langruntime.checkedChar("0");
                }
                else {
                    let symbol: number = 0;
                    while (!(langruntime.indexChar(symbols, langruntime.checkedIndex(symbol)) === langruntime.indexChar(digits, langruntime.checkedIndex(cursor)))) {
                        symbol = langruntime.checkedAdd(symbol, 1);
                    }
                    digits[langruntime.checkedIndexIn(digits, cursor)] = langruntime.checkedChar(langruntime.indexChar(symbols, langruntime.checkedIndex(langruntime.checkedAdd(symbol, 1))));
                    carry = langruntime.checkedBool(false);
                }
            }
            if (carry) {
                leadingCarry = langruntime.checkedBool(true);
                weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
            }
        }
    }
    let end: number = digits.length;
    while (end > 0 && langruntime.indexChar(digits, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === "0") {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let coefficient: string = "";
    let cursor: number = 0;
    if (leadingCarry) {
        coefficient = coefficient + langruntime.checkedChar("1");
    }
    else {
        while (cursor < end) {
            coefficient = coefficient + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(cursor)));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
    }
    let sign: number = work.sign;
    if (end === 0 && leadingCarry === false) {
        sign = langruntime.checkedI32(0);
        weight = langruntime.checkedI32(0);
    }
    let outputScale: number = scale;
    if (outputScale < 0) {
        outputScale = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: outputScale, digits: coefficient };
}
function numericWorkRound(work: NumericWork, requested: number, mode: number): checkruntime.NumericValue {
    work = copyNumericWork(work);
    requested = langruntime.checkedI32(requested);
    mode = langruntime.checkedI32(mode);
    const unresolvedFlavor: number = 0;
    if (work.valid === false) {
        return checkruntime.numericUnresolved(unresolvedFlavor);
    }
    if (!(work.special === 1)) {
        return { kind: "Value", value: numericWorkText(work) };
    }
    let scale: number = requested;
    let minimum: number = langruntime.checkedSignedNegate(131072);
    if (mode === 1) {
        minimum = langruntime.checkedI32(langruntime.checkedSignedSubtract(minimum, 1));
    }
    if (scale < minimum) {
        scale = langruntime.checkedI32(minimum);
    }
    if (scale > 16383) {
        scale = langruntime.checkedI32(16383);
    }
    const rounded: NumericWork = numericWorkRounded(work, scale, mode);
    if (rounded.weight > 131071) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    return { kind: "Value", value: numericWorkText(rounded) };
}
const scalarInputInvalid = 3484946;
export function scalarNumericFromText(input: checkruntime.TextValue): checkruntime.NumericValue {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "NonNull") {
        if (unresolvedFlavor < 1) {
            unresolvedFlavor = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const parts: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
        if (parts.valid && !(parts.special === 1)) {
            if (parts.special === 0) {
                return { kind: "Value", value: "-Infinity" };
            }
            if (parts.special === 2) {
                return { kind: "Value", value: "Infinity" };
            }
            return { kind: "Value", value: "NaN" };
        }
        const characters: string[] = Array.from(value);
        let start: number = 0;
        let end: number = characters.length;
        while (start < end && checkruntime.numericSpace(langruntime.indexChar(characters, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        while (end > start && checkruntime.numericSpace(langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        let negative: boolean = false;
        if (start < end && (langruntime.indexChar(characters, langruntime.checkedIndex(start)) === "+" || langruntime.indexChar(characters, langruntime.checkedIndex(start)) === "-")) {
            negative = langruntime.checkedBool(langruntime.indexChar(characters, langruntime.checkedIndex(start)) === "-");
            start = langruntime.checkedAdd(start, 1);
        }
        if (start === end) {
            return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
        }
        let radix: number = 10;
        let prefixEnd: number = start;
        if (langruntime.checkedAdd(start, 1) < end && langruntime.indexChar(characters, langruntime.checkedIndex(start)) === "0") {
            const prefix: string = langruntime.asciiLowercase(langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedAdd(start, 1))));
            if (prefix === "x") {
                radix = langruntime.checkedI32(16);
                prefixEnd = langruntime.checkedIndex(langruntime.checkedAdd(start, 2));
            }
            if (prefix === "o") {
                radix = langruntime.checkedI32(8);
                prefixEnd = langruntime.checkedIndex(langruntime.checkedAdd(start, 2));
            }
            if (prefix === "b") {
                radix = langruntime.checkedI32(2);
                prefixEnd = langruntime.checkedIndex(langruntime.checkedAdd(start, 2));
            }
        }
        let clean: string = "";
        let position: number = start;
        while (position < end) {
            const character: string = langruntime.indexChar(characters, langruntime.checkedIndex(position));
            if (character === "_") {
                if (position === start || langruntime.checkedAdd(position, 1) === end) {
                    return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
                }
                const before: number = jsonpathScanHex(langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(position, 1))));
                const after: number = jsonpathScanHex(langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedAdd(position, 1))));
                if ((!(position === prefixEnd) && (before < 0 || before >= radix)) || after < 0 || after >= radix) {
                    return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
                }
            }
            else {
                clean = clean + langruntime.checkedChar(character);
            }
            position = langruntime.checkedAdd(position, 1);
        }
        const content: string[] = Array.from(clean);
        let begin: number = 0;
        if (radix === 10) {
            while (langruntime.checkedAdd(begin, 1) < content.length && langruntime.indexChar(content, langruntime.checkedIndex(begin)) === "0" && numericWireDecimalDigit(langruntime.indexChar(content, langruntime.checkedIndex(langruntime.checkedAdd(begin, 1)))) >= 0) {
                begin = langruntime.checkedAdd(begin, 1);
            }
        }
        let normalized: string = "";
        position = langruntime.checkedIndex(begin);
        while (position < content.length) {
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(content, langruntime.checkedIndex(position)));
            position = langruntime.checkedAdd(position, 1);
        }
        const source: JsonpathScanSource = { characters: Array.from(normalized) };
        if (source.characters.length === 0) {
            return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
        }
        const first: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(0));
        if (first === "." && (source.characters.length < 2 || numericWireDecimalDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(1))) < 0)) {
            return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
        }
        if (numericWireDecimalDigit(first) < 0 && !(first === ".")) {
            return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
        }
        const token: JsonpathScanRead = jsonpathScanNumber(source, 0);
        if (!(token.error === 0) || !(token.end === source.characters.length) || (!(token.kind === jsonpathScanInt) && !(token.kind === jsonpathScanNumeric))) {
            return { kind: "Error", value: checkruntime.makeSqlError(scalarInputInvalid) };
        }
        const parsed: checkruntime.TextValue = jsonpathNumericLiteral(normalized);
        if (parsed.kind === "Error") {
            const error: checkruntime.SqlError = parsed.value;
            return { kind: "Error", value: error };
        }
        if (parsed.kind === "Value") {
            const number: string = langruntime.checkedString(parsed.value);
            let result: checkruntime.NumericValue = { kind: "Value", value: number };
            if (negative) {
                result = numericUminusWcmy(result);
            }
            return result;
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
