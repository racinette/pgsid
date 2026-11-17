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

// PostgreSQL's NumericVar, so its numeric algorithms port as written: base-NBASE digits,
// most significant first, the weight of the first digit, and the display scale. A zero has
// no digits. Where PostgreSQL computes an exact result, any exact method yields the same
// digits, so these routines use PostgreSQL's 32-bit forms and keep the translated targets on
// plain numbers. Where it approximates, by truncating a product or estimating a quotient, they
// reproduce PostgreSQL's arithmetic step for step.

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
package pg_catalog

import (
	checkruntime "example.com/pgsid-fixture/generated/go/pgsid/internal/numeric/checkruntime"
	langruntime "example.com/pgsid-fixture/generated/go/pgsid/internal/numeric/langruntime"
)

const sqlstateDivisionByZero = 3452582

const jsonpathParseRange = 3452547

type jsonpathScanSource struct {
	characters []rune
}

type jsonpathScanRead struct {
	kind  int
	end   int
	text  []rune
	error int
}

const jsonpathScanInt = 259
const jsonpathScanNumeric = 260

const jsonpathScanSyntax = 6819553

func jsonpathScanSpace(character rune) bool {
	character = langruntime.CheckedChar(character)
	return character == ' ' || character == '\t' || character == '\n' || character == '\r' || character == '\f'
}
func jsonpathScanSpecial(character rune) bool {
	character = langruntime.CheckedChar(character)
	return character == '?' || character == '%' || character == '$' || character == '.' || character == '[' || character == ']' || character == '{' || character == '}' || character == '(' || character == ')' || character == '|' || character == '&' || character == '!' || character == '=' || character == '<' || character == '>' || character == '@' || character == '#' || character == ',' || character == '*' || character == ':' || character == '-' || character == '+' || character == '/'
}
func jsonpathScanOther(character rune) bool {
	character = langruntime.CheckedChar(character)
	return jsonpathScanSpace(character) == false && jsonpathScanSpecial(character) == false && character != '\\' && character != '"'
}
func jsonpathScanHex(character rune) int {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	if code >= 48 && code <= 57 {
		return langruntime.CheckedSignedSubtract(code, 48)
	}
	if code >= 65 && code <= 70 {
		return langruntime.CheckedSignedSubtract(code, 55)
	}
	if code >= 97 && code <= 102 {
		return langruntime.CheckedSignedSubtract(code, 87)
	}
	return langruntime.CheckedSignedNegate(1)
}
func jsonpathScanDigits(source *jsonpathScanSource, begin int, radix int) int {
	begin = langruntime.CheckedIndex(begin)
	radix = langruntime.CheckedI32(radix)
	position := begin
	for position < len(source.characters) {
		digit := jsonpathScanHex(source.characters[position])
		if digit < 0 || digit >= radix {
			return position
		}
		position = langruntime.CheckedAdd(position, 1)
		if langruntime.CheckedAdd(position, 1) < len(source.characters) && source.characters[position] == '_' {
			next := jsonpathScanHex(source.characters[langruntime.CheckedAdd(position, 1)])
			if next >= 0 && next < radix {
				position = langruntime.CheckedAdd(position, 1)
			}
		}
	}
	return position
}
func jsonpathScanEmptyRead(kind int, end int, error int) jsonpathScanRead {
	kind = langruntime.CheckedI32(kind)
	end = langruntime.CheckedIndex(end)
	error = langruntime.CheckedIndex(error)
	text := []rune{}
	return jsonpathScanRead{kind: kind, end: end, text: text, error: error}
}
func jsonpathScanNumber(source *jsonpathScanSource, begin int) jsonpathScanRead {
	begin = langruntime.CheckedIndex(begin)
	integer := begin
	if source.characters[begin] == '0' {
		integer = langruntime.CheckedAdd(integer, 1)
	} else {
		integer = langruntime.CheckedIndex(jsonpathScanDigits(source, begin, 10))
	}
	decimal := begin
	if integer < len(source.characters) && source.characters[integer] == '.' {
		decimal = langruntime.CheckedIndex(jsonpathScanDigits(source, langruntime.CheckedAdd(integer, 1), 10))
	}
	base := integer
	if decimal > base {
		base = langruntime.CheckedIndex(decimal)
	}
	real := begin
	failedReal := begin
	if base > begin && base < len(source.characters) && (source.characters[base] == 'e' || source.characters[base] == 'E') {
		digits := langruntime.CheckedAdd(base, 1)
		if digits < len(source.characters) && (source.characters[digits] == '+' || source.characters[digits] == '-') {
			digits = langruntime.CheckedAdd(digits, 1)
			failedReal = langruntime.CheckedIndex(digits)
		}
		end := jsonpathScanDigits(source, digits, 10)
		if end > digits {
			real = langruntime.CheckedIndex(end)
		}
	}
	prefixed := begin
	if langruntime.CheckedAdd(begin, 2) < len(source.characters) && source.characters[begin] == '0' {
		prefix := source.characters[langruntime.CheckedAdd(begin, 1)]
		radix := 0
		if prefix == 'x' || prefix == 'X' {
			radix = langruntime.CheckedI32(16)
		}
		if prefix == 'o' || prefix == 'O' {
			radix = langruntime.CheckedI32(8)
		}
		if prefix == 'b' || prefix == 'B' {
			radix = langruntime.CheckedI32(2)
		}
		if radix > 0 {
			end := jsonpathScanDigits(source, langruntime.CheckedAdd(begin, 2), radix)
			if end > langruntime.CheckedAdd(begin, 2) {
				prefixed = langruntime.CheckedIndex(end)
			}
		}
	}
	kind := jsonpathScanInt
	end := integer
	if decimal > end {
		end = langruntime.CheckedIndex(decimal)
		kind = langruntime.CheckedI32(jsonpathScanNumeric)
	}
	if real > end {
		end = langruntime.CheckedIndex(real)
		kind = langruntime.CheckedI32(jsonpathScanNumeric)
	}
	if prefixed > end {
		end = langruntime.CheckedIndex(prefixed)
		kind = langruntime.CheckedI32(jsonpathScanInt)
	}
	junk := begin
	if integer > begin && integer < len(source.characters) && jsonpathScanOther(source.characters[integer]) {
		junk = langruntime.CheckedIndex(langruntime.CheckedAdd(integer, 1))
	}
	if decimal > begin && decimal < len(source.characters) && jsonpathScanOther(source.characters[decimal]) && langruntime.CheckedAdd(decimal, 1) > junk {
		junk = langruntime.CheckedIndex(langruntime.CheckedAdd(decimal, 1))
	}
	if real > begin && real < len(source.characters) && jsonpathScanOther(source.characters[real]) && langruntime.CheckedAdd(real, 1) > junk {
		junk = langruntime.CheckedIndex(langruntime.CheckedAdd(real, 1))
	}
	error := 0
	if failedReal > end {
		end = langruntime.CheckedIndex(failedReal)
		error = langruntime.CheckedIndex(jsonpathScanSyntax)
	}
	if junk > end {
		end = langruntime.CheckedIndex(junk)
		error = langruntime.CheckedIndex(jsonpathScanSyntax)
	}
	other := begin
	for other < len(source.characters) && jsonpathScanOther(source.characters[other]) {
		other = langruntime.CheckedAdd(other, 1)
	}
	if other > end || (other == end && other > begin && error != 0 && (int(langruntime.CheckedChar(source.characters[langruntime.CheckedSubtract(end, 1)]))) >= 128) {
		return jsonpathScanEmptyRead(0, begin, 0)
	}
	return jsonpathScanEmptyRead(kind, end, error)
}

func jsonpathRadixLiteral(source *jsonpathScanSource, radix int) checkruntime.TextValue {
	radix = langruntime.CheckedI32(radix)
	position := 2
	for position < len(source.characters) && (source.characters[position] == '0' || source.characters[position] == '_') {
		position = langruntime.CheckedAdd(position, 1)
	}
	if position == len(source.characters) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: "0"}
	}
	words := []int{}
	langruntime.CheckedAdd(len(words), 1)
	words = append(words, langruntime.CheckedIndex(0))
	for position < len(source.characters) {
		factor := int64(1)
		chunk := int64(0)
		base := int64(langruntime.CheckedI32(radix))
		for position < len(source.characters) && factor <= langruntime.CheckedI64Divide(int64(268435456), base) {
			character := source.characters[position]
			position = langruntime.CheckedAdd(position, 1)
			if character != '_' {
				digit := int64(langruntime.CheckedI32(jsonpathScanHex(character)))
				chunk = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(chunk, base), digit)
				factor = langruntime.CheckedI64Multiply(factor, base)
			}
		}
		index := 0
		carry := chunk
		for index < len(words) {
			word := int(int32(words[index]))
			combined := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(word))), factor), carry)
			words[index] = langruntime.CheckedIndex(langruntime.IndexFromI32(int(int32((langruntime.CheckedI64Remainder(combined, int64(10000))))), 0))
			carry = langruntime.CheckedI64Divide(combined, int64(10000))
			index = langruntime.CheckedAdd(index, 1)
		}
		for carry > int64(0) {
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, langruntime.CheckedIndex(langruntime.IndexFromI32(int(int32((langruntime.CheckedI64Remainder(carry, int64(10000))))), 0)))
			carry = langruntime.CheckedI64Divide(carry, int64(10000))
		}
		if len(words) > 32768 {
			return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(jsonpathParseRange)}
		}
	}
	output := langruntime.NewTextBuffer("")
	index := len(words)
	leading := true
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		word := int(int32(words[index]))
		divisor := 1000
		for divisor > 0 {
			digit := langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(word, divisor)), 10)
			if leading == false || digit > 0 || divisor == 1 {
				output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(48, digit)), ' ')))...)
				leading = false
			}
			divisor = langruntime.CheckedI32(langruntime.CheckedSignedDivide(divisor, 10))
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: string(output)}
}
func jsonpathNumericLiteral(input string) checkruntime.TextValue {
	input = langruntime.CheckedString(input)
	source := jsonpathScanSource{characters: []rune(input)}
	if len(source.characters) > 2 && source.characters[0] == '0' {
		prefix := source.characters[1]
		radix := 0
		if prefix == 'x' || prefix == 'X' {
			radix = langruntime.CheckedI32(16)
		}
		if prefix == 'o' || prefix == 'O' {
			radix = langruntime.CheckedI32(8)
		}
		if prefix == 'b' || prefix == 'B' {
			radix = langruntime.CheckedI32(2)
		}
		if radix > 0 {
			return jsonpathRadixLiteral(&source, radix)
		}
	}
	clean := langruntime.NewTextBuffer("")
	if source.characters[0] == '.' {
		clean = append(clean, string(langruntime.CheckedChar('0'))...)
	}
	position := 0
	for position < len(source.characters) {
		character := source.characters[position]
		appendCharacter := character != '_'
		if character == '.' && (langruntime.CheckedAdd(position, 1) == len(source.characters) || source.characters[langruntime.CheckedAdd(position, 1)] == 'e' || source.characters[langruntime.CheckedAdd(position, 1)] == 'E') {
			appendCharacter = false
		}
		if appendCharacter {
			clean = append(clean, string(langruntime.CheckedChar(character))...)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	parsed := checkruntime.JsonbFromText(checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: string(clean)})
	return checkruntime.JsonbToText(parsed)
}

func numericCompare(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.Int4Value {
	unresolvedFlavor := 0
	if left.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	conditionFlavor134 := unresolvedFlavor
	if left.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor134 < 1 {
			conditionFlavor134 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor134 = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor134 < 1 {
			conditionFlavor134 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor134 = langruntime.CheckedI32(2)
	}
	if (left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) || (right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) {
		return checkruntime.Int4Unresolved(conditionFlavor134)
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			a := checkruntime.NumericParts(leftValue)
			b := checkruntime.NumericParts(rightValue)
			if a.Valid == false || b.Valid == false {
				return checkruntime.Int4Unresolved(unresolvedFlavor)
			}
			if a.Special < b.Special {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a.Special > b.Special {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			if a.Special != 1 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			if a.Sign < b.Sign {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a.Sign > b.Sign {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			if a.Sign == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			if a.Weight < b.Weight {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, a.Sign)}
			}
			if a.Weight > b.Weight {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: a.Sign}
			}
			leftChars := []rune(leftValue)
			rightChars := []rune(rightValue)
			i := a.First
			j := b.First
			for i < a.End || j < b.End {
				for i < a.End && (leftChars[i] == '.' || leftChars[i] == '_') {
					i = langruntime.CheckedAdd(i, 1)
				}
				for j < b.End && (rightChars[j] == '.' || rightChars[j] == '_') {
					j = langruntime.CheckedAdd(j, 1)
				}
				x := '0'
				y := '0'
				if i < a.End {
					x = langruntime.CheckedChar(leftChars[i])
					i = langruntime.CheckedAdd(i, 1)
				}
				if j < b.End {
					y = langruntime.CheckedChar(rightChars[j])
					j = langruntime.CheckedAdd(j, 1)
				}
				xCode := int(langruntime.CheckedChar(x))
				yCode := int(langruntime.CheckedChar(y))
				if xCode < yCode {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, a.Sign)}
				}
				if xCode > yCode {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: a.Sign}
				}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Unresolved(unresolvedFlavor)
}
func NumericEqFw7r(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	unresolvedFlavor := 0
	if left.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	conditionFlavor964 := unresolvedFlavor
	if result.Kind == checkruntime.Int4ValueUnknown {
		if conditionFlavor964 < 1 {
			conditionFlavor964 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == checkruntime.Int4ValueUnimplemented {
		conditionFlavor964 = langruntime.CheckedI32(2)
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnimplemented}) {
		return checkruntime.BoolUnresolved(conditionFlavor964)
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolUnresolved(unresolvedFlavor)
}

func numericArithmetic(left checkruntime.NumericValue, right checkruntime.NumericValue, mode int) checkruntime.NumericValue {
	mode = langruntime.CheckedI32(mode)
	unresolvedFlavor := 0
	if left.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor2854 := unresolvedFlavor
	if left.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor2854 < 1 {
			conditionFlavor2854 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor2854 = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor2854 < 1 {
			conditionFlavor2854 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor2854 = langruntime.CheckedI32(2)
	}
	if (left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) || (right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor2854)
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			b := langruntime.CheckedString(right.Value)
			first := numericWorkFromValue(a)
			second := numericWorkFromValue(b)
			if first.valid == false || second.valid == false {
				return checkruntime.NumericUnresolved(unresolvedFlavor)
			}
			if first.special == 3 || second.special == 3 {
				return checkruntime.MakeNumericValue("NaN")
			}
			if first.special != 1 || second.special != 1 {
				leftSign := first.sign
				rightSign := second.sign
				if first.special == 0 {
					leftSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if first.special == 2 {
					leftSign = langruntime.CheckedI32(1)
				}
				if second.special == 0 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if second.special == 2 {
					rightSign = langruntime.CheckedI32(1)
				}
				if mode == 1 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, rightSign))
				}
				resultSign := leftSign
				if mode == 2 {
					resultSign = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(leftSign, rightSign))
				} else if first.special == 1 {
					resultSign = langruntime.CheckedI32(rightSign)
				} else if second.special != 1 && leftSign != rightSign {
					resultSign = langruntime.CheckedI32(0)
				}
				if resultSign == 0 {
					return checkruntime.MakeNumericValue("NaN")
				}
				if resultSign < 0 {
					return checkruntime.MakeNumericValue("-Infinity")
				}
				return checkruntime.MakeNumericValue("Infinity")
			}
			leftVar := numericVarFromWork(&first)
			rightVar := numericVarFromWork(&second)
			if mode == 2 {
				rscale := langruntime.CheckedSignedAdd(leftVar.dscale, rightVar.dscale)
				product := numericVarMul(&leftVar, &rightVar, rscale)
				if product.dscale > 16383 {
					return numericVarResult(numericVarRound(product, 16383))
				}
				return numericVarResult(product)
			}
			if mode == 1 {
				result := numericVarSub(&leftVar, &rightVar)
				return numericVarResult(result)
			}
			result := numericVarAdd(&leftVar, &rightVar)
			return numericVarResult(result)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
func NumericAddO3d7(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 0)
}
func NumericSubYs09(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 1)
}
func NumericMulBj4l(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 2)
}

func numericDivisionScale(left *numericVar, right *numericVar) int {
	weight1 := 0
	firstdigit1 := 0
	i := 0
	for i < numericVarCount(left) {
		firstdigit1 = langruntime.CheckedI32(numericVarDigit(left, i))
		if firstdigit1 != 0 {
			weight1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(left.weight, i))
			i = langruntime.CheckedI32(numericVarCount(left))
		}
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	weight2 := 0
	firstdigit2 := 0
	i = langruntime.CheckedI32(0)
	for i < numericVarCount(right) {
		firstdigit2 = langruntime.CheckedI32(numericVarDigit(right, i))
		if firstdigit2 != 0 {
			weight2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(right.weight, i))
			i = langruntime.CheckedI32(numericVarCount(right))
		}
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	qweight := langruntime.CheckedSignedSubtract(weight1, weight2)
	if firstdigit1 <= firstdigit2 {
		qweight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(qweight, 1))
	}
	rscale := langruntime.CheckedSignedSubtract(numericVarMinSigDigits, langruntime.CheckedSignedMultiply(qweight, numericVarDecDigits))
	if rscale < left.dscale {
		rscale = langruntime.CheckedI32(left.dscale)
	}
	if rscale < right.dscale {
		rscale = langruntime.CheckedI32(right.dscale)
	}
	if rscale < 0 {
		rscale = langruntime.CheckedI32(0)
	}
	if rscale > numericVarMaxDisplayScale {
		rscale = langruntime.CheckedI32(numericVarMaxDisplayScale)
	}
	return rscale
}
func numericDivision(left checkruntime.NumericValue, right checkruntime.NumericValue, mode int) checkruntime.NumericValue {
	mode = langruntime.CheckedI32(mode)
	unresolvedFlavor := 0
	if left.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor1864 := unresolvedFlavor
	if left.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor1864 < 1 {
			conditionFlavor1864 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor1864 = langruntime.CheckedI32(2)
	}
	if right.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor1864 < 1 {
			conditionFlavor1864 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor1864 = langruntime.CheckedI32(2)
	}
	if (left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) || (right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor1864)
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		first := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			second := langruntime.CheckedString(right.Value)
			a := numericWorkFromValue(first)
			b := numericWorkFromValue(second)
			if a.valid == false || b.valid == false {
				return checkruntime.NumericUnresolved(unresolvedFlavor)
			}
			if a.special == 3 || b.special == 3 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
			}
			if b.special == 1 && b.sign == 0 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if a.special != 1 {
				if mode == 2 || b.special != 1 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
				}
				sign := b.sign
				if a.special == 0 {
					sign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, sign))
				}
				if sign < 0 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
				}
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
			}
			if b.special != 1 {
				if mode == 2 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: first}
				}
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
			}
			dividend := numericVarFromWork(&a)
			divisor := numericVarFromWork(&b)
			if mode == 2 {
				result := numericVarMod(&dividend, &divisor)
				return numericVarResult(result)
			}
			if mode == 1 {
				result := numericVarDiv(&dividend, &divisor, 0, false, true)
				return numericVarResult(result)
			}
			rscale := numericDivisionScale(&dividend, &divisor)
			result := numericVarDiv(&dividend, &divisor, rscale, true, true)
			return numericVarResult(result)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
func NumericDivPnzm(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 0)
}

func NumericMod8ywz(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 2)
}

func NumericAbs6g5e(input checkruntime.NumericValue) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor420 := unresolvedFlavor
	if input.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor420 < 1 {
			conditionFlavor420 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor420 = langruntime.CheckedI32(2)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented}) {
		return checkruntime.NumericUnresolved(conditionFlavor420)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericUnresolved(unresolvedFlavor)
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		if sign < 0 {
			sign = langruntime.CheckedI32(1)
		}
		if special == 0 {
			special = langruntime.CheckedI32(2)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
func NumericCmp6h4s(input checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.Int4Value {
	result := numericCompare(input, right)
	return result
}

func NumericUminusWcmy(input checkruntime.NumericValue) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor950 := unresolvedFlavor
	if input.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor950 < 1 {
			conditionFlavor950 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor950 = langruntime.CheckedI32(2)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented}) {
		return checkruntime.NumericUnresolved(conditionFlavor950)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericUnresolved(unresolvedFlavor)
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		sign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, sign))
		if special == 0 {
			special = langruntime.CheckedI32(2)
		} else if special == 2 {
			special = langruntime.CheckedI32(0)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func Sign2rsu(input checkruntime.NumericValue) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor1490 := unresolvedFlavor
	if input.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor1490 < 1 {
			conditionFlavor1490 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor1490 = langruntime.CheckedI32(2)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented}) {
		return checkruntime.NumericUnresolved(conditionFlavor1490)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericUnresolved(unresolvedFlavor)
		}
		if work.special == 3 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
		}
		if work.special == 0 || work.sign < 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-1"}
		}
		if work.special == 2 || work.sign > 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func numericRoundValue(work numericWork, requested int, mode int) checkruntime.NumericValue {
	work = copynumericWork(work)
	requested = langruntime.CheckedI32(requested)
	mode = langruntime.CheckedI32(mode)
	if work.valid == false {
		return checkruntime.NumericUnresolved(0)
	}
	if work.special != 1 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
	}
	arg := numericVarFromWork(&work)
	if mode == 2 {
		return numericVarResult(numericVarCeil(&arg))
	}
	if mode == 3 {
		return numericVarResult(numericVarFloor(&arg))
	}
	scale := requested
	minimum := langruntime.CheckedSignedNegate(131072)
	if mode == 1 {
		minimum = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(minimum, 1))
	}
	if scale < minimum {
		scale = langruntime.CheckedI32(minimum)
	}
	if scale > 16383 {
		scale = langruntime.CheckedI32(16383)
	}
	result := numericVarZero(0)
	if mode == 1 {
		result = copynumericVar(numericVarRound(arg, scale))
	} else {
		result = copynumericVar(numericVarTrunc(arg, scale))
	}
	if scale < 0 {
		result = copynumericVar(numericVarRescaled(result, 0))
	}
	return numericVarResult(result)
}

func RoundOtcq(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if scale.Kind == checkruntime.Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if scale.Kind == checkruntime.Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if scale.Kind == checkruntime.Int4ValueError {
		error := scale.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor690 := unresolvedFlavor
	if input.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor690 < 1 {
			conditionFlavor690 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor690 = langruntime.CheckedI32(2)
	}
	if scale.Kind == checkruntime.Int4ValueUnknown {
		if conditionFlavor690 < 1 {
			conditionFlavor690 = langruntime.CheckedI32(1)
		}
	}
	if scale.Kind == checkruntime.Int4ValueUnimplemented {
		conditionFlavor690 = langruntime.CheckedI32(2)
	}
	if (input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) || (scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor690)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericUnresolved(unresolvedFlavor)
		}
		if scale.Kind == checkruntime.Int4ValueValue {
			precision := langruntime.CheckedI32(scale.Value)
			return numericRoundValue(work, precision, 1)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func TruncHay3(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if scale.Kind == checkruntime.Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if scale.Kind == checkruntime.Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if scale.Kind == checkruntime.Int4ValueError {
		error := scale.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	conditionFlavor1020 := unresolvedFlavor
	if input.Kind == checkruntime.NumericValueUnknown {
		if conditionFlavor1020 < 1 {
			conditionFlavor1020 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.NumericValueUnimplemented {
		conditionFlavor1020 = langruntime.CheckedI32(2)
	}
	if scale.Kind == checkruntime.Int4ValueUnknown {
		if conditionFlavor1020 < 1 {
			conditionFlavor1020 = langruntime.CheckedI32(1)
		}
	}
	if scale.Kind == checkruntime.Int4ValueUnimplemented {
		conditionFlavor1020 = langruntime.CheckedI32(2)
	}
	if (input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnimplemented})) || (scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor1020)
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericUnresolved(unresolvedFlavor)
		}
		if scale.Kind == checkruntime.Int4ValueValue {
			precision := langruntime.CheckedI32(scale.Value)
			return numericRoundValue(work, precision, 0)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func numericWireDecimalDigit(character rune) int {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	if code >= 48 && code <= 57 {
		return langruntime.CheckedSignedSubtract(code, 48)
	}
	return langruntime.CheckedSignedNegate(1)
}
func numericWireScale(input string) int {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	index := 0
	point := false
	power := false
	fractional := 0
	exponent := 0
	sign := 1
	for index < len(chars) {
		digit := numericWireDecimalDigit(chars[index])
		if digit >= 0 {
			if power {
				exponent = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(exponent, 10), digit))
			} else if point {
				fractional = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fractional, 1))
			}
		} else if chars[index] == '.' {
			point = true
		} else if chars[index] == 'e' || chars[index] == 'E' {
			power = true
		} else if power && chars[index] == '-' {
			sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	scale := langruntime.CheckedSignedSubtract(fractional, langruntime.CheckedSignedMultiply(exponent, sign))
	if scale < 0 {
		return 0
	}
	return scale
}

type numericVar struct {
	sign   int
	weight int
	dscale int
	digits []int
}

func copynumericVar(value numericVar) numericVar {
	return numericVar{sign: langruntime.CheckedI32(value.sign), weight: langruntime.CheckedI32(value.weight), dscale: langruntime.CheckedI32(value.dscale), digits: langruntime.CheckedIndices(value.digits)}
}

const numericVarNbase = 10000
const numericVarHalfNbase = 5000
const numericVarDecDigits = 4
const numericVarMulGuardDigits = 2
const numericVarDivGuardDigits = 4
const numericVarMinSigDigits = 16
const numericVarMaxDisplayScale = 1000

type numericVarWide struct {
	value int64
}

func copynumericVarWide(value numericVarWide) numericVarWide {
	return numericVarWide{value: value.value}
}
func numericVarZero(dscale int) numericVar {
	dscale = langruntime.CheckedI32(dscale)
	digits := []int{}
	return numericVar{sign: 1, weight: 0, dscale: dscale, digits: digits}
}
func numericVarCount(value *numericVar) int {
	return int(int32(len(value.digits)))
}
func numericVarDigit(value *numericVar, index int) int {
	index = langruntime.CheckedI32(index)
	if index < 0 || index >= numericVarCount(value) {
		return 0
	}
	return (int(int32(value.digits[langruntime.IndexFromI32(index, 0)])))
}
func numericVarZeros(count int) []int {
	count = langruntime.CheckedI32(count)
	digits := []int{}
	index := 0
	for index < count {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(0))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	return digits
}
func numericVarRoundPower(decimals int) int {
	decimals = langruntime.CheckedI32(decimals)
	if decimals == 1 {
		return 1000
	}
	if decimals == 2 {
		return 100
	}
	return 10
}
func numericVarFromWork(work *numericWork) numericVar {
	if work.sign == 0 {
		return numericVarZero(work.scale)
	}
	characters := []rune(work.digits)
	weight := langruntime.CheckedSignedDivide(work.weight, numericVarDecDigits)
	if langruntime.CheckedSignedRemainder(work.weight, numericVarDecDigits) < 0 {
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	leading := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(weight, numericVarDecDigits), numericVarDecDigits), 1), work.weight)
	emitted := 0
	digits := []int{}
	value := 0
	index := 0
	for index < len(characters) || langruntime.CheckedSignedRemainder(emitted, numericVarDecDigits) != 0 {
		decimal := 0
		if leading > 0 {
			leading = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(leading, 1))
		} else if index < len(characters) {
			decimal = langruntime.CheckedI32(numericWireDecimalDigit(characters[index]))
			index = langruntime.CheckedAdd(index, 1)
		}
		value = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(value, 10), decimal))
		emitted = langruntime.CheckedI32(langruntime.CheckedSignedAdd(emitted, 1))
		if langruntime.CheckedSignedRemainder(emitted, numericVarDecDigits) == 0 {
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedIndex(langruntime.IndexFromI32(value, 0)))
			value = langruntime.CheckedI32(0)
		}
	}
	return numericVarStrip(numericVar{sign: work.sign, weight: weight, dscale: work.scale, digits: digits})
}
func numericWorkFromVar(value *numericVar) numericWork {
	scale := value.dscale
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	decimals := langruntime.NewTextBuffer("")
	weight := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(value.weight, numericVarDecDigits), numericVarDecDigits), 1)
	index := 0
	for index < len(value.digits) {
		word := (int(int32(value.digits[index])))
		place := 1000
		for place > 0 {
			digit := langruntime.CheckedSignedDivide(word, place)
			word = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(word, place))
			if string(decimals) == "" && digit == 0 {
				weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
			} else {
				decimals = append(decimals, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))...)
			}
			place = langruntime.CheckedI32(langruntime.CheckedSignedDivide(place, 10))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	characters := []rune(string(decimals))
	end := len(characters)
	for end > 0 && characters[langruntime.CheckedSubtract(end, 1)] == '0' {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	digits := langruntime.NewTextBuffer("")
	index = langruntime.CheckedIndex(0)
	for index < end {
		digits = append(digits, string(langruntime.CheckedChar(characters[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	sign := value.sign
	if end == 0 {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: string(digits)}
}
func numericVarFromI64(value int64) numericVar {
	sign := 1
	magnitude := value
	if value < int64(0) {
		sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		magnitude = langruntime.CheckedI64Subtract(int64(0), value)
	}
	reversed := []int{}
	for magnitude > int64(0) {
		next := langruntime.CheckedI64Divide(magnitude, int64(10000))
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedIndex(langruntime.IndexFromI32(int(int32((langruntime.CheckedI64Subtract(magnitude, langruntime.CheckedI64Multiply(next, int64(10000)))))), 0)))
		magnitude = next
	}
	digits := []int{}
	index := len(reversed)
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(reversed[index]))
	}
	count := int(int32(len(digits)))
	if count == 0 {
		return numericVarZero(0)
	}
	return numericVar{sign: sign, weight: langruntime.CheckedSignedSubtract(count, 1), dscale: 0, digits: digits}
}
func numericVarStrip(value numericVar) numericVar {
	value = copynumericVar(value)
	weight := value.weight
	start := 0
	for start < len(value.digits) && (int(int32(value.digits[start]))) == 0 {
		start = langruntime.CheckedAdd(start, 1)
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	end := len(value.digits)
	for end > start && (int(int32(value.digits[langruntime.CheckedSubtract(end, 1)]))) == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	digits := []int{}
	index := start
	for index < end {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(value.digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	sign := value.sign
	if end == start {
		sign = langruntime.CheckedI32(1)
		weight = langruntime.CheckedI32(0)
	}
	return numericVar{sign: sign, weight: weight, dscale: value.dscale, digits: digits}
}
func numericVarShifted(value *numericVar, places int) numericVar {
	places = langruntime.CheckedI32(places)
	digits := []int{}
	index := 0
	for index < len(value.digits) {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(value.digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return numericVar{sign: value.sign, weight: langruntime.CheckedSignedAdd(value.weight, places), dscale: value.dscale, digits: digits}
}
func numericVarCmpAbs(left *numericVar, right *numericVar) int {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	leftWeight := left.weight
	rightWeight := right.weight
	i1 := 0
	i2 := 0
	for leftWeight > rightWeight && i1 < leftCount {
		if numericVarDigit(left, i1) != 0 {
			return 1
		}
		i1 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i1, 1))
		leftWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(leftWeight, 1))
	}
	for rightWeight > leftWeight && i2 < rightCount {
		if numericVarDigit(right, i2) != 0 {
			return langruntime.CheckedSignedNegate(1)
		}
		i2 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i2, 1))
		rightWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(rightWeight, 1))
	}
	if leftWeight == rightWeight {
		for i1 < leftCount && i2 < rightCount {
			stat := langruntime.CheckedSignedSubtract(numericVarDigit(left, i1), numericVarDigit(right, i2))
			i1 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i1, 1))
			i2 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i2, 1))
			if stat > 0 {
				return 1
			}
			if stat < 0 {
				return langruntime.CheckedSignedNegate(1)
			}
		}
	}
	for i1 < leftCount {
		if numericVarDigit(left, i1) != 0 {
			return 1
		}
		i1 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i1, 1))
	}
	for i2 < rightCount {
		if numericVarDigit(right, i2) != 0 {
			return langruntime.CheckedSignedNegate(1)
		}
		i2 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i2, 1))
	}
	return 0
}
func numericVarCmp(left *numericVar, right *numericVar) int {
	if numericVarCount(left) == 0 {
		if numericVarCount(right) == 0 {
			return 0
		}
		if right.sign < 0 {
			return 1
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if numericVarCount(right) == 0 {
		if left.sign > 0 {
			return 1
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if left.sign > 0 {
		if right.sign < 0 {
			return 1
		}
		return numericVarCmpAbs(left, right)
	}
	if right.sign > 0 {
		return langruntime.CheckedSignedNegate(1)
	}
	return numericVarCmpAbs(right, left)
}
func numericVarAddAbs(left *numericVar, right *numericVar) numericVar {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	resWeight := left.weight
	if right.weight > resWeight {
		resWeight = langruntime.CheckedI32(right.weight)
	}
	resWeight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resWeight, 1))
	resDscale := left.dscale
	if right.dscale > resDscale {
		resDscale = langruntime.CheckedI32(right.dscale)
	}
	rscale1 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(leftCount, left.weight), 1)
	rscale2 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(rightCount, right.weight), 1)
	resRscale := rscale1
	if rscale2 > resRscale {
		resRscale = langruntime.CheckedI32(rscale2)
	}
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, resWeight), 1)
	if resNdigits <= 0 {
		resNdigits = langruntime.CheckedI32(1)
	}
	digits := numericVarZeros(resNdigits)
	i1 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, left.weight), 1)
	i2 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, right.weight), 1)
	carry := 0
	i := langruntime.CheckedSignedSubtract(resNdigits, 1)
	for i >= 0 {
		i1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i1, 1))
		i2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i2, 1))
		carry = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(carry, numericVarDigit(left, i1)), numericVarDigit(right, i2)))
		digit := carry
		carry = langruntime.CheckedI32(0)
		if digit >= numericVarNbase {
			digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(digit, numericVarNbase))
			carry = langruntime.CheckedI32(1)
		}
		digits[langruntime.IndexFromI32(i, 0)] = langruntime.CheckedIndex(langruntime.IndexFromI32(digit, 0))
		i = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i, 1))
	}
	return numericVarStrip(numericVar{sign: 1, weight: resWeight, dscale: resDscale, digits: digits})
}
func numericVarSubAbs(left *numericVar, right *numericVar) numericVar {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	resWeight := left.weight
	resDscale := left.dscale
	if right.dscale > resDscale {
		resDscale = langruntime.CheckedI32(right.dscale)
	}
	rscale1 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(leftCount, left.weight), 1)
	rscale2 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(rightCount, right.weight), 1)
	resRscale := rscale1
	if rscale2 > resRscale {
		resRscale = langruntime.CheckedI32(rscale2)
	}
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, resWeight), 1)
	if resNdigits <= 0 {
		resNdigits = langruntime.CheckedI32(1)
	}
	digits := numericVarZeros(resNdigits)
	i1 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, left.weight), 1)
	i2 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, right.weight), 1)
	borrow := 0
	i := langruntime.CheckedSignedSubtract(resNdigits, 1)
	for i >= 0 {
		i1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i1, 1))
		i2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i2, 1))
		borrow = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(borrow, numericVarDigit(left, i1)), numericVarDigit(right, i2)))
		digit := borrow
		borrow = langruntime.CheckedI32(0)
		if digit < 0 {
			digit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(digit, numericVarNbase))
			borrow = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
		digits[langruntime.IndexFromI32(i, 0)] = langruntime.CheckedIndex(langruntime.IndexFromI32(digit, 0))
		i = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i, 1))
	}
	return numericVarStrip(numericVar{sign: 1, weight: resWeight, dscale: resDscale, digits: digits})
}
func numericVarSigned(value numericVar, sign int) numericVar {
	value = copynumericVar(value)
	sign = langruntime.CheckedI32(sign)
	return numericVar{sign: sign, weight: value.weight, dscale: value.dscale, digits: value.digits}
}
func numericVarSum(left *numericVar, right *numericVar, rightSign int) numericVar {
	rightSign = langruntime.CheckedI32(rightSign)
	dscale := left.dscale
	if right.dscale > dscale {
		dscale = langruntime.CheckedI32(right.dscale)
	}
	if left.sign == rightSign {
		return numericVarSigned(numericVarAddAbs(left, right), left.sign)
	}
	order := numericVarCmpAbs(left, right)
	if order == 0 {
		return numericVarZero(dscale)
	}
	if order > 0 {
		return numericVarSigned(numericVarSubAbs(left, right), left.sign)
	}
	return numericVarSigned(numericVarSubAbs(right, left), rightSign)
}
func numericVarAdd(left *numericVar, right *numericVar) numericVar {
	return numericVarSum(left, right, right.sign)
}
func numericVarSub(left *numericVar, right *numericVar) numericVar {
	return numericVarSum(left, right, langruntime.CheckedSignedSubtract(0, right.sign))
}
func numericVarRound(value numericVar, rscale int) numericVar {
	value = copynumericVar(value)
	rscale = langruntime.CheckedI32(rscale)
	sign := value.sign
	weight := value.weight
	digits := value.digits
	di := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(weight, 1)), numericVarDecDigits), rscale)
	if di < 0 {
		return numericVarZero(rscale)
	}
	ndigits := langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(di, numericVarDecDigits), 1)), numericVarDecDigits)
	di = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(di, numericVarDecDigits))
	kept := int(int32(len(digits)))
	leading := 0
	if ndigits < kept || (ndigits == kept && di > 0) {
		kept = langruntime.CheckedI32(ndigits)
		position := ndigits
		carry := 0
		if di == 0 {
			if (int(int32(digits[langruntime.IndexFromI32(ndigits, 0)]))) >= numericVarHalfNbase {
				carry = langruntime.CheckedI32(1)
			}
		} else {
			position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
			last := langruntime.IndexFromI32(position, 0)
			pow10 := numericVarRoundPower(di)
			extra := langruntime.CheckedSignedRemainder((int(int32(digits[last]))), pow10)
			digits[last] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedSubtract((int(int32(digits[last]))), extra), 0))
			if extra >= langruntime.CheckedSignedDivide(pow10, 2) {
				pow10 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(pow10, (int(int32(digits[last])))))
				if pow10 >= numericVarNbase {
					pow10 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(pow10, numericVarNbase))
					carry = langruntime.CheckedI32(1)
				}
				digits[last] = langruntime.CheckedIndex(langruntime.IndexFromI32(pow10, 0))
			}
		}
		for carry > 0 {
			position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
			if position < 0 {
				leading = langruntime.CheckedI32(carry)
				weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
				carry = langruntime.CheckedI32(0)
			} else {
				at := langruntime.IndexFromI32(position, 0)
				carry = langruntime.CheckedI32(langruntime.CheckedSignedAdd(carry, (int(int32(digits[at])))))
				if carry >= numericVarNbase {
					digits[at] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedSubtract(carry, numericVarNbase), 0))
					carry = langruntime.CheckedI32(1)
				} else {
					digits[at] = langruntime.CheckedIndex(langruntime.IndexFromI32(carry, 0))
					carry = langruntime.CheckedI32(0)
				}
			}
		}
	}
	rounded := []int{}
	if leading > 0 {
		langruntime.CheckedAdd(len(rounded), 1)
		rounded = append(rounded, langruntime.CheckedIndex(langruntime.IndexFromI32(leading, 0)))
	}
	end := langruntime.IndexFromI32(kept, 0)
	index := 0
	for index < end {
		langruntime.CheckedAdd(len(rounded), 1)
		rounded = append(rounded, langruntime.CheckedIndex(digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return numericVar{sign: sign, weight: weight, dscale: rscale, digits: rounded}
}
func numericVarTrunc(value numericVar, rscale int) numericVar {
	value = copynumericVar(value)
	rscale = langruntime.CheckedI32(rscale)
	sign := value.sign
	weight := value.weight
	digits := value.digits
	di := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(weight, 1)), numericVarDecDigits), rscale)
	if di <= 0 {
		return numericVarZero(rscale)
	}
	ndigits := langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(di, numericVarDecDigits), 1)), numericVarDecDigits)
	kept := int(int32(len(digits)))
	if ndigits <= kept {
		kept = langruntime.CheckedI32(ndigits)
		di = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(di, numericVarDecDigits))
		if di > 0 {
			last := langruntime.IndexFromI32(langruntime.CheckedSignedSubtract(ndigits, 1), 0)
			pow10 := numericVarRoundPower(di)
			extra := langruntime.CheckedSignedRemainder((int(int32(digits[last]))), pow10)
			digits[last] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedSubtract((int(int32(digits[last]))), extra), 0))
		}
	}
	truncated := []int{}
	end := langruntime.IndexFromI32(kept, 0)
	index := 0
	for index < end {
		langruntime.CheckedAdd(len(truncated), 1)
		truncated = append(truncated, langruntime.CheckedIndex(digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return numericVar{sign: sign, weight: weight, dscale: rscale, digits: truncated}
}
func numericVarMul(left *numericVar, right *numericVar, rscale int) numericVar {
	rscale = langruntime.CheckedI32(rscale)
	if numericVarCount(left) > numericVarCount(right) {
		return numericVarMul(right, left, rscale)
	}
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	if var1ndigits == 0 {
		return numericVarZero(rscale)
	}
	if var1ndigits <= 6 && rscale == langruntime.CheckedSignedAdd(left.dscale, right.dscale) {
		return numericVarMulExact(left, right)
	}
	resSign := 1
	if left.sign != right.sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	var1ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var1ndigits, 1)), 2)
	var2ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var2ndigits, 1)), 2)
	resNdigits := langruntime.CheckedSignedAdd(var1ndigits, var2ndigits)
	resNdigitpairs := langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide(resNdigits, 2), 1)
	pairOffset := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(resNdigitpairs, var1ndigitpairs), var2ndigitpairs), 1)
	resWeight := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.weight, right.weight), 1), langruntime.CheckedSignedMultiply(2, resNdigitpairs)), resNdigits), langruntime.CheckedSignedRemainder(var1ndigits, 2)), langruntime.CheckedSignedRemainder(var2ndigits, 2))
	maxdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resWeight, 1), langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits)), numericVarMulGuardDigits)
	maxdigitpairs := langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide(maxdigits, 2), 1)
	if maxdigitpairs < resNdigitpairs {
		resNdigitpairs = langruntime.CheckedI32(maxdigitpairs)
	}
	resNdigits = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(2, resNdigitpairs))
	if resNdigitpairs <= pairOffset {
		return numericVarZero(rscale)
	}
	if langruntime.CheckedSignedSubtract(resNdigitpairs, pairOffset) < var1ndigitpairs {
		var1ndigitpairs = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(resNdigitpairs, pairOffset))
	}
	if langruntime.CheckedSignedSubtract(resNdigitpairs, pairOffset) < var2ndigitpairs {
		var2ndigitpairs = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(resNdigitpairs, pairOffset))
	}
	slots := numericVarZeros(langruntime.CheckedSignedAdd(resNdigits, 1))
	high := []int{}
	low := []int{}
	i2 := 0
	for i2 < var2ndigitpairs {
		langruntime.CheckedAdd(len(high), 1)
		high = append(high, langruntime.CheckedIndex(langruntime.IndexFromI32(numericVarDigit(right, langruntime.CheckedSignedMultiply(2, i2)), 0)))
		langruntime.CheckedAdd(len(low), 1)
		low = append(low, langruntime.CheckedIndex(langruntime.IndexFromI32(numericVarDigit(right, langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(2, i2), 1)), 0)))
		i2 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i2, 1))
	}
	rows := 0
	i1 := langruntime.CheckedSignedSubtract(var1ndigitpairs, 1)
	for i1 >= 0 {
		a := numericVarDigit(left, langruntime.CheckedSignedMultiply(2, i1))
		b := numericVarDigit(left, langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(2, i1), 1))
		if a != 0 || b != 0 {
			if rows == 10 {
				carry := 0
				slot := len(slots)
				for slot > 0 {
					slot = langruntime.CheckedIndex(langruntime.CheckedSubtract(slot, 1))
					digit := langruntime.CheckedSignedAdd((int(int32(slots[slot]))), carry)
					carry = langruntime.CheckedI32(0)
					if slot > 0 && digit >= numericVarNbase {
						carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(digit, numericVarNbase))
						digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(digit, langruntime.CheckedSignedMultiply(carry, numericVarNbase)))
					}
					slots[slot] = langruntime.CheckedIndex(langruntime.IndexFromI32(digit, 0))
				}
				rows = langruntime.CheckedI32(0)
			}
			rows = langruntime.CheckedI32(langruntime.CheckedSignedAdd(rows, 1))
			i2limit := var2ndigitpairs
			if langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(resNdigitpairs, i1), pairOffset) < i2limit {
				i2limit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(resNdigitpairs, i1), pairOffset))
			}
			limit := langruntime.IndexFromI32(i2limit, 0)
			base := langruntime.IndexFromI32(langruntime.CheckedSignedMultiply(2, (langruntime.CheckedSignedAdd(i1, pairOffset))), 0)
			index := 0
			for index < limit {
				c := (int(int32(high[index])))
				d := (int(int32(low[index])))
				at := langruntime.CheckedAdd(langruntime.CheckedAdd(base, index), index)
				slots[at] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedAdd((int(int32(slots[at]))), langruntime.CheckedSignedMultiply(a, c)), 0))
				slots[langruntime.CheckedAdd(at, 1)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd((int(int32(slots[langruntime.CheckedAdd(at, 1)]))), langruntime.CheckedSignedMultiply(a, d)), langruntime.CheckedSignedMultiply(b, c)), 0))
				slots[langruntime.CheckedAdd(at, 2)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedAdd((int(int32(slots[langruntime.CheckedAdd(at, 2)]))), langruntime.CheckedSignedMultiply(b, d)), 0))
				index = langruntime.CheckedAdd(index, 1)
			}
		}
		i1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(i1, 1))
	}
	carry := 0
	slot := len(slots)
	for slot > 0 {
		slot = langruntime.CheckedIndex(langruntime.CheckedSubtract(slot, 1))
		digit := langruntime.CheckedSignedAdd((int(int32(slots[slot]))), carry)
		carry = langruntime.CheckedI32(0)
		if slot > 0 && digit >= numericVarNbase {
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(digit, numericVarNbase))
			digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(digit, langruntime.CheckedSignedMultiply(carry, numericVarNbase)))
		}
		slots[slot] = langruntime.CheckedIndex(langruntime.IndexFromI32(digit, 0))
	}
	digits := []int{}
	weight := resWeight
	if (int(int32(slots[0]))) != 0 {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(slots[0]))
		weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
	}
	index := 1
	for index < len(slots) {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(slots[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	product := numericVar{sign: resSign, weight: weight, dscale: rscale, digits: digits}
	return numericVarStrip(numericVarRound(product, rscale))
}
func numericVarMulExact(left *numericVar, right *numericVar) numericVar {
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	resSign := 1
	if left.sign != right.sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resNdigits := langruntime.CheckedSignedAdd(var1ndigits, var2ndigits)
	reversed := []int{}
	carry := 0
	k := langruntime.CheckedSignedSubtract(resNdigits, 1)
	for k >= 1 {
		term := carry
		i1 := langruntime.CheckedSignedSubtract(k, var2ndigits)
		if i1 < 0 {
			i1 = langruntime.CheckedI32(0)
		}
		for i1 < var1ndigits && i1 <= langruntime.CheckedSignedSubtract(k, 1) {
			term = langruntime.CheckedI32(langruntime.CheckedSignedAdd(term, langruntime.CheckedSignedMultiply(numericVarDigit(left, i1), numericVarDigit(right, langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(k, 1), i1)))))
			i1 = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i1, 1))
		}
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(term, numericVarNbase), 0)))
		carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(term, numericVarNbase))
		k = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(k, 1))
	}
	langruntime.CheckedAdd(len(reversed), 1)
	reversed = append(reversed, langruntime.CheckedIndex(langruntime.IndexFromI32(carry, 0)))
	low := 0
	for low < len(reversed) && reversed[low] == 0 {
		low = langruntime.CheckedAdd(low, 1)
	}
	high := len(reversed)
	for high > low && reversed[langruntime.CheckedSubtract(high, 1)] == 0 {
		high = langruntime.CheckedIndex(langruntime.CheckedSubtract(high, 1))
	}
	dscale := langruntime.CheckedSignedAdd(left.dscale, right.dscale)
	if high == low {
		return numericVarZero(dscale)
	}
	digits := []int{}
	index := high
	for index > low {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(reversed[index]))
	}
	dropped := int(int32((langruntime.CheckedSubtract(len(reversed), high))))
	return numericVar{sign: resSign, weight: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.weight, right.weight), 1), dropped), dscale: dscale, digits: digits}
}
func numericVarDivInt(value *numericVar, ival int, ivalWeight int, rscale int, round bool) numericVar {
	ival = langruntime.CheckedI32(ival)
	ivalWeight = langruntime.CheckedI32(ivalWeight)
	rscale = langruntime.CheckedI32(rscale)
	varNdigits := numericVarCount(value)
	if varNdigits == 0 {
		return numericVarZero(rscale)
	}
	resSign := 1
	if value.sign > 0 {
		if ival < 0 {
			resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
	} else if ival > 0 {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedSubtract(value.weight, ivalWeight)
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resWeight, 1), langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits))
	if resNdigits < 1 {
		resNdigits = langruntime.CheckedI32(1)
	}
	if round {
		resNdigits = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resNdigits, 1))
	}
	divisor := int64(langruntime.CheckedI32(ival))
	if divisor < int64(0) {
		divisor = langruntime.CheckedI64Subtract(int64(0), divisor)
	}
	digits := []int{}
	carry := int64(0)
	i := 0
	for i < resNdigits {
		digit := int64(langruntime.CheckedI32(numericVarDigit(value, i)))
		carry = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(carry, int64(10000)), digit)
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(langruntime.IndexFromI32(int(int32((langruntime.CheckedI64Divide(carry, divisor)))), 0)))
		carry = langruntime.CheckedI64Remainder(carry, divisor)
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	quotient := numericVar{sign: resSign, weight: resWeight, dscale: rscale, digits: digits}
	if round {
		return numericVarStrip(numericVarRound(quotient, rscale))
	}
	return numericVarStrip(numericVarTrunc(quotient, rscale))
}
func numericVarDiv(left *numericVar, right *numericVar, rscale int, round bool, exact bool) numericVar {
	rscale = langruntime.CheckedI32(rscale)
	if exact || numericVarCount(right) <= langruntime.CheckedSignedMultiply(2, (langruntime.CheckedSignedAdd(numericVarDivGuardDigits, 2))) || numericVarCount(left) == 0 {
		return numericVarDivExact(left, right, rscale, round)
	}
	return numericVarDivApproximate(left, right, rscale, round)
}
func numericVarDivExact(left *numericVar, right *numericVar, rscale int, round bool) numericVar {
	rscale = langruntime.CheckedI32(rscale)
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	if var2ndigits <= 2 {
		idivisor := numericVarDigit(right, 0)
		idivisorWeight := right.weight
		if var2ndigits == 2 {
			idivisor = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(idivisor, numericVarNbase), numericVarDigit(right, 1)))
			idivisorWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(idivisorWeight, 1))
		}
		if right.sign < 0 {
			idivisor = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, idivisor))
		}
		return numericVarDivInt(left, idivisor, idivisorWeight, rscale, round)
	}
	if var1ndigits == 0 {
		return numericVarZero(rscale)
	}
	resSign := 1
	if left.sign != right.sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedSubtract(left.weight, right.weight)
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resWeight, 1), langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits))
	if resNdigits < 1 {
		resNdigits = langruntime.CheckedI32(1)
	}
	if round {
		resNdigits = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resNdigits, 1))
	}
	divNdigits := langruntime.CheckedSignedAdd(resNdigits, var2ndigits)
	if var1ndigits > divNdigits {
		divNdigits = langruntime.CheckedI32(var1ndigits)
	}
	dividend := numericVarZeros(langruntime.CheckedSignedAdd(divNdigits, 1))
	divisor := numericVarZeros(langruntime.CheckedSignedAdd(var2ndigits, 1))
	index := 0
	for index < len(left.digits) {
		dividend[langruntime.CheckedAdd(index, 1)] = langruntime.CheckedIndex(left.digits[index])
		index = langruntime.CheckedAdd(index, 1)
	}
	index = langruntime.CheckedIndex(0)
	for index < len(right.digits) {
		divisor[langruntime.CheckedAdd(index, 1)] = langruntime.CheckedIndex(right.digits[index])
		index = langruntime.CheckedAdd(index, 1)
	}
	divisorEnd := langruntime.IndexFromI32(var2ndigits, 0)
	if (int(int32(divisor[1]))) < numericVarHalfNbase {
		d := langruntime.CheckedSignedDivide(numericVarNbase, (langruntime.CheckedSignedAdd((int(int32(divisor[1]))), 1)))
		carry := 0
		i := divisorEnd
		for i > 0 {
			carry = langruntime.CheckedI32(langruntime.CheckedSignedAdd(carry, langruntime.CheckedSignedMultiply((int(int32(divisor[i]))), d)))
			divisor[i] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(carry, numericVarNbase), 0))
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(carry, numericVarNbase))
			i = langruntime.CheckedIndex(langruntime.CheckedSubtract(i, 1))
		}
		carry = langruntime.CheckedI32(0)
		j := langruntime.CheckedAdd(langruntime.IndexFromI32(var1ndigits, 0), 1)
		for j > 0 {
			j = langruntime.CheckedIndex(langruntime.CheckedSubtract(j, 1))
			carry = langruntime.CheckedI32(langruntime.CheckedSignedAdd(carry, langruntime.CheckedSignedMultiply((int(int32(dividend[j]))), d)))
			dividend[j] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(carry, numericVarNbase), 0))
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(carry, numericVarNbase))
		}
	}
	divisor1 := (int(int32(divisor[1])))
	divisor2 := (int(int32(divisor[2])))
	resDigits := []int{}
	resEnd := langruntime.IndexFromI32(resNdigits, 0)
	j := 0
	for j < resEnd {
		next2digits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((int(int32(dividend[j]))), numericVarNbase), (int(int32(dividend[langruntime.CheckedAdd(j, 1)]))))
		qhat := 0
		if next2digits != 0 {
			if (int(int32(dividend[j]))) == divisor1 {
				qhat = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(numericVarNbase, 1))
			} else {
				qhat = langruntime.CheckedI32(langruntime.CheckedSignedDivide(next2digits, divisor1))
			}
			for langruntime.CheckedSignedMultiply(divisor2, qhat) > langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedSubtract(next2digits, langruntime.CheckedSignedMultiply(qhat, divisor1))), numericVarNbase), (int(int32(dividend[langruntime.CheckedAdd(j, 2)])))) {
				qhat = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(qhat, 1))
			}
			if qhat > 0 {
				borrow := 0
				i := langruntime.CheckedAdd(divisorEnd, 1)
				for i > 0 {
					i = langruntime.CheckedIndex(langruntime.CheckedSubtract(i, 1))
					tmpResult := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract((int(int32(dividend[langruntime.CheckedAdd(j, i)]))), borrow), langruntime.CheckedSignedMultiply((int(int32(divisor[i]))), qhat))
					borrow = langruntime.CheckedI32(langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(numericVarNbase, 1), tmpResult)), numericVarNbase))
					dividend[langruntime.CheckedAdd(j, i)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedAdd(tmpResult, langruntime.CheckedSignedMultiply(borrow, numericVarNbase)), 0))
				}
				if borrow != 0 {
					qhat = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(qhat, 1))
					carry := 0
					i = langruntime.CheckedIndex(langruntime.CheckedAdd(divisorEnd, 1))
					for i > 0 {
						i = langruntime.CheckedIndex(langruntime.CheckedSubtract(i, 1))
						carry = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(carry, (int(int32(dividend[langruntime.CheckedAdd(j, i)])))), (int(int32(divisor[i])))))
						if carry >= numericVarNbase {
							dividend[langruntime.CheckedAdd(j, i)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedSubtract(carry, numericVarNbase), 0))
							carry = langruntime.CheckedI32(1)
						} else {
							dividend[langruntime.CheckedAdd(j, i)] = langruntime.CheckedIndex(langruntime.IndexFromI32(carry, 0))
							carry = langruntime.CheckedI32(0)
						}
					}
				}
			}
		}
		langruntime.CheckedAdd(len(resDigits), 1)
		resDigits = append(resDigits, langruntime.CheckedIndex(langruntime.IndexFromI32(qhat, 0)))
		j = langruntime.CheckedAdd(j, 1)
	}
	quotient := numericVar{sign: resSign, weight: resWeight, dscale: rscale, digits: resDigits}
	if round {
		return numericVarStrip(numericVarRound(quotient, rscale))
	}
	return numericVarStrip(numericVarTrunc(quotient, rscale))
}
func numericVarWideDouble(value int64) float64 {
	high := langruntime.CheckedI64Divide(value, int64(4294967296))
	rest := langruntime.CheckedI64Subtract(value, langruntime.CheckedI64Multiply(high, int64(4294967296)))
	middle := langruntime.CheckedI64Divide(rest, int64(65536))
	low := langruntime.CheckedI64Subtract(rest, langruntime.CheckedI64Multiply(middle, int64(65536)))
	upper := float64((int(int32(high))))
	lower := langruntime.F64Add(langruntime.F64Multiply((float64((int(int32(middle))))), float64(65536.0)), (float64((int(int32(low))))))
	return langruntime.F64Add(langruntime.F64Multiply(upper, float64(4294967296.0)), lower)
}
func numericVarQuotientDigit(estimate float64) int {
	if estimate >= float64(0.0) {
		return langruntime.F64ToI32(estimate)
	}
	return langruntime.CheckedSignedSubtract((langruntime.F64ToI32(estimate)), 1)
}
func numericVarWideCarry(digit int64) int64 {
	if digit < int64(0) {
		return langruntime.CheckedI64Subtract(langruntime.CheckedI64Subtract(int64(0), (langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(langruntime.CheckedI64Subtract(int64(0), digit), int64(1))), int64(100000000)))), int64(1))
	}
	if digit >= int64(100000000) {
		return langruntime.CheckedI64Divide(digit, int64(100000000))
	}
	return int64(0)
}
func numericVarDivApproximate(left *numericVar, right *numericVar, rscale int, round bool) numericVar {
	rscale = langruntime.CheckedI32(rscale)
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	resSign := 1
	if left.sign != right.sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(left.weight, right.weight), 1)
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resWeight, 1), langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(rscale, numericVarDecDigits), 1)), numericVarDecDigits))
	if resNdigits < 1 {
		resNdigits = langruntime.CheckedI32(1)
	}
	if round {
		resNdigits = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resNdigits, 1))
	}
	resNdigits = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resNdigits, numericVarDivGuardDigits))
	var1ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var1ndigits, 1)), 2)
	var2ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var2ndigits, 1)), 2)
	resNdigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(resNdigits, 1)), 2)
	divNdigitpairs := resNdigitpairs
	if divNdigitpairs < var1ndigitpairs {
		var1ndigitpairs = langruntime.CheckedI32(divNdigitpairs)
	}
	if divNdigitpairs < var2ndigitpairs {
		var2ndigitpairs = langruntime.CheckedI32(divNdigitpairs)
	}
	dividend := []numericVarWide{}
	i := 0
	for i <= divNdigitpairs {
		pair := int64(0)
		if i < var1ndigitpairs {
			first := int64(langruntime.CheckedI32(numericVarDigit(left, langruntime.CheckedSignedMultiply(2, i))))
			second := int64(langruntime.CheckedI32(numericVarDigit(left, langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(2, i), 1))))
			pair = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(first, int64(10000)), second)
		}
		langruntime.CheckedAdd(len(dividend), 1)
		dividend = append(dividend, copynumericVarWide(numericVarWide{value: pair}))
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	divisor := []numericVarWide{}
	i = langruntime.CheckedI32(0)
	for i < var2ndigitpairs {
		first := int64(langruntime.CheckedI32(numericVarDigit(right, langruntime.CheckedSignedMultiply(2, i))))
		second := int64(langruntime.CheckedI32(numericVarDigit(right, langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(2, i), 1))))
		langruntime.CheckedAdd(len(divisor), 1)
		divisor = append(divisor, copynumericVarWide(numericVarWide{value: langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(first, int64(10000)), second)}))
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	fdivisor := langruntime.F64Multiply(numericVarWideDouble(divisor[0].value), float64(100000000.0))
	if var2ndigitpairs > 1 {
		fdivisor = langruntime.F64Add(fdivisor, numericVarWideDouble(divisor[1].value))
	}
	fdivisorinverse := langruntime.F64Divide(float64(1.0), fdivisor)
	limit := langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(langruntime.CheckedI64Subtract(int64(9223372036854775807), langruntime.CheckedI64Divide(int64(9223372036854775807), int64(100000000))), int64(1))), int64(99999999))
	maxdiv := int64(1)
	qi := 0
	for qi < resNdigitpairs {
		at := langruntime.IndexFromI32(qi, 0)
		fdividend := langruntime.F64Multiply(numericVarWideDouble(dividend[at].value), float64(100000000.0))
		fdividend = langruntime.F64Add(fdividend, numericVarWideDouble(dividend[langruntime.CheckedAdd(at, 1)].value))
		qdigit := numericVarQuotientDigit(langruntime.F64Multiply(fdividend, fdivisorinverse))
		if qdigit != 0 {
			magnitude := int64(langruntime.CheckedI32(qdigit))
			if magnitude < int64(0) {
				magnitude = langruntime.CheckedI64Subtract(int64(0), magnitude)
			}
			maxdiv = langruntime.CheckedI64Add(maxdiv, magnitude)
			if maxdiv > limit {
				carry := int64(0)
				j := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(qi, var2ndigitpairs), 2)
				if langruntime.CheckedSignedSubtract(divNdigitpairs, 1) < j {
					j = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(divNdigitpairs, 1))
				}
				for j > qi {
					index := langruntime.IndexFromI32(j, 0)
					newdig := langruntime.CheckedI64Add(dividend[index].value, carry)
					carry = numericVarWideCarry(newdig)
					newdig = langruntime.CheckedI64Subtract(newdig, langruntime.CheckedI64Multiply(carry, int64(100000000)))
					dividend[index] = copynumericVarWide(numericVarWide{value: newdig})
					j = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(j, 1))
				}
				dividend[at] = copynumericVarWide(numericVarWide{value: langruntime.CheckedI64Add(dividend[at].value, carry)})
				maxdiv = int64(1)
				fdividend = langruntime.F64Multiply(numericVarWideDouble(dividend[at].value), float64(100000000.0))
				fdividend = langruntime.F64Add(fdividend, numericVarWideDouble(dividend[langruntime.CheckedAdd(at, 1)].value))
				qdigit = langruntime.CheckedI32(numericVarQuotientDigit(langruntime.F64Multiply(fdividend, fdivisorinverse)))
				magnitude = int64(langruntime.CheckedI32(qdigit))
				if magnitude < int64(0) {
					magnitude = langruntime.CheckedI64Subtract(int64(0), magnitude)
				}
				maxdiv = langruntime.CheckedI64Add(maxdiv, magnitude)
			}
			if qdigit != 0 {
				istop := var2ndigitpairs
				if langruntime.CheckedSignedSubtract(divNdigitpairs, qi) < istop {
					istop = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(divNdigitpairs, qi))
				}
				stop := langruntime.IndexFromI32(istop, 0)
				wideQdigit := int64(langruntime.CheckedI32(qdigit))
				k := 0
				for k < stop {
					dividend[langruntime.CheckedAdd(at, k)] = copynumericVarWide(numericVarWide{value: langruntime.CheckedI64Subtract(dividend[langruntime.CheckedAdd(at, k)].value, langruntime.CheckedI64Multiply(wideQdigit, divisor[k].value))})
					k = langruntime.CheckedAdd(k, 1)
				}
			}
		}
		current := dividend[at].value
		next := dividend[langruntime.CheckedAdd(at, 1)].value
		nextHigh := langruntime.CheckedI64Divide(next, int64(100000000))
		nextLow := langruntime.CheckedI64Subtract(next, langruntime.CheckedI64Multiply(nextHigh, int64(100000000)))
		dividend[langruntime.CheckedAdd(at, 1)] = copynumericVarWide(numericVarWide{value: langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((langruntime.CheckedI64Add(current, nextHigh)), int64(100000000)), nextLow)})
		dividend[at] = copynumericVarWide(numericVarWide{value: int64(langruntime.CheckedI32(qdigit))})
		qi = langruntime.CheckedI32(langruntime.CheckedSignedAdd(qi, 1))
	}
	digits := numericVarZeros(langruntime.CheckedSignedMultiply(2, resNdigitpairs))
	carry := int64(0)
	j := langruntime.CheckedSignedSubtract(resNdigitpairs, 1)
	for j >= 0 {
		index := langruntime.IndexFromI32(j, 0)
		newdig := langruntime.CheckedI64Add(dividend[index].value, carry)
		carry = numericVarWideCarry(newdig)
		newdig = langruntime.CheckedI64Subtract(newdig, langruntime.CheckedI64Multiply(carry, int64(100000000)))
		pair := int(int32(newdig))
		digits[langruntime.CheckedAdd(index, index)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedDivide(pair, numericVarNbase), 0))
		digits[langruntime.CheckedAdd(langruntime.CheckedAdd(index, index), 1)] = langruntime.CheckedIndex(langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(pair, numericVarNbase), 0))
		j = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(j, 1))
	}
	quotient := numericVar{sign: resSign, weight: resWeight, dscale: rscale, digits: digits}
	if round {
		return numericVarStrip(numericVarRound(quotient, rscale))
	}
	return numericVarStrip(numericVarTrunc(quotient, rscale))
}

func numericVarMod(left *numericVar, right *numericVar) numericVar {
	quotient := numericVarDiv(left, right, 0, false, true)
	product := numericVarMul(right, &quotient, right.dscale)
	return numericVarSub(left, &product)
}
func numericVarResult(value numericVar) checkruntime.NumericValue {
	value = copynumericVar(value)
	stripped := numericVarStrip(value)
	if (numericVarCount(&stripped) > 0 && (stripped.weight > 32767 || stripped.weight < langruntime.CheckedSignedNegate(32768))) || stripped.dscale > 16383 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWorkFromVar(&stripped))}
}
func numericVarRescaled(value numericVar, dscale int) numericVar {
	value = copynumericVar(value)
	dscale = langruntime.CheckedI32(dscale)
	return numericVar{sign: value.sign, weight: value.weight, dscale: dscale, digits: value.digits}
}

func numericVarCeil(value *numericVar) numericVar {
	one := numericVarFromI64(int64(1))
	truncated := numericVarTrunc(numericVarShifted(value, 0), 0)
	if value.sign > 0 && numericVarCmp(value, &truncated) != 0 {
		return numericVarAdd(&truncated, &one)
	}
	return truncated
}
func numericVarFloor(value *numericVar) numericVar {
	one := numericVarFromI64(int64(1))
	truncated := numericVarTrunc(numericVarShifted(value, 0), 0)
	if value.sign < 0 && numericVarCmp(value, &truncated) != 0 {
		return numericVarSub(&truncated, &one)
	}
	return truncated
}

const numericSupportRangeError = 3452547

type numericWork struct {
	valid   bool
	special int
	sign    int
	weight  int
	scale   int
	digits  string
}

func copynumericWork(value numericWork) numericWork {
	return numericWork{valid: value.valid, special: langruntime.CheckedI32(value.special), sign: langruntime.CheckedI32(value.sign), weight: langruntime.CheckedI32(value.weight), scale: langruntime.CheckedI32(value.scale), digits: langruntime.CheckedString(value.digits)}
}
func numericWorkFromValue(value string) numericWork {
	value = langruntime.CheckedString(value)
	layout := checkruntime.NumericParts(value)
	digits := langruntime.NewTextBuffer("")
	scale := 0
	if layout.Valid && layout.Special == 1 {
		scale = langruntime.CheckedI32(numericWireScale(value))
		characters := []rune(value)
		index := layout.First
		for index < layout.End {
			character := characters[index]
			if numericWireDecimalDigit(character) >= 0 {
				digits = append(digits, string(langruntime.CheckedChar(character))...)
			}
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	return numericWork{valid: layout.Valid, special: layout.Special, sign: layout.Sign, weight: layout.Weight, scale: scale, digits: string(digits)}
}
func numericWorkZeros(count int) string {
	count = langruntime.CheckedI32(count)
	remaining := count
	block := langruntime.NewTextBuffer("0")
	output := langruntime.NewTextBuffer("")
	for remaining > 0 {
		if langruntime.CheckedSignedRemainder(remaining, 2) == 1 {
			output = append(output, string(block)...)
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedDivide(remaining, 2))
		if remaining > 0 {
			copy := langruntime.CheckedString(string(block))
			block = append(block, copy...)
		}
	}
	return string(output)
}
func numericWorkText(work numericWork) string {
	work = copynumericWork(work)
	if work.special == 0 {
		return "-Infinity"
	}
	if work.special == 2 {
		return "Infinity"
	}
	if work.special == 3 {
		return "NaN"
	}
	digits := []rune(work.digits)
	output := langruntime.NewTextBuffer("")
	if work.sign < 0 {
		output = append(output, string(langruntime.CheckedChar('-'))...)
	}
	if work.sign == 0 {
		output = append(output, string(langruntime.CheckedChar('0'))...)
		if work.scale > 0 {
			output = append(output, string(langruntime.CheckedChar('.'))...)
			output = append(output, numericWorkZeros(work.scale)...)
		}
		return string(output)
	}
	index := 0
	if work.weight >= 0 {
		length := 0
		for index < len(digits) {
			length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
			index = langruntime.CheckedAdd(index, 1)
		}
		index = langruntime.CheckedIndex(0)
		positions := langruntime.CheckedSignedAdd(work.weight, 1)
		if length <= positions {
			output = append(output, work.digits...)
			output = append(output, numericWorkZeros(langruntime.CheckedSignedSubtract(positions, length))...)
			index = langruntime.CheckedIndex(len(digits))
		} else {
			for positions > 0 {
				output = append(output, string(langruntime.CheckedChar(digits[index]))...)
				index = langruntime.CheckedAdd(index, 1)
				positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, 1))
			}
		}
	} else {
		output = append(output, string(langruntime.CheckedChar('0'))...)
	}
	if work.scale > 0 {
		output = append(output, string(langruntime.CheckedChar('.'))...)
		positions := work.scale
		if work.weight < langruntime.CheckedSignedNegate(1) {
			leading := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(0, work.weight), 1)
			if leading > positions {
				leading = langruntime.CheckedI32(positions)
			}
			output = append(output, numericWorkZeros(leading)...)
			positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, leading))
		}
		for positions > 0 && index < len(digits) {
			output = append(output, string(langruntime.CheckedChar(digits[index]))...)
			index = langruntime.CheckedAdd(index, 1)
			positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, 1))
		}
		output = append(output, numericWorkZeros(positions)...)
	}
	return string(output)
}

const scalarInputInvalid = 3484946

func ScalarNumericFromText(input checkruntime.TextValue) checkruntime.NumericValue {
	unresolvedFlavor := 0
	if input.Kind == checkruntime.TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == checkruntime.TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == checkruntime.TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input.Kind == checkruntime.TextValueNull {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		parts := checkruntime.NumericParts(value)
		if parts.Valid && parts.Special != 1 {
			if parts.Special == 0 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
			}
			if parts.Special == 2 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
			}
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
		}
		characters := []rune(value)
		start := 0
		end := len(characters)
		for start < end && checkruntime.NumericSpace(characters[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		for end > start && checkruntime.NumericSpace(characters[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		negative := false
		if start < end && (characters[start] == '+' || characters[start] == '-') {
			negative = characters[start] == '-'
			start = langruntime.CheckedAdd(start, 1)
		}
		if start == end {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
		}
		radix := 10
		prefixEnd := start
		if langruntime.CheckedAdd(start, 1) < end && characters[start] == '0' {
			prefix := langruntime.AsciiLowercase(characters[langruntime.CheckedAdd(start, 1)])
			if prefix == 'x' {
				radix = langruntime.CheckedI32(16)
				prefixEnd = langruntime.CheckedIndex(langruntime.CheckedAdd(start, 2))
			}
			if prefix == 'o' {
				radix = langruntime.CheckedI32(8)
				prefixEnd = langruntime.CheckedIndex(langruntime.CheckedAdd(start, 2))
			}
			if prefix == 'b' {
				radix = langruntime.CheckedI32(2)
				prefixEnd = langruntime.CheckedIndex(langruntime.CheckedAdd(start, 2))
			}
		}
		clean := langruntime.NewTextBuffer("")
		position := start
		for position < end {
			character := characters[position]
			if character == '_' {
				if position == start || langruntime.CheckedAdd(position, 1) == end {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
				}
				before := jsonpathScanHex(characters[langruntime.CheckedSubtract(position, 1)])
				after := jsonpathScanHex(characters[langruntime.CheckedAdd(position, 1)])
				if (position != prefixEnd && (before < 0 || before >= radix)) || after < 0 || after >= radix {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
				}
			} else {
				clean = append(clean, string(langruntime.CheckedChar(character))...)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		content := []rune(string(clean))
		begin := 0
		if radix == 10 {
			for langruntime.CheckedAdd(begin, 1) < len(content) && content[begin] == '0' && numericWireDecimalDigit(content[langruntime.CheckedAdd(begin, 1)]) >= 0 {
				begin = langruntime.CheckedAdd(begin, 1)
			}
		}
		normalized := langruntime.NewTextBuffer("")
		position = langruntime.CheckedIndex(begin)
		for position < len(content) {
			normalized = append(normalized, string(langruntime.CheckedChar(content[position]))...)
			position = langruntime.CheckedAdd(position, 1)
		}
		source := jsonpathScanSource{characters: []rune(string(normalized))}
		if len(source.characters) == 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
		}
		first := source.characters[0]
		if first == '.' && (len(source.characters) < 2 || numericWireDecimalDigit(source.characters[1]) < 0) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
		}
		if numericWireDecimalDigit(first) < 0 && first != '.' {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
		}
		token := jsonpathScanNumber(&source, 0)
		if token.error != 0 || token.end != len(source.characters) || (token.kind != jsonpathScanInt && token.kind != jsonpathScanNumeric) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(scalarInputInvalid)}
		}
		parsed := jsonpathNumericLiteral(string(normalized))
		if parsed.Kind == checkruntime.TextValueError {
			error := parsed.Error
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
		}
		if parsed.Kind == checkruntime.TextValueValue {
			number := langruntime.CheckedString(parsed.Value)
			result := checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: number}
			if negative {
				result = NumericUminusWcmy(result)
			}
			return result
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
