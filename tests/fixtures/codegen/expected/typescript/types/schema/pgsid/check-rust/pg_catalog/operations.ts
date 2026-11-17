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
 * Copyright (c) 2018, Arm Limited.
 * Copyright (c) 1999-2022, Arm Limited.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Generated from musl's exp_data.c, log_data.c and pow_data.c (Arm optimized-routines, MIT licence).
// The dialect's static tables hold integers, so floating constants are stored as their bits.

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

/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// sin and cos follow PostgreSQL's dsin and dcos: NaN returns NaN and an infinite argument is out
// of range whatever the libm, and other results come from the fdlibm kernels that the trigonometry
// setting declares as the deployment's libm. fdlibm reduces |x| and restores the sign, so sine is
// odd and cosine even; arguments beyond the medium reduction range, which needs Payne-Hanek
// reduction, defer.

/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

// PostgreSQL's numeric algorithms on NumericVar. Where PostgreSQL computes an exact result,
// any exact method yields the same digits, so these routines use PostgreSQL's 32-bit forms and
// keep the translated targets on plain numbers. Where it approximates, by truncating a product
// or estimating a quotient, they reproduce PostgreSQL's arithmetic step for step.

// A result, or the numeric overflow PostgreSQL raises while computing it.

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
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
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
    let numericUnknownLeft1: boolean = false;
    if (left.kind === "Unknown") {
        numericUnknownLeft1 = langruntime.checkedBool(true);
    }
    let numericUnimplementedLeft2: boolean = false;
    if (left.kind === "Unimplemented") {
        numericUnimplementedLeft2 = langruntime.checkedBool(true);
    }
    let numericUnknownRight3: boolean = false;
    if (right.kind === "Unknown") {
        numericUnknownRight3 = langruntime.checkedBool(true);
    }
    let numericUnimplementedRight4: boolean = false;
    if (right.kind === "Unimplemented") {
        numericUnimplementedRight4 = langruntime.checkedBool(true);
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
    if ((numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4)) {
        return checkruntime.int4Unresolved(conditionFlavor134);
    }
    let numericNullLeft5: boolean = false;
    if (left.kind === "Null") {
        numericNullLeft5 = langruntime.checkedBool(true);
    }
    let numericNullRight6: boolean = false;
    if (right.kind === "Null") {
        numericNullRight6 = langruntime.checkedBool(true);
    }
    if (numericNullLeft5 || numericNullRight6) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: checkruntime.NumericVar = checkruntime.copyNumericVar(left.value);
        if (right.kind === "Value") {
            const rightValue: checkruntime.NumericVar = checkruntime.copyNumericVar(right.value);
            return { kind: "Value", value: numericVarCompareValues(leftValue, rightValue) };
        }
    }
    return checkruntime.int4Unresolved(unresolvedFlavor);
}
export function numericEqFw7r(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
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
function numericArithmetic(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
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
    let numericUnknownLeft1: boolean = false;
    if (left.kind === "Unknown") {
        numericUnknownLeft1 = langruntime.checkedBool(true);
    }
    let numericUnimplementedLeft2: boolean = false;
    if (left.kind === "Unimplemented") {
        numericUnimplementedLeft2 = langruntime.checkedBool(true);
    }
    let numericUnknownRight3: boolean = false;
    if (right.kind === "Unknown") {
        numericUnknownRight3 = langruntime.checkedBool(true);
    }
    let numericUnimplementedRight4: boolean = false;
    if (right.kind === "Unimplemented") {
        numericUnimplementedRight4 = langruntime.checkedBool(true);
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
    if ((numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4)) {
        return checkruntime.numericUnresolved(conditionFlavor2854);
    }
    let numericNullLeft5: boolean = false;
    if (left.kind === "Null") {
        numericNullLeft5 = langruntime.checkedBool(true);
    }
    let numericNullRight6: boolean = false;
    if (right.kind === "Null") {
        numericNullRight6 = langruntime.checkedBool(true);
    }
    if (numericNullLeft5 || numericNullRight6) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftVar: checkruntime.NumericVar = checkruntime.copyNumericVar(left.value);
        if (right.kind === "Value") {
            const rightVar: checkruntime.NumericVar = checkruntime.copyNumericVar(right.value);
            const firstKind: number = numericVarKind(leftVar);
            const secondKind: number = numericVarKind(rightVar);
            if (firstKind === 3 || secondKind === 3) {
                return checkruntime.makeNumericValue("NaN");
            }
            if (!(firstKind === 1) || !(secondKind === 1)) {
                let leftSign: number = numericVarSignum(leftVar);
                let rightSign: number = numericVarSignum(rightVar);
                if (firstKind === 0) {
                    leftSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (firstKind === 2) {
                    leftSign = langruntime.checkedI32(1);
                }
                if (secondKind === 0) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (secondKind === 2) {
                    rightSign = langruntime.checkedI32(1);
                }
                if (mode === 1) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, rightSign));
                }
                let resultSign: number = leftSign;
                if (mode === 2) {
                    resultSign = langruntime.checkedI32(langruntime.checkedSignedMultiply(leftSign, rightSign));
                }
                else if (firstKind === 1) {
                    resultSign = langruntime.checkedI32(rightSign);
                }
                else if (!(secondKind === 1) && !(leftSign === rightSign)) {
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
                const rscale: number = langruntime.checkedSignedAdd(leftVar.dscale, rightVar.dscale);
                const product: checkruntime.NumericVar = numericVarMul(leftVar, rightVar, rscale);
                if (product.dscale > 16383) {
                    return numericVarResult(numericVarRound(product, 16383));
                }
                return numericVarResult(product);
            }
            if (mode === 1) {
                const result: checkruntime.NumericVar = numericVarSub(leftVar, rightVar);
                return numericVarResult(result);
            }
            const result: checkruntime.NumericVar = numericVarAdd(leftVar, rightVar);
            return numericVarResult(result);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericAddO3d7(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    return numericArithmetic(left, right, 0);
}
export function numericSubYs09(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    return numericArithmetic(left, right, 1);
}
export function numericMulBj4l(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    return numericArithmetic(left, right, 2);
}
function numericDivisionScale(left: checkruntime.NumericVar, right: checkruntime.NumericVar): number {
    let weight1: number = 0;
    let firstdigit1: number = 0;
    let i: number = 0;
    while (i < numericVarCount(left)) {
        firstdigit1 = langruntime.checkedI32(numericVarDigit(left, i));
        if (!(firstdigit1 === 0)) {
            weight1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(left.weight, i));
            i = langruntime.checkedI32(numericVarCount(left));
        }
        i = langruntime.checkedI32(langruntime.checkedSignedAdd(i, 1));
    }
    let weight2: number = 0;
    let firstdigit2: number = 0;
    i = langruntime.checkedI32(0);
    while (i < numericVarCount(right)) {
        firstdigit2 = langruntime.checkedI32(numericVarDigit(right, i));
        if (!(firstdigit2 === 0)) {
            weight2 = langruntime.checkedI32(langruntime.checkedSignedSubtract(right.weight, i));
            i = langruntime.checkedI32(numericVarCount(right));
        }
        i = langruntime.checkedI32(langruntime.checkedSignedAdd(i, 1));
    }
    let qweight: number = langruntime.checkedSignedSubtract(weight1, weight2);
    if (firstdigit1 <= firstdigit2) {
        qweight = langruntime.checkedI32(langruntime.checkedSignedSubtract(qweight, 1));
    }
    let rscale: number = langruntime.checkedSignedSubtract(numericVarMinSigDigits, langruntime.checkedSignedMultiply(qweight, numericVarDecDigits));
    if (rscale < left.dscale) {
        rscale = langruntime.checkedI32(left.dscale);
    }
    if (rscale < right.dscale) {
        rscale = langruntime.checkedI32(right.dscale);
    }
    if (rscale < 0) {
        rscale = langruntime.checkedI32(0);
    }
    if (rscale > numericVarMaxDisplayScale) {
        rscale = langruntime.checkedI32(numericVarMaxDisplayScale);
    }
    return rscale;
}
function numericDivision(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
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
    let numericUnknownLeft1: boolean = false;
    if (left.kind === "Unknown") {
        numericUnknownLeft1 = langruntime.checkedBool(true);
    }
    let numericUnimplementedLeft2: boolean = false;
    if (left.kind === "Unimplemented") {
        numericUnimplementedLeft2 = langruntime.checkedBool(true);
    }
    let numericUnknownRight3: boolean = false;
    if (right.kind === "Unknown") {
        numericUnknownRight3 = langruntime.checkedBool(true);
    }
    let numericUnimplementedRight4: boolean = false;
    if (right.kind === "Unimplemented") {
        numericUnimplementedRight4 = langruntime.checkedBool(true);
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
    if ((numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4)) {
        return checkruntime.numericUnresolved(conditionFlavor1864);
    }
    let numericNullLeft5: boolean = false;
    if (left.kind === "Null") {
        numericNullLeft5 = langruntime.checkedBool(true);
    }
    let numericNullRight6: boolean = false;
    if (right.kind === "Null") {
        numericNullRight6 = langruntime.checkedBool(true);
    }
    if (numericNullLeft5 || numericNullRight6) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const dividend: checkruntime.NumericVar = checkruntime.copyNumericVar(left.value);
        if (right.kind === "Value") {
            const divisor: checkruntime.NumericVar = checkruntime.copyNumericVar(right.value);
            const aKind: number = numericVarKind(dividend);
            const bKind: number = numericVarKind(divisor);
            if (aKind === 3 || bKind === 3) {
                return checkruntime.makeNumericValue("NaN");
            }
            if (bKind === 1 && numericVarSignum(divisor) === 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (!(aKind === 1)) {
                if (mode === 2 || !(bKind === 1)) {
                    return checkruntime.makeNumericValue("NaN");
                }
                let sign: number = numericVarSignum(divisor);
                if (aKind === 0) {
                    sign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, sign));
                }
                if (sign < 0) {
                    return checkruntime.makeNumericValue("-Infinity");
                }
                return checkruntime.makeNumericValue("Infinity");
            }
            if (!(bKind === 1)) {
                if (mode === 2) {
                    return { kind: "Value", value: dividend };
                }
                return checkruntime.makeNumericValue("0");
            }
            if (mode === 2) {
                const result: checkruntime.NumericVar = numericVarMod(dividend, divisor);
                return numericVarResult(result);
            }
            if (mode === 1) {
                const result: checkruntime.NumericVar = numericVarDiv(dividend, divisor, 0, false, true);
                return numericVarResult(result);
            }
            const rscale: number = numericDivisionScale(dividend, divisor);
            const result: checkruntime.NumericVar = numericVarDiv(dividend, divisor, rscale, true, true);
            return numericVarResult(result);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericDivPnzm(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    return numericDivision(left, right, 0);
}
export function numericMod8ywz(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    return numericDivision(left, right, 2);
}
export function numericAbs6g5e(input: checkruntime.NumericValue): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput7: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput7 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput8: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput8 = langruntime.checkedBool(true);
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
    if (numericUnknownInput7 || numericUnimplementedInput8) {
        return checkruntime.numericUnresolved(conditionFlavor420);
    }
    let numericNullInput9: boolean = false;
    if (input.kind === "Null") {
        numericNullInput9 = langruntime.checkedBool(true);
    }
    if (numericNullInput9) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        return { kind: "Value", value: numericVarAbsolute(value) };
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function numericCmp6h4s(input: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
    input = checkruntime.copyNumericValue(input);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = numericCompare(checkruntime.copyNumericValue(input), checkruntime.copyNumericValue(right));
    return result;
}
export function numericUminusWcmy(input: checkruntime.NumericValue): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput10: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput10 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput11: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput11 = langruntime.checkedBool(true);
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
    if (numericUnknownInput10 || numericUnimplementedInput11) {
        return checkruntime.numericUnresolved(conditionFlavor950);
    }
    let numericNullInput12: boolean = false;
    if (input.kind === "Null") {
        numericNullInput12 = langruntime.checkedBool(true);
    }
    if (numericNullInput12) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        return { kind: "Value", value: numericVarNegated(value) };
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function sign2rsu(input: checkruntime.NumericValue): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput19: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput19 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput20: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput20 = langruntime.checkedBool(true);
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
    if (numericUnknownInput19 || numericUnimplementedInput20) {
        return checkruntime.numericUnresolved(conditionFlavor1490);
    }
    let numericNullInput21: boolean = false;
    if (input.kind === "Null") {
        numericNullInput21 = langruntime.checkedBool(true);
    }
    if (numericNullInput21) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        const kind: number = numericVarKind(value);
        if (kind === 3) {
            return checkruntime.makeNumericValue("NaN");
        }
        if (kind === 0 || numericVarSignum(value) < 0) {
            return checkruntime.makeNumericValue("-1");
        }
        if (kind === 2 || numericVarSignum(value) > 0) {
            return checkruntime.makeNumericValue("1");
        }
        return checkruntime.makeNumericValue("0");
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
function numericRoundValue(arg: checkruntime.NumericVar, requested: number, mode: number): checkruntime.NumericValue {
    arg = checkruntime.copyNumericVar(arg);
    requested = langruntime.checkedI32(requested);
    mode = langruntime.checkedI32(mode);
    if (!(numericVarKind(arg) === 1)) {
        return { kind: "Value", value: arg };
    }
    if (mode === 2) {
        return numericVarResult(numericVarCeil(arg));
    }
    if (mode === 3) {
        return numericVarResult(numericVarFloor(arg));
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
    let result: checkruntime.NumericVar = numericVarZero(0);
    if (mode === 1) {
        result = checkruntime.copyNumericVar(numericVarRound(arg, scale));
    }
    else {
        result = checkruntime.copyNumericVar(numericVarTrunc(arg, scale));
    }
    if (scale < 0) {
        result = checkruntime.copyNumericVar(numericVarRescaled(result, 0));
    }
    return numericVarResult(result);
}
export function roundMmpo(input: checkruntime.NumericValue): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput10: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput10 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput11: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput11 = langruntime.checkedBool(true);
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
    if (numericUnknownInput10 || numericUnimplementedInput11) {
        return checkruntime.numericUnresolved(conditionFlavor510);
    }
    let numericNullInput12: boolean = false;
    if (input.kind === "Null") {
        numericNullInput12 = langruntime.checkedBool(true);
    }
    if (numericNullInput12) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const work: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        return numericRoundValue(work, 0, 1);
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function roundOtcq(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput13: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput13 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput14: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput14 = langruntime.checkedBool(true);
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
    if ((numericUnknownInput13 || numericUnimplementedInput14) || (checkruntime.equalInt4Value(scale, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor690);
    }
    let numericNullInput15: boolean = false;
    if (input.kind === "Null") {
        numericNullInput15 = langruntime.checkedBool(true);
    }
    if (numericNullInput15 || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const work: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericRoundValue(work, precision, 1);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function truncDghz(input: checkruntime.NumericValue): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput16: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput16 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput17: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput17 = langruntime.checkedBool(true);
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
    if (numericUnknownInput16 || numericUnimplementedInput17) {
        return checkruntime.numericUnresolved(conditionFlavor840);
    }
    let numericNullInput18: boolean = false;
    if (input.kind === "Null") {
        numericNullInput18 = langruntime.checkedBool(true);
    }
    if (numericNullInput18) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const work: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        return numericRoundValue(work, 0, 0);
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
export function truncHay3(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    input = checkruntime.copyNumericValue(input);
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
    let numericUnknownInput19: boolean = false;
    if (input.kind === "Unknown") {
        numericUnknownInput19 = langruntime.checkedBool(true);
    }
    let numericUnimplementedInput20: boolean = false;
    if (input.kind === "Unimplemented") {
        numericUnimplementedInput20 = langruntime.checkedBool(true);
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
    if ((numericUnknownInput19 || numericUnimplementedInput20) || (checkruntime.equalInt4Value(scale, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unimplemented" }))) {
        return checkruntime.numericUnresolved(conditionFlavor1020);
    }
    let numericNullInput21: boolean = false;
    if (input.kind === "Null") {
        numericNullInput21 = langruntime.checkedBool(true);
    }
    if (numericNullInput21 || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const work: checkruntime.NumericVar = checkruntime.copyNumericVar(input.value);
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericRoundValue(work, precision, 0);
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
function numericWireDecimalDigit(character: string): number {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    if (code >= 48 && code <= 57) {
        return langruntime.checkedSignedSubtract(code, 48);
    }
    return langruntime.checkedSignedNegate(1);
}
const numericVarNbase = 10000;
const numericVarHalfNbase = 5000;
const numericVarDecDigits = 4;
const numericVarMulGuardDigits = 2;
const numericVarDivGuardDigits = 4;
const numericVarMinSigDigits = 16;
const numericVarMaxDisplayScale = 1000;
interface NumericVarWide {
    value: bigint;
}
function copyNumericVarWide(value: NumericVarWide): NumericVarWide {
    return { value: langruntime.checkedI64(value.value) };
}
function numericVarZero(dscale: number): checkruntime.NumericVar {
    dscale = langruntime.checkedI32(dscale);
    const digits: number[] = [];
    return { sign: 1, weight: 0, dscale: dscale, digits: digits };
}
function numericVarCount(value: checkruntime.NumericVar): number {
    return langruntime.checkedI32(langruntime.checkedIndex(value.digits.length));
}
function numericVarDigit(value: checkruntime.NumericVar, index: number): number {
    index = langruntime.checkedI32(index);
    if (index < 0 || index >= numericVarCount(value)) {
        return 0;
    }
    return (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(value.digits, langruntime.checkedIndex(langruntime.indexFromI32(index, 0))))));
}
function numericVarZeros(count: number): number[] {
    count = langruntime.checkedI32(count);
    let digits: number[] = [];
    let index: number = 0;
    while (index < count) {
        langruntime.pushIndex(digits, 0);
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    return digits;
}
function numericVarRoundPower(decimals: number): number {
    decimals = langruntime.checkedI32(decimals);
    if (decimals === 1) {
        return 1000;
    }
    if (decimals === 2) {
        return 100;
    }
    return 10;
}
function numericVarFromI64(value: bigint): checkruntime.NumericVar {
    value = langruntime.checkedI64(value);
    let sign: number = 1;
    let magnitude: bigint = value;
    if (value < 0n) {
        sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        magnitude = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, value));
    }
    let reversed: number[] = [];
    while (magnitude > 0n) {
        const next: bigint = langruntime.checkedI64Divide(magnitude, 10000n);
        langruntime.pushIndex(reversed, langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Subtract(magnitude, langruntime.checkedI64Multiply(next, 10000n)))))), 0));
        magnitude = langruntime.checkedI64(next);
    }
    let digits: number[] = [];
    let index: number = reversed.length;
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        langruntime.pushIndex(digits, langruntime.indexNumber(reversed, langruntime.checkedIndex(index)));
    }
    const count: number = langruntime.checkedI32(langruntime.checkedIndex(digits.length));
    if (count === 0) {
        return numericVarZero(0);
    }
    return { sign: sign, weight: langruntime.checkedSignedSubtract(count, 1), dscale: 0, digits: digits };
}
function numericVarStrip(value: checkruntime.NumericVar): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    let weight: number = value.weight;
    let start: number = 0;
    while (start < value.digits.length && (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(value.digits, langruntime.checkedIndex(start))))) === 0) {
        start = langruntime.checkedAdd(start, 1);
        weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
    }
    let end: number = value.digits.length;
    while (end > start && (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(value.digits, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))))) === 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let digits: number[] = [];
    let index: number = start;
    while (index < end) {
        langruntime.pushIndex(digits, langruntime.indexNumber(value.digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    let sign: number = value.sign;
    if (end === start) {
        sign = langruntime.checkedI32(1);
        weight = langruntime.checkedI32(0);
    }
    return { sign: sign, weight: weight, dscale: value.dscale, digits: digits };
}
function numericVarShifted(value: checkruntime.NumericVar, places: number): checkruntime.NumericVar {
    places = langruntime.checkedI32(places);
    let digits: number[] = [];
    let index: number = 0;
    while (index < value.digits.length) {
        langruntime.pushIndex(digits, langruntime.indexNumber(value.digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    return { sign: value.sign, weight: langruntime.checkedSignedAdd(value.weight, places), dscale: value.dscale, digits: digits };
}
function numericVarCmpAbs(left: checkruntime.NumericVar, right: checkruntime.NumericVar): number {
    const leftCount: number = numericVarCount(left);
    const rightCount: number = numericVarCount(right);
    let leftWeight: number = left.weight;
    let rightWeight: number = right.weight;
    let i1: number = 0;
    let i2: number = 0;
    while (leftWeight > rightWeight && i1 < leftCount) {
        if (!(numericVarDigit(left, i1) === 0)) {
            return 1;
        }
        i1 = langruntime.checkedI32(langruntime.checkedSignedAdd(i1, 1));
        leftWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(leftWeight, 1));
    }
    while (rightWeight > leftWeight && i2 < rightCount) {
        if (!(numericVarDigit(right, i2) === 0)) {
            return langruntime.checkedSignedNegate(1);
        }
        i2 = langruntime.checkedI32(langruntime.checkedSignedAdd(i2, 1));
        rightWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(rightWeight, 1));
    }
    if (leftWeight === rightWeight) {
        while (i1 < leftCount && i2 < rightCount) {
            const stat: number = langruntime.checkedSignedSubtract(numericVarDigit(left, i1), numericVarDigit(right, i2));
            i1 = langruntime.checkedI32(langruntime.checkedSignedAdd(i1, 1));
            i2 = langruntime.checkedI32(langruntime.checkedSignedAdd(i2, 1));
            if (stat > 0) {
                return 1;
            }
            if (stat < 0) {
                return langruntime.checkedSignedNegate(1);
            }
        }
    }
    while (i1 < leftCount) {
        if (!(numericVarDigit(left, i1) === 0)) {
            return 1;
        }
        i1 = langruntime.checkedI32(langruntime.checkedSignedAdd(i1, 1));
    }
    while (i2 < rightCount) {
        if (!(numericVarDigit(right, i2) === 0)) {
            return langruntime.checkedSignedNegate(1);
        }
        i2 = langruntime.checkedI32(langruntime.checkedSignedAdd(i2, 1));
    }
    return 0;
}
function numericVarCmp(left: checkruntime.NumericVar, right: checkruntime.NumericVar): number {
    if (numericVarCount(left) === 0) {
        if (numericVarCount(right) === 0) {
            return 0;
        }
        if (right.sign < 0) {
            return 1;
        }
        return langruntime.checkedSignedNegate(1);
    }
    if (numericVarCount(right) === 0) {
        if (left.sign > 0) {
            return 1;
        }
        return langruntime.checkedSignedNegate(1);
    }
    if (left.sign > 0) {
        if (right.sign < 0) {
            return 1;
        }
        return numericVarCmpAbs(left, right);
    }
    if (right.sign > 0) {
        return langruntime.checkedSignedNegate(1);
    }
    return numericVarCmpAbs(right, left);
}
function numericVarAddAbs(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    const leftCount: number = numericVarCount(left);
    const rightCount: number = numericVarCount(right);
    let resWeight: number = left.weight;
    if (right.weight > resWeight) {
        resWeight = langruntime.checkedI32(right.weight);
    }
    resWeight = langruntime.checkedI32(langruntime.checkedSignedAdd(resWeight, 1));
    let resDscale: number = left.dscale;
    if (right.dscale > resDscale) {
        resDscale = langruntime.checkedI32(right.dscale);
    }
    const rscale1: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(leftCount, left.weight), 1);
    const rscale2: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(rightCount, right.weight), 1);
    let resRscale: number = rscale1;
    if (rscale2 > resRscale) {
        resRscale = langruntime.checkedI32(rscale2);
    }
    let resNdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, resWeight), 1);
    if (resNdigits <= 0) {
        resNdigits = langruntime.checkedI32(1);
    }
    let digits: number[] = numericVarZeros(resNdigits);
    let i1: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, left.weight), 1);
    let i2: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, right.weight), 1);
    let carry: number = 0;
    let i: number = langruntime.checkedSignedSubtract(resNdigits, 1);
    while (i >= 0) {
        i1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(i1, 1));
        i2 = langruntime.checkedI32(langruntime.checkedSignedSubtract(i2, 1));
        carry = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(carry, numericVarDigit(left, i1)), numericVarDigit(right, i2)));
        let digit: number = carry;
        carry = langruntime.checkedI32(0);
        if (digit >= numericVarNbase) {
            digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(digit, numericVarNbase));
            carry = langruntime.checkedI32(1);
        }
        digits[langruntime.checkedIndexIn(digits, langruntime.indexFromI32(i, 0))] = langruntime.checkedIndex(langruntime.indexFromI32(digit, 0));
        i = langruntime.checkedI32(langruntime.checkedSignedSubtract(i, 1));
    }
    return numericVarStrip({ sign: 1, weight: resWeight, dscale: resDscale, digits: digits });
}
function numericVarSubAbs(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    const leftCount: number = numericVarCount(left);
    const rightCount: number = numericVarCount(right);
    const resWeight: number = left.weight;
    let resDscale: number = left.dscale;
    if (right.dscale > resDscale) {
        resDscale = langruntime.checkedI32(right.dscale);
    }
    const rscale1: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(leftCount, left.weight), 1);
    const rscale2: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(rightCount, right.weight), 1);
    let resRscale: number = rscale1;
    if (rscale2 > resRscale) {
        resRscale = langruntime.checkedI32(rscale2);
    }
    let resNdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, resWeight), 1);
    if (resNdigits <= 0) {
        resNdigits = langruntime.checkedI32(1);
    }
    let digits: number[] = numericVarZeros(resNdigits);
    let i1: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, left.weight), 1);
    let i2: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resRscale, right.weight), 1);
    let borrow: number = 0;
    let i: number = langruntime.checkedSignedSubtract(resNdigits, 1);
    while (i >= 0) {
        i1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(i1, 1));
        i2 = langruntime.checkedI32(langruntime.checkedSignedSubtract(i2, 1));
        borrow = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(borrow, numericVarDigit(left, i1)), numericVarDigit(right, i2)));
        let digit: number = borrow;
        borrow = langruntime.checkedI32(0);
        if (digit < 0) {
            digit = langruntime.checkedI32(langruntime.checkedSignedAdd(digit, numericVarNbase));
            borrow = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
        digits[langruntime.checkedIndexIn(digits, langruntime.indexFromI32(i, 0))] = langruntime.checkedIndex(langruntime.indexFromI32(digit, 0));
        i = langruntime.checkedI32(langruntime.checkedSignedSubtract(i, 1));
    }
    return numericVarStrip({ sign: 1, weight: resWeight, dscale: resDscale, digits: digits });
}
function numericVarSigned(value: checkruntime.NumericVar, sign: number): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    sign = langruntime.checkedI32(sign);
    return { sign: sign, weight: value.weight, dscale: value.dscale, digits: value.digits };
}
function numericVarSum(left: checkruntime.NumericVar, right: checkruntime.NumericVar, rightSign: number): checkruntime.NumericVar {
    rightSign = langruntime.checkedI32(rightSign);
    let dscale: number = left.dscale;
    if (right.dscale > dscale) {
        dscale = langruntime.checkedI32(right.dscale);
    }
    if (left.sign === rightSign) {
        return numericVarSigned(numericVarAddAbs(left, right), left.sign);
    }
    const order: number = numericVarCmpAbs(left, right);
    if (order === 0) {
        return numericVarZero(dscale);
    }
    if (order > 0) {
        return numericVarSigned(numericVarSubAbs(left, right), left.sign);
    }
    return numericVarSigned(numericVarSubAbs(right, left), rightSign);
}
function numericVarAdd(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    return numericVarSum(left, right, right.sign);
}
function numericVarSub(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    return numericVarSum(left, right, langruntime.checkedSignedSubtract(0, right.sign));
}
function numericVarRound(value: checkruntime.NumericVar, rscale: number): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    rscale = langruntime.checkedI32(rscale);
    const sign: number = value.sign;
    let weight: number = value.weight;
    let digits: number[] = value.digits;
    let di: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedAdd(weight, 1)), numericVarDecDigits), rscale);
    if (di < 0) {
        return numericVarZero(rscale);
    }
    const ndigits: number = langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(di, numericVarDecDigits), 1)), numericVarDecDigits);
    di = langruntime.checkedI32(langruntime.checkedSignedRemainder(di, numericVarDecDigits));
    let kept: number = langruntime.checkedI32(langruntime.checkedIndex(digits.length));
    let leading: number = 0;
    if (ndigits < kept || (ndigits === kept && di > 0)) {
        kept = langruntime.checkedI32(ndigits);
        let position: number = ndigits;
        let carry: number = 0;
        if (di === 0) {
            if ((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(langruntime.indexFromI32(ndigits, 0)))))) >= numericVarHalfNbase) {
                carry = langruntime.checkedI32(1);
            }
        }
        else {
            position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
            const last: number = langruntime.indexFromI32(position, 0);
            let pow10: number = numericVarRoundPower(di);
            const extra: number = langruntime.checkedSignedRemainder((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(last))))), pow10);
            digits[langruntime.checkedIndexIn(digits, last)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedSubtract((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(last))))), extra), 0));
            if (extra >= langruntime.checkedSignedDivide(pow10, 2)) {
                pow10 = langruntime.checkedI32(langruntime.checkedSignedAdd(pow10, (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(last)))))));
                if (pow10 >= numericVarNbase) {
                    pow10 = langruntime.checkedI32(langruntime.checkedSignedSubtract(pow10, numericVarNbase));
                    carry = langruntime.checkedI32(1);
                }
                digits[langruntime.checkedIndexIn(digits, last)] = langruntime.checkedIndex(langruntime.indexFromI32(pow10, 0));
            }
        }
        while (carry > 0) {
            position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
            if (position < 0) {
                leading = langruntime.checkedI32(carry);
                weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
                carry = langruntime.checkedI32(0);
            }
            else {
                const at: number = langruntime.indexFromI32(position, 0);
                carry = langruntime.checkedI32(langruntime.checkedSignedAdd(carry, (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(at)))))));
                if (carry >= numericVarNbase) {
                    digits[langruntime.checkedIndexIn(digits, at)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedSubtract(carry, numericVarNbase), 0));
                    carry = langruntime.checkedI32(1);
                }
                else {
                    digits[langruntime.checkedIndexIn(digits, at)] = langruntime.checkedIndex(langruntime.indexFromI32(carry, 0));
                    carry = langruntime.checkedI32(0);
                }
            }
        }
    }
    let rounded: number[] = [];
    if (leading > 0) {
        langruntime.pushIndex(rounded, langruntime.indexFromI32(leading, 0));
    }
    const end: number = langruntime.indexFromI32(kept, 0);
    let index: number = 0;
    while (index < end) {
        langruntime.pushIndex(rounded, langruntime.indexNumber(digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    return { sign: sign, weight: weight, dscale: rscale, digits: rounded };
}
function numericVarTrunc(value: checkruntime.NumericVar, rscale: number): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    rscale = langruntime.checkedI32(rscale);
    const sign: number = value.sign;
    const weight: number = value.weight;
    let digits: number[] = value.digits;
    let di: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedAdd(weight, 1)), numericVarDecDigits), rscale);
    if (di <= 0) {
        return numericVarZero(rscale);
    }
    const ndigits: number = langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(di, numericVarDecDigits), 1)), numericVarDecDigits);
    let kept: number = langruntime.checkedI32(langruntime.checkedIndex(digits.length));
    if (ndigits <= kept) {
        kept = langruntime.checkedI32(ndigits);
        di = langruntime.checkedI32(langruntime.checkedSignedRemainder(di, numericVarDecDigits));
        if (di > 0) {
            const last: number = langruntime.indexFromI32(langruntime.checkedSignedSubtract(ndigits, 1), 0);
            const pow10: number = numericVarRoundPower(di);
            const extra: number = langruntime.checkedSignedRemainder((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(last))))), pow10);
            digits[langruntime.checkedIndexIn(digits, last)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedSubtract((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(digits, langruntime.checkedIndex(last))))), extra), 0));
        }
    }
    let truncated: number[] = [];
    const end: number = langruntime.indexFromI32(kept, 0);
    let index: number = 0;
    while (index < end) {
        langruntime.pushIndex(truncated, langruntime.indexNumber(digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    return { sign: sign, weight: weight, dscale: rscale, digits: truncated };
}
function numericVarMul(left: checkruntime.NumericVar, right: checkruntime.NumericVar, rscale: number): checkruntime.NumericVar {
    rscale = langruntime.checkedI32(rscale);
    if (numericVarCount(left) > numericVarCount(right)) {
        return numericVarMul(right, left, rscale);
    }
    const var1ndigits: number = numericVarCount(left);
    const var2ndigits: number = numericVarCount(right);
    if (var1ndigits === 0) {
        return numericVarZero(rscale);
    }
    if (var1ndigits <= 6 && rscale === langruntime.checkedSignedAdd(left.dscale, right.dscale)) {
        return numericVarMulExact(left, right);
    }
    let resSign: number = 1;
    if (!(left.sign === right.sign)) {
        resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    let var1ndigitpairs: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(var1ndigits, 1)), 2);
    let var2ndigitpairs: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(var2ndigits, 1)), 2);
    let resNdigits: number = langruntime.checkedSignedAdd(var1ndigits, var2ndigits);
    let resNdigitpairs: number = langruntime.checkedSignedAdd(langruntime.checkedSignedDivide(resNdigits, 2), 1);
    const pairOffset: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(resNdigitpairs, var1ndigitpairs), var2ndigitpairs), 1);
    const resWeight: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(left.weight, right.weight), 1), langruntime.checkedSignedMultiply(2, resNdigitpairs)), resNdigits), langruntime.checkedSignedRemainder(var1ndigits, 2)), langruntime.checkedSignedRemainder(var2ndigits, 2));
    const maxdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resWeight, 1), langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits)), numericVarMulGuardDigits);
    const maxdigitpairs: number = langruntime.checkedSignedAdd(langruntime.checkedSignedDivide(maxdigits, 2), 1);
    if (maxdigitpairs < resNdigitpairs) {
        resNdigitpairs = langruntime.checkedI32(maxdigitpairs);
    }
    resNdigits = langruntime.checkedI32(langruntime.checkedSignedMultiply(2, resNdigitpairs));
    if (resNdigitpairs <= pairOffset) {
        return numericVarZero(rscale);
    }
    if (langruntime.checkedSignedSubtract(resNdigitpairs, pairOffset) < var1ndigitpairs) {
        var1ndigitpairs = langruntime.checkedI32(langruntime.checkedSignedSubtract(resNdigitpairs, pairOffset));
    }
    if (langruntime.checkedSignedSubtract(resNdigitpairs, pairOffset) < var2ndigitpairs) {
        var2ndigitpairs = langruntime.checkedI32(langruntime.checkedSignedSubtract(resNdigitpairs, pairOffset));
    }
    let slots: number[] = numericVarZeros(langruntime.checkedSignedAdd(resNdigits, 1));
    let high: number[] = [];
    let low: number[] = [];
    let i2: number = 0;
    while (i2 < var2ndigitpairs) {
        langruntime.pushIndex(high, langruntime.indexFromI32(numericVarDigit(right, langruntime.checkedSignedMultiply(2, i2)), 0));
        langruntime.pushIndex(low, langruntime.indexFromI32(numericVarDigit(right, langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(2, i2), 1)), 0));
        i2 = langruntime.checkedI32(langruntime.checkedSignedAdd(i2, 1));
    }
    let rows: number = 0;
    let i1: number = langruntime.checkedSignedSubtract(var1ndigitpairs, 1);
    while (i1 >= 0) {
        const a: number = numericVarDigit(left, langruntime.checkedSignedMultiply(2, i1));
        const b: number = numericVarDigit(left, langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(2, i1), 1));
        if (!(a === 0) || !(b === 0)) {
            if (rows === 10) {
                let carry: number = 0;
                let slot: number = slots.length;
                while (slot > 0) {
                    slot = langruntime.checkedIndex(langruntime.checkedSubtract(slot, 1));
                    let digit: number = langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(slot))))), carry);
                    carry = langruntime.checkedI32(0);
                    if (slot > 0 && digit >= numericVarNbase) {
                        carry = langruntime.checkedI32(langruntime.checkedSignedDivide(digit, numericVarNbase));
                        digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(digit, langruntime.checkedSignedMultiply(carry, numericVarNbase)));
                    }
                    slots[langruntime.checkedIndexIn(slots, slot)] = langruntime.checkedIndex(langruntime.indexFromI32(digit, 0));
                }
                rows = langruntime.checkedI32(0);
            }
            rows = langruntime.checkedI32(langruntime.checkedSignedAdd(rows, 1));
            let i2limit: number = var2ndigitpairs;
            if (langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(resNdigitpairs, i1), pairOffset) < i2limit) {
                i2limit = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(resNdigitpairs, i1), pairOffset));
            }
            const limit: number = langruntime.indexFromI32(i2limit, 0);
            const base: number = langruntime.indexFromI32(langruntime.checkedSignedMultiply(2, (langruntime.checkedSignedAdd(i1, pairOffset))), 0);
            let index: number = 0;
            while (index < limit) {
                const c: number = (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(high, langruntime.checkedIndex(index)))));
                const d: number = (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(low, langruntime.checkedIndex(index)))));
                const at: number = langruntime.checkedAdd(langruntime.checkedAdd(base, index), index);
                slots[langruntime.checkedIndexIn(slots, at)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(at))))), langruntime.checkedSignedMultiply(a, c)), 0));
                slots[langruntime.checkedIndexIn(slots, langruntime.checkedAdd(at, 1))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(langruntime.checkedAdd(at, 1)))))), langruntime.checkedSignedMultiply(a, d)), langruntime.checkedSignedMultiply(b, c)), 0));
                slots[langruntime.checkedIndexIn(slots, langruntime.checkedAdd(at, 2))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(langruntime.checkedAdd(at, 2)))))), langruntime.checkedSignedMultiply(b, d)), 0));
                index = langruntime.checkedAdd(index, 1);
            }
        }
        i1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(i1, 1));
    }
    let carry: number = 0;
    let slot: number = slots.length;
    while (slot > 0) {
        slot = langruntime.checkedIndex(langruntime.checkedSubtract(slot, 1));
        let digit: number = langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(slot))))), carry);
        carry = langruntime.checkedI32(0);
        if (slot > 0 && digit >= numericVarNbase) {
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(digit, numericVarNbase));
            digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(digit, langruntime.checkedSignedMultiply(carry, numericVarNbase)));
        }
        slots[langruntime.checkedIndexIn(slots, slot)] = langruntime.checkedIndex(langruntime.indexFromI32(digit, 0));
    }
    let digits: number[] = [];
    let weight: number = resWeight;
    if (!((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(slots, langruntime.checkedIndex(0))))) === 0)) {
        langruntime.pushIndex(digits, langruntime.indexNumber(slots, langruntime.checkedIndex(0)));
        weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
    }
    let index: number = 1;
    while (index < slots.length) {
        langruntime.pushIndex(digits, langruntime.indexNumber(slots, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    const product: checkruntime.NumericVar = { sign: resSign, weight: weight, dscale: rscale, digits: digits };
    return numericVarStrip(numericVarRound(product, rscale));
}
function numericVarMulExact(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    const var1ndigits: number = numericVarCount(left);
    const var2ndigits: number = numericVarCount(right);
    let resSign: number = 1;
    if (!(left.sign === right.sign)) {
        resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    const resNdigits: number = langruntime.checkedSignedAdd(var1ndigits, var2ndigits);
    let reversed: number[] = [];
    let carry: number = 0;
    let k: number = langruntime.checkedSignedSubtract(resNdigits, 1);
    while (k >= 1) {
        let term: number = carry;
        let i1: number = langruntime.checkedSignedSubtract(k, var2ndigits);
        if (i1 < 0) {
            i1 = langruntime.checkedI32(0);
        }
        while (i1 < var1ndigits && i1 <= langruntime.checkedSignedSubtract(k, 1)) {
            term = langruntime.checkedI32(langruntime.checkedSignedAdd(term, langruntime.checkedSignedMultiply(numericVarDigit(left, i1), numericVarDigit(right, langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(k, 1), i1)))));
            i1 = langruntime.checkedI32(langruntime.checkedSignedAdd(i1, 1));
        }
        langruntime.pushIndex(reversed, langruntime.indexFromI32(langruntime.checkedSignedRemainder(term, numericVarNbase), 0));
        carry = langruntime.checkedI32(langruntime.checkedSignedDivide(term, numericVarNbase));
        k = langruntime.checkedI32(langruntime.checkedSignedSubtract(k, 1));
    }
    langruntime.pushIndex(reversed, langruntime.indexFromI32(carry, 0));
    let low: number = 0;
    while (low < reversed.length && langruntime.indexNumber(reversed, langruntime.checkedIndex(low)) === 0) {
        low = langruntime.checkedAdd(low, 1);
    }
    let high: number = reversed.length;
    while (high > low && langruntime.indexNumber(reversed, langruntime.checkedIndex(langruntime.checkedSubtract(high, 1))) === 0) {
        high = langruntime.checkedIndex(langruntime.checkedSubtract(high, 1));
    }
    const dscale: number = langruntime.checkedSignedAdd(left.dscale, right.dscale);
    if (high === low) {
        return numericVarZero(dscale);
    }
    let digits: number[] = [];
    let index: number = high;
    while (index > low) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        langruntime.pushIndex(digits, langruntime.indexNumber(reversed, langruntime.checkedIndex(index)));
    }
    const dropped: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(reversed.length, high))));
    return { sign: resSign, weight: langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(left.weight, right.weight), 1), dropped), dscale: dscale, digits: digits };
}
function numericVarDivInt(value: checkruntime.NumericVar, ival: number, ivalWeight: number, rscale: number, round: boolean): checkruntime.NumericVar {
    ival = langruntime.checkedI32(ival);
    ivalWeight = langruntime.checkedI32(ivalWeight);
    rscale = langruntime.checkedI32(rscale);
    round = langruntime.checkedBool(round);
    const varNdigits: number = numericVarCount(value);
    if (varNdigits === 0) {
        return numericVarZero(rscale);
    }
    let resSign: number = 1;
    if (value.sign > 0) {
        if (ival < 0) {
            resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
    }
    else if (ival > 0) {
        resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    const resWeight: number = langruntime.checkedSignedSubtract(value.weight, ivalWeight);
    let resNdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resWeight, 1), langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits));
    if (resNdigits < 1) {
        resNdigits = langruntime.checkedI32(1);
    }
    if (round) {
        resNdigits = langruntime.checkedI32(langruntime.checkedSignedAdd(resNdigits, 1));
    }
    let divisor: bigint = BigInt(langruntime.checkedI32(ival));
    if (divisor < 0n) {
        divisor = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, divisor));
    }
    let digits: number[] = [];
    let carry: bigint = 0n;
    let i: number = 0;
    while (i < resNdigits) {
        const digit: bigint = BigInt(langruntime.checkedI32(numericVarDigit(value, i)));
        carry = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(carry, 10000n), digit));
        langruntime.pushIndex(digits, langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Divide(carry, divisor))))), 0));
        carry = langruntime.checkedI64(langruntime.checkedI64Remainder(carry, divisor));
        i = langruntime.checkedI32(langruntime.checkedSignedAdd(i, 1));
    }
    const quotient: checkruntime.NumericVar = { sign: resSign, weight: resWeight, dscale: rscale, digits: digits };
    if (round) {
        return numericVarStrip(numericVarRound(quotient, rscale));
    }
    return numericVarStrip(numericVarTrunc(quotient, rscale));
}
function numericVarDiv(left: checkruntime.NumericVar, right: checkruntime.NumericVar, rscale: number, round: boolean, exact: boolean): checkruntime.NumericVar {
    rscale = langruntime.checkedI32(rscale);
    round = langruntime.checkedBool(round);
    exact = langruntime.checkedBool(exact);
    if (exact || numericVarCount(right) <= langruntime.checkedSignedMultiply(2, (langruntime.checkedSignedAdd(numericVarDivGuardDigits, 2))) || numericVarCount(left) === 0) {
        return numericVarDivExact(left, right, rscale, round);
    }
    return numericVarDivApproximate(left, right, rscale, round);
}
function numericVarDivExact(left: checkruntime.NumericVar, right: checkruntime.NumericVar, rscale: number, round: boolean): checkruntime.NumericVar {
    rscale = langruntime.checkedI32(rscale);
    round = langruntime.checkedBool(round);
    const var1ndigits: number = numericVarCount(left);
    const var2ndigits: number = numericVarCount(right);
    if (var2ndigits <= 2) {
        let idivisor: number = numericVarDigit(right, 0);
        let idivisorWeight: number = right.weight;
        if (var2ndigits === 2) {
            idivisor = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(idivisor, numericVarNbase), numericVarDigit(right, 1)));
            idivisorWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(idivisorWeight, 1));
        }
        if (right.sign < 0) {
            idivisor = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, idivisor));
        }
        return numericVarDivInt(left, idivisor, idivisorWeight, rscale, round);
    }
    if (var1ndigits === 0) {
        return numericVarZero(rscale);
    }
    let resSign: number = 1;
    if (!(left.sign === right.sign)) {
        resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    const resWeight: number = langruntime.checkedSignedSubtract(left.weight, right.weight);
    let resNdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resWeight, 1), langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits));
    if (resNdigits < 1) {
        resNdigits = langruntime.checkedI32(1);
    }
    if (round) {
        resNdigits = langruntime.checkedI32(langruntime.checkedSignedAdd(resNdigits, 1));
    }
    let divNdigits: number = langruntime.checkedSignedAdd(resNdigits, var2ndigits);
    if (var1ndigits > divNdigits) {
        divNdigits = langruntime.checkedI32(var1ndigits);
    }
    let dividend: number[] = numericVarZeros(langruntime.checkedSignedAdd(divNdigits, 1));
    let divisor: number[] = numericVarZeros(langruntime.checkedSignedAdd(var2ndigits, 1));
    let index: number = 0;
    while (index < left.digits.length) {
        dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(index, 1))] = langruntime.checkedIndex(langruntime.indexNumber(left.digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    index = langruntime.checkedIndex(0);
    while (index < right.digits.length) {
        divisor[langruntime.checkedIndexIn(divisor, langruntime.checkedAdd(index, 1))] = langruntime.checkedIndex(langruntime.indexNumber(right.digits, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    const divisorEnd: number = langruntime.indexFromI32(var2ndigits, 0);
    if ((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(1))))) < numericVarHalfNbase) {
        const d: number = langruntime.checkedSignedDivide(numericVarNbase, (langruntime.checkedSignedAdd((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(1))))), 1)));
        let carry: number = 0;
        let i: number = divisorEnd;
        while (i > 0) {
            carry = langruntime.checkedI32(langruntime.checkedSignedAdd(carry, langruntime.checkedSignedMultiply((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(i))))), d)));
            divisor[langruntime.checkedIndexIn(divisor, i)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedRemainder(carry, numericVarNbase), 0));
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(carry, numericVarNbase));
            i = langruntime.checkedIndex(langruntime.checkedSubtract(i, 1));
        }
        carry = langruntime.checkedI32(0);
        let j: number = langruntime.checkedAdd(langruntime.indexFromI32(var1ndigits, 0), 1);
        while (j > 0) {
            j = langruntime.checkedIndex(langruntime.checkedSubtract(j, 1));
            carry = langruntime.checkedI32(langruntime.checkedSignedAdd(carry, langruntime.checkedSignedMultiply((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(j))))), d)));
            dividend[langruntime.checkedIndexIn(dividend, j)] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedRemainder(carry, numericVarNbase), 0));
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(carry, numericVarNbase));
        }
    }
    const divisor1: number = (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(1)))));
    const divisor2: number = (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(2)))));
    let resDigits: number[] = [];
    const resEnd: number = langruntime.indexFromI32(resNdigits, 0);
    let j: number = 0;
    while (j < resEnd) {
        const next2digits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(j))))), numericVarNbase), (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(langruntime.checkedAdd(j, 1)))))));
        let qhat: number = 0;
        if (!(next2digits === 0)) {
            if ((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(j))))) === divisor1) {
                qhat = langruntime.checkedI32(langruntime.checkedSignedSubtract(numericVarNbase, 1));
            }
            else {
                qhat = langruntime.checkedI32(langruntime.checkedSignedDivide(next2digits, divisor1));
            }
            while (langruntime.checkedSignedMultiply(divisor2, qhat) > langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedSubtract(next2digits, langruntime.checkedSignedMultiply(qhat, divisor1))), numericVarNbase), (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(langruntime.checkedAdd(j, 2)))))))) {
                qhat = langruntime.checkedI32(langruntime.checkedSignedSubtract(qhat, 1));
            }
            if (qhat > 0) {
                let borrow: number = 0;
                let i: number = langruntime.checkedAdd(divisorEnd, 1);
                while (i > 0) {
                    i = langruntime.checkedIndex(langruntime.checkedSubtract(i, 1));
                    const tmpResult: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(langruntime.checkedAdd(j, i)))))), borrow), langruntime.checkedSignedMultiply((langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(i))))), qhat));
                    borrow = langruntime.checkedI32(langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(numericVarNbase, 1), tmpResult)), numericVarNbase));
                    dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(j, i))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedAdd(tmpResult, langruntime.checkedSignedMultiply(borrow, numericVarNbase)), 0));
                }
                if (!(borrow === 0)) {
                    qhat = langruntime.checkedI32(langruntime.checkedSignedSubtract(qhat, 1));
                    let carry: number = 0;
                    i = langruntime.checkedIndex(langruntime.checkedAdd(divisorEnd, 1));
                    while (i > 0) {
                        i = langruntime.checkedIndex(langruntime.checkedSubtract(i, 1));
                        carry = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(carry, (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(dividend, langruntime.checkedIndex(langruntime.checkedAdd(j, i))))))), (langruntime.checkedI32(langruntime.checkedIndex(langruntime.indexNumber(divisor, langruntime.checkedIndex(i)))))));
                        if (carry >= numericVarNbase) {
                            dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(j, i))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedSubtract(carry, numericVarNbase), 0));
                            carry = langruntime.checkedI32(1);
                        }
                        else {
                            dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(j, i))] = langruntime.checkedIndex(langruntime.indexFromI32(carry, 0));
                            carry = langruntime.checkedI32(0);
                        }
                    }
                }
            }
        }
        langruntime.pushIndex(resDigits, langruntime.indexFromI32(qhat, 0));
        j = langruntime.checkedAdd(j, 1);
    }
    const quotient: checkruntime.NumericVar = { sign: resSign, weight: resWeight, dscale: rscale, digits: resDigits };
    if (round) {
        return numericVarStrip(numericVarRound(quotient, rscale));
    }
    return numericVarStrip(numericVarTrunc(quotient, rscale));
}
function numericVarWideDouble(value: bigint): number {
    value = langruntime.checkedI64(value);
    const high: bigint = langruntime.checkedI64Divide(value, 4294967296n);
    const rest: bigint = langruntime.checkedI64Subtract(value, langruntime.checkedI64Multiply(high, 4294967296n));
    const middle: bigint = langruntime.checkedI64Divide(rest, 65536n);
    const low: bigint = langruntime.checkedI64Subtract(rest, langruntime.checkedI64Multiply(middle, 65536n));
    const upper: number = Number(langruntime.checkedI32((Number(BigInt.asIntN(32, langruntime.checkedI64(high))))));
    const lower: number = langruntime.f64Add(langruntime.f64Multiply((Number(langruntime.checkedI32((Number(BigInt.asIntN(32, langruntime.checkedI64(middle))))))), 65536.0), (Number(langruntime.checkedI32((Number(BigInt.asIntN(32, langruntime.checkedI64(low))))))));
    return langruntime.f64Add(langruntime.f64Multiply(upper, 4294967296.0), lower);
}
function numericVarQuotientDigit(estimate: number): number {
    estimate = langruntime.checkedF64(estimate);
    if (estimate >= 0.0) {
        return langruntime.f64ToI32(estimate);
    }
    return langruntime.checkedSignedSubtract((langruntime.f64ToI32(estimate)), 1);
}
function numericVarWideCarry(digit: bigint): bigint {
    digit = langruntime.checkedI64(digit);
    if (digit < 0n) {
        return langruntime.checkedI64Subtract(langruntime.checkedI64Subtract(0n, (langruntime.checkedI64Divide((langruntime.checkedI64Subtract(langruntime.checkedI64Subtract(0n, digit), 1n)), 100000000n))), 1n);
    }
    if (digit >= 100000000n) {
        return langruntime.checkedI64Divide(digit, 100000000n);
    }
    return 0n;
}
function numericVarDivApproximate(left: checkruntime.NumericVar, right: checkruntime.NumericVar, rscale: number, round: boolean): checkruntime.NumericVar {
    rscale = langruntime.checkedI32(rscale);
    round = langruntime.checkedBool(round);
    const var1ndigits: number = numericVarCount(left);
    const var2ndigits: number = numericVarCount(right);
    let resSign: number = 1;
    if (!(left.sign === right.sign)) {
        resSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    const resWeight: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(left.weight, right.weight), 1);
    let resNdigits: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(resWeight, 1), langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits));
    if (resNdigits < 1) {
        resNdigits = langruntime.checkedI32(1);
    }
    if (round) {
        resNdigits = langruntime.checkedI32(langruntime.checkedSignedAdd(resNdigits, 1));
    }
    resNdigits = langruntime.checkedI32(langruntime.checkedSignedAdd(resNdigits, numericVarDivGuardDigits));
    let var1ndigitpairs: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(var1ndigits, 1)), 2);
    let var2ndigitpairs: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(var2ndigits, 1)), 2);
    const resNdigitpairs: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(resNdigits, 1)), 2);
    const divNdigitpairs: number = resNdigitpairs;
    if (divNdigitpairs < var1ndigitpairs) {
        var1ndigitpairs = langruntime.checkedI32(divNdigitpairs);
    }
    if (divNdigitpairs < var2ndigitpairs) {
        var2ndigitpairs = langruntime.checkedI32(divNdigitpairs);
    }
    let dividend: NumericVarWide[] = [];
    let i: number = 0;
    while (i <= divNdigitpairs) {
        let pair: bigint = 0n;
        if (i < var1ndigitpairs) {
            const first: bigint = BigInt(langruntime.checkedI32(numericVarDigit(left, langruntime.checkedSignedMultiply(2, i))));
            const second: bigint = BigInt(langruntime.checkedI32(numericVarDigit(left, langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(2, i), 1))));
            pair = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(first, 10000n), second));
        }
        langruntime.pushStruct(dividend, { value: pair }, copyNumericVarWide);
        i = langruntime.checkedI32(langruntime.checkedSignedAdd(i, 1));
    }
    let divisor: NumericVarWide[] = [];
    i = langruntime.checkedI32(0);
    while (i < var2ndigitpairs) {
        const first: bigint = BigInt(langruntime.checkedI32(numericVarDigit(right, langruntime.checkedSignedMultiply(2, i))));
        const second: bigint = BigInt(langruntime.checkedI32(numericVarDigit(right, langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(2, i), 1))));
        langruntime.pushStruct(divisor, { value: langruntime.checkedI64Add(langruntime.checkedI64Multiply(first, 10000n), second) }, copyNumericVarWide);
        i = langruntime.checkedI32(langruntime.checkedSignedAdd(i, 1));
    }
    let fdivisor: number = langruntime.f64Multiply(numericVarWideDouble(langruntime.indexStruct(divisor, langruntime.checkedIndex(0), copyNumericVarWide).value), 100000000.0);
    if (var2ndigitpairs > 1) {
        fdivisor = langruntime.checkedF64(langruntime.f64Add(fdivisor, numericVarWideDouble(langruntime.indexStruct(divisor, langruntime.checkedIndex(1), copyNumericVarWide).value)));
    }
    const fdivisorinverse: number = langruntime.f64Divide(1.0, fdivisor);
    const limit: bigint = langruntime.checkedI64Divide((langruntime.checkedI64Subtract(langruntime.checkedI64Subtract(9223372036854775807n, langruntime.checkedI64Divide(9223372036854775807n, 100000000n)), 1n)), 99999999n);
    let maxdiv: bigint = 1n;
    let qi: number = 0;
    while (qi < resNdigitpairs) {
        const at: number = langruntime.indexFromI32(qi, 0);
        let fdividend: number = langruntime.f64Multiply(numericVarWideDouble(langruntime.indexStruct(dividend, langruntime.checkedIndex(at), copyNumericVarWide).value), 100000000.0);
        fdividend = langruntime.checkedF64(langruntime.f64Add(fdividend, numericVarWideDouble(langruntime.indexStruct(dividend, langruntime.checkedIndex(langruntime.checkedAdd(at, 1)), copyNumericVarWide).value)));
        let qdigit: number = numericVarQuotientDigit(langruntime.f64Multiply(fdividend, fdivisorinverse));
        if (!(qdigit === 0)) {
            let magnitude: bigint = BigInt(langruntime.checkedI32(qdigit));
            if (magnitude < 0n) {
                magnitude = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, magnitude));
            }
            maxdiv = langruntime.checkedI64(langruntime.checkedI64Add(maxdiv, magnitude));
            if (maxdiv > limit) {
                let carry: bigint = 0n;
                let j: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(qi, var2ndigitpairs), 2);
                if (langruntime.checkedSignedSubtract(divNdigitpairs, 1) < j) {
                    j = langruntime.checkedI32(langruntime.checkedSignedSubtract(divNdigitpairs, 1));
                }
                while (j > qi) {
                    const index: number = langruntime.indexFromI32(j, 0);
                    let newdig: bigint = langruntime.checkedI64Add(langruntime.indexStruct(dividend, langruntime.checkedIndex(index), copyNumericVarWide).value, carry);
                    carry = langruntime.checkedI64(numericVarWideCarry(newdig));
                    newdig = langruntime.checkedI64(langruntime.checkedI64Subtract(newdig, langruntime.checkedI64Multiply(carry, 100000000n)));
                    dividend[langruntime.checkedIndexIn(dividend, index)] = copyNumericVarWide({ value: newdig });
                    j = langruntime.checkedI32(langruntime.checkedSignedSubtract(j, 1));
                }
                dividend[langruntime.checkedIndexIn(dividend, at)] = copyNumericVarWide({ value: langruntime.checkedI64Add(langruntime.indexStruct(dividend, langruntime.checkedIndex(at), copyNumericVarWide).value, carry) });
                maxdiv = langruntime.checkedI64(1n);
                fdividend = langruntime.checkedF64(langruntime.f64Multiply(numericVarWideDouble(langruntime.indexStruct(dividend, langruntime.checkedIndex(at), copyNumericVarWide).value), 100000000.0));
                fdividend = langruntime.checkedF64(langruntime.f64Add(fdividend, numericVarWideDouble(langruntime.indexStruct(dividend, langruntime.checkedIndex(langruntime.checkedAdd(at, 1)), copyNumericVarWide).value)));
                qdigit = langruntime.checkedI32(numericVarQuotientDigit(langruntime.f64Multiply(fdividend, fdivisorinverse)));
                magnitude = langruntime.checkedI64(BigInt(langruntime.checkedI32(qdigit)));
                if (magnitude < 0n) {
                    magnitude = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, magnitude));
                }
                maxdiv = langruntime.checkedI64(langruntime.checkedI64Add(maxdiv, magnitude));
            }
            if (!(qdigit === 0)) {
                let istop: number = var2ndigitpairs;
                if (langruntime.checkedSignedSubtract(divNdigitpairs, qi) < istop) {
                    istop = langruntime.checkedI32(langruntime.checkedSignedSubtract(divNdigitpairs, qi));
                }
                const stop: number = langruntime.indexFromI32(istop, 0);
                const wideQdigit: bigint = BigInt(langruntime.checkedI32(qdigit));
                let k: number = 0;
                while (k < stop) {
                    dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(at, k))] = copyNumericVarWide({ value: langruntime.checkedI64Subtract(langruntime.indexStruct(dividend, langruntime.checkedIndex(langruntime.checkedAdd(at, k)), copyNumericVarWide).value, langruntime.checkedI64Multiply(wideQdigit, langruntime.indexStruct(divisor, langruntime.checkedIndex(k), copyNumericVarWide).value)) });
                    k = langruntime.checkedAdd(k, 1);
                }
            }
        }
        const current: bigint = langruntime.indexStruct(dividend, langruntime.checkedIndex(at), copyNumericVarWide).value;
        const next: bigint = langruntime.indexStruct(dividend, langruntime.checkedIndex(langruntime.checkedAdd(at, 1)), copyNumericVarWide).value;
        const nextHigh: bigint = langruntime.checkedI64Divide(next, 100000000n);
        const nextLow: bigint = langruntime.checkedI64Subtract(next, langruntime.checkedI64Multiply(nextHigh, 100000000n));
        dividend[langruntime.checkedIndexIn(dividend, langruntime.checkedAdd(at, 1))] = copyNumericVarWide({ value: langruntime.checkedI64Add(langruntime.checkedI64Multiply((langruntime.checkedI64Add(current, nextHigh)), 100000000n), nextLow) });
        dividend[langruntime.checkedIndexIn(dividend, at)] = copyNumericVarWide({ value: BigInt(langruntime.checkedI32(qdigit)) });
        qi = langruntime.checkedI32(langruntime.checkedSignedAdd(qi, 1));
    }
    let digits: number[] = numericVarZeros(langruntime.checkedSignedMultiply(2, resNdigitpairs));
    let carry: bigint = 0n;
    let j: number = langruntime.checkedSignedSubtract(resNdigitpairs, 1);
    while (j >= 0) {
        const index: number = langruntime.indexFromI32(j, 0);
        let newdig: bigint = langruntime.checkedI64Add(langruntime.indexStruct(dividend, langruntime.checkedIndex(index), copyNumericVarWide).value, carry);
        carry = langruntime.checkedI64(numericVarWideCarry(newdig));
        newdig = langruntime.checkedI64(langruntime.checkedI64Subtract(newdig, langruntime.checkedI64Multiply(carry, 100000000n)));
        const pair: number = Number(BigInt.asIntN(32, langruntime.checkedI64(newdig)));
        digits[langruntime.checkedIndexIn(digits, langruntime.checkedAdd(index, index))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedDivide(pair, numericVarNbase), 0));
        digits[langruntime.checkedIndexIn(digits, langruntime.checkedAdd(langruntime.checkedAdd(index, index), 1))] = langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedRemainder(pair, numericVarNbase), 0));
        j = langruntime.checkedI32(langruntime.checkedSignedSubtract(j, 1));
    }
    const quotient: checkruntime.NumericVar = { sign: resSign, weight: resWeight, dscale: rscale, digits: digits };
    if (round) {
        return numericVarStrip(numericVarRound(quotient, rscale));
    }
    return numericVarStrip(numericVarTrunc(quotient, rscale));
}
function numericVarMod(left: checkruntime.NumericVar, right: checkruntime.NumericVar): checkruntime.NumericVar {
    const quotient: checkruntime.NumericVar = numericVarDiv(left, right, 0, false, true);
    const product: checkruntime.NumericVar = numericVarMul(right, quotient, right.dscale);
    return numericVarSub(left, product);
}
function numericVarResult(value: checkruntime.NumericVar): checkruntime.NumericValue {
    value = checkruntime.copyNumericVar(value);
    const stripped: checkruntime.NumericVar = numericVarStrip(value);
    if ((numericVarCount(stripped) > 0 && (stripped.weight > 32767 || stripped.weight < langruntime.checkedSignedNegate(32768))) || stripped.dscale > 16383) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    return { kind: "Value", value: stripped };
}
function numericVarRescaled(value: checkruntime.NumericVar, dscale: number): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    dscale = langruntime.checkedI32(dscale);
    return { sign: value.sign, weight: value.weight, dscale: dscale, digits: value.digits };
}
function numericVarCeil(value: checkruntime.NumericVar): checkruntime.NumericVar {
    const one: checkruntime.NumericVar = numericVarFromI64(1n);
    const truncated: checkruntime.NumericVar = numericVarTrunc(numericVarShifted(value, 0), 0);
    if (value.sign > 0 && !(numericVarCmp(value, truncated) === 0)) {
        return numericVarAdd(truncated, one);
    }
    return truncated;
}
function numericVarFloor(value: checkruntime.NumericVar): checkruntime.NumericVar {
    const one: checkruntime.NumericVar = numericVarFromI64(1n);
    const truncated: checkruntime.NumericVar = numericVarTrunc(numericVarShifted(value, 0), 0);
    if (value.sign < 0 && !(numericVarCmp(value, truncated) === 0)) {
        return numericVarSub(truncated, one);
    }
    return truncated;
}
function numericVarKind(value: checkruntime.NumericVar): number {
    if (value.sign === checkruntime.numericSignNan) {
        return 3;
    }
    if (value.sign === checkruntime.numericSignPinf) {
        return 2;
    }
    if (value.sign === checkruntime.numericSignNinf) {
        return 0;
    }
    return 1;
}
function numericVarSignum(value: checkruntime.NumericVar): number {
    if (numericVarCount(value) === 0) {
        return 0;
    }
    return value.sign;
}
function numericVarAbsolute(value: checkruntime.NumericVar): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    if (value.sign === checkruntime.numericSignNinf) {
        return checkruntime.numericVarSpecial(checkruntime.numericSignPinf);
    }
    if (value.sign === langruntime.checkedSignedNegate(1)) {
        return numericVarSigned(value, 1);
    }
    return value;
}
function numericVarNegated(value: checkruntime.NumericVar): checkruntime.NumericVar {
    value = checkruntime.copyNumericVar(value);
    if (value.sign === checkruntime.numericSignNinf) {
        return checkruntime.numericVarSpecial(checkruntime.numericSignPinf);
    }
    if (value.sign === checkruntime.numericSignPinf) {
        return checkruntime.numericVarSpecial(checkruntime.numericSignNinf);
    }
    if (value.sign === checkruntime.numericSignNan || numericVarCount(value) === 0) {
        return value;
    }
    const sign: number = langruntime.checkedSignedSubtract(0, value.sign);
    return numericVarSigned(value, sign);
}
function numericVarCompareValues(left: checkruntime.NumericVar, right: checkruntime.NumericVar): number {
    const leftKind: number = numericVarKind(left);
    const rightKind: number = numericVarKind(right);
    if (leftKind === 3) {
        if (rightKind === 3) {
            return 0;
        }
        return 1;
    }
    if (leftKind === 2) {
        if (rightKind === 3) {
            return langruntime.checkedSignedNegate(1);
        }
        if (rightKind === 2) {
            return 0;
        }
        return 1;
    }
    if (leftKind === 0) {
        if (rightKind === 0) {
            return 0;
        }
        return langruntime.checkedSignedNegate(1);
    }
    if (rightKind === 0) {
        return 1;
    }
    if (!(rightKind === 1)) {
        return langruntime.checkedSignedNegate(1);
    }
    return numericVarCmp(left, right);
}
const numericSupportRangeError = 3452547;
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
                return checkruntime.makeNumericValue("-Infinity");
            }
            if (parts.special === 2) {
                return checkruntime.makeNumericValue("Infinity");
            }
            return checkruntime.makeNumericValue("NaN");
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
            let result: checkruntime.NumericValue = checkruntime.makeNumericValue(number);
            if (negative) {
                result = checkruntime.copyNumericValue(numericUminusWcmy(result));
            }
            return result;
        }
    }
    return checkruntime.numericUnresolved(unresolvedFlavor);
}
