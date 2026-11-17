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

// A result, the numeric overflow PostgreSQL raises while computing it, or a result that
// depends on the deployment's math library.

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
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
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
	numericUnknownLeft1 := false
	if left.Kind == checkruntime.NumericValueUnknown {
		numericUnknownLeft1 = true
	}
	numericUnimplementedLeft2 := false
	if left.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedLeft2 = true
	}
	numericUnknownRight3 := false
	if right.Kind == checkruntime.NumericValueUnknown {
		numericUnknownRight3 = true
	}
	numericUnimplementedRight4 := false
	if right.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedRight4 = true
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
	if (numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4) {
		return checkruntime.Int4Unresolved(conditionFlavor134)
	}
	numericNullLeft5 := false
	if left.Kind == checkruntime.NumericValueNull {
		numericNullLeft5 = true
	}
	numericNullRight6 := false
	if right.Kind == checkruntime.NumericValueNull {
		numericNullRight6 = true
	}
	if numericNullLeft5 || numericNullRight6 {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		leftValue := checkruntime.CopyNumericVar(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			rightValue := checkruntime.CopyNumericVar(right.Value)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: numericVarCompareValues(&leftValue, &rightValue)}
		}
	}
	return checkruntime.Int4Unresolved(unresolvedFlavor)
}
func NumericEqFw7r(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
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
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
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
	numericUnknownLeft1 := false
	if left.Kind == checkruntime.NumericValueUnknown {
		numericUnknownLeft1 = true
	}
	numericUnimplementedLeft2 := false
	if left.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedLeft2 = true
	}
	numericUnknownRight3 := false
	if right.Kind == checkruntime.NumericValueUnknown {
		numericUnknownRight3 = true
	}
	numericUnimplementedRight4 := false
	if right.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedRight4 = true
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
	if (numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4) {
		return checkruntime.NumericUnresolved(conditionFlavor2854)
	}
	numericNullLeft5 := false
	if left.Kind == checkruntime.NumericValueNull {
		numericNullLeft5 = true
	}
	numericNullRight6 := false
	if right.Kind == checkruntime.NumericValueNull {
		numericNullRight6 = true
	}
	if numericNullLeft5 || numericNullRight6 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		leftVar := checkruntime.CopyNumericVar(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			rightVar := checkruntime.CopyNumericVar(right.Value)
			firstKind := numericVarKind(&leftVar)
			secondKind := numericVarKind(&rightVar)
			if firstKind == 3 || secondKind == 3 {
				return checkruntime.MakeNumericValue("NaN")
			}
			if firstKind != 1 || secondKind != 1 {
				leftSign := numericVarSignum(&leftVar)
				rightSign := numericVarSignum(&rightVar)
				if firstKind == 0 {
					leftSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if firstKind == 2 {
					leftSign = langruntime.CheckedI32(1)
				}
				if secondKind == 0 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if secondKind == 2 {
					rightSign = langruntime.CheckedI32(1)
				}
				if mode == 1 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, rightSign))
				}
				resultSign := leftSign
				if mode == 2 {
					resultSign = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(leftSign, rightSign))
				} else if firstKind == 1 {
					resultSign = langruntime.CheckedI32(rightSign)
				} else if secondKind != 1 && leftSign != rightSign {
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
			if mode == 2 {
				rscale := langruntime.CheckedSignedAdd(leftVar.Dscale, rightVar.Dscale)
				product := numericVarMul(&leftVar, &rightVar, rscale)
				if product.Dscale > 16383 {
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
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
	return numericArithmetic(left, right, 0)
}
func NumericSubYs09(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
	return numericArithmetic(left, right, 1)
}
func NumericMulBj4l(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
	return numericArithmetic(left, right, 2)
}

func numericDivisionScale(left *checkruntime.NumericVar, right *checkruntime.NumericVar) int {
	weight1 := 0
	firstdigit1 := 0
	i := 0
	for i < numericVarCount(left) {
		firstdigit1 = langruntime.CheckedI32(numericVarDigit(left, i))
		if firstdigit1 != 0 {
			weight1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(left.Weight, i))
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
			weight2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(right.Weight, i))
			i = langruntime.CheckedI32(numericVarCount(right))
		}
		i = langruntime.CheckedI32(langruntime.CheckedSignedAdd(i, 1))
	}
	qweight := langruntime.CheckedSignedSubtract(weight1, weight2)
	if firstdigit1 <= firstdigit2 {
		qweight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(qweight, 1))
	}
	rscale := langruntime.CheckedSignedSubtract(numericVarMinSigDigits, langruntime.CheckedSignedMultiply(qweight, numericVarDecDigits))
	if rscale < left.Dscale {
		rscale = langruntime.CheckedI32(left.Dscale)
	}
	if rscale < right.Dscale {
		rscale = langruntime.CheckedI32(right.Dscale)
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
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
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
	numericUnknownLeft1 := false
	if left.Kind == checkruntime.NumericValueUnknown {
		numericUnknownLeft1 = true
	}
	numericUnimplementedLeft2 := false
	if left.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedLeft2 = true
	}
	numericUnknownRight3 := false
	if right.Kind == checkruntime.NumericValueUnknown {
		numericUnknownRight3 = true
	}
	numericUnimplementedRight4 := false
	if right.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedRight4 = true
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
	if (numericUnknownLeft1 || numericUnimplementedLeft2) || (numericUnknownRight3 || numericUnimplementedRight4) {
		return checkruntime.NumericUnresolved(conditionFlavor1864)
	}
	numericNullLeft5 := false
	if left.Kind == checkruntime.NumericValueNull {
		numericNullLeft5 = true
	}
	numericNullRight6 := false
	if right.Kind == checkruntime.NumericValueNull {
		numericNullRight6 = true
	}
	if numericNullLeft5 || numericNullRight6 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		dividend := checkruntime.CopyNumericVar(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			divisor := checkruntime.CopyNumericVar(right.Value)
			aKind := numericVarKind(&dividend)
			bKind := numericVarKind(&divisor)
			if aKind == 3 || bKind == 3 {
				return checkruntime.MakeNumericValue("NaN")
			}
			if bKind == 1 && numericVarSignum(&divisor) == 0 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if aKind != 1 {
				if mode == 2 || bKind != 1 {
					return checkruntime.MakeNumericValue("NaN")
				}
				sign := numericVarSignum(&divisor)
				if aKind == 0 {
					sign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, sign))
				}
				if sign < 0 {
					return checkruntime.MakeNumericValue("-Infinity")
				}
				return checkruntime.MakeNumericValue("Infinity")
			}
			if bKind != 1 {
				if mode == 2 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: dividend}
				}
				return checkruntime.MakeNumericValue("0")
			}
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
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
	return numericDivision(left, right, 0)
}

func NumericMod8ywz(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	left = checkruntime.CopyNumericValue(left)
	right = checkruntime.CopyNumericValue(right)
	return numericDivision(left, right, 2)
}

func NumericAbs6g5e(input checkruntime.NumericValue) checkruntime.NumericValue {
	input = checkruntime.CopyNumericValue(input)
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
	numericUnknownInput7 := false
	if input.Kind == checkruntime.NumericValueUnknown {
		numericUnknownInput7 = true
	}
	numericUnimplementedInput8 := false
	if input.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedInput8 = true
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
	if numericUnknownInput7 || numericUnimplementedInput8 {
		return checkruntime.NumericUnresolved(conditionFlavor420)
	}
	numericNullInput9 := false
	if input.Kind == checkruntime.NumericValueNull {
		numericNullInput9 = true
	}
	if numericNullInput9 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := checkruntime.CopyNumericVar(input.Value)
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericVarAbsolute(value)}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
func NumericCmp6h4s(input checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.Int4Value {
	input = checkruntime.CopyNumericValue(input)
	right = checkruntime.CopyNumericValue(right)
	result := numericCompare(checkruntime.CopyNumericValue(input), checkruntime.CopyNumericValue(right))
	return result
}

func NumericUminusWcmy(input checkruntime.NumericValue) checkruntime.NumericValue {
	input = checkruntime.CopyNumericValue(input)
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
	numericUnknownInput10 := false
	if input.Kind == checkruntime.NumericValueUnknown {
		numericUnknownInput10 = true
	}
	numericUnimplementedInput11 := false
	if input.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedInput11 = true
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
	if numericUnknownInput10 || numericUnimplementedInput11 {
		return checkruntime.NumericUnresolved(conditionFlavor950)
	}
	numericNullInput12 := false
	if input.Kind == checkruntime.NumericValueNull {
		numericNullInput12 = true
	}
	if numericNullInput12 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := checkruntime.CopyNumericVar(input.Value)
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericVarNegated(value)}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func Sign2rsu(input checkruntime.NumericValue) checkruntime.NumericValue {
	input = checkruntime.CopyNumericValue(input)
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
	numericUnknownInput19 := false
	if input.Kind == checkruntime.NumericValueUnknown {
		numericUnknownInput19 = true
	}
	numericUnimplementedInput20 := false
	if input.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedInput20 = true
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
	if numericUnknownInput19 || numericUnimplementedInput20 {
		return checkruntime.NumericUnresolved(conditionFlavor1490)
	}
	numericNullInput21 := false
	if input.Kind == checkruntime.NumericValueNull {
		numericNullInput21 = true
	}
	if numericNullInput21 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := checkruntime.CopyNumericVar(input.Value)
		kind := numericVarKind(&value)
		if kind == 3 {
			return checkruntime.MakeNumericValue("NaN")
		}
		if kind == 0 || numericVarSignum(&value) < 0 {
			return checkruntime.MakeNumericValue("-1")
		}
		if kind == 2 || numericVarSignum(&value) > 0 {
			return checkruntime.MakeNumericValue("1")
		}
		return checkruntime.MakeNumericValue("0")
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func numericRoundValue(arg checkruntime.NumericVar, requested int, mode int) checkruntime.NumericValue {
	arg = checkruntime.CopyNumericVar(arg)
	requested = langruntime.CheckedI32(requested)
	mode = langruntime.CheckedI32(mode)
	if numericVarKind(&arg) != 1 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: arg}
	}
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
		result = checkruntime.CopyNumericVar(numericVarRound(arg, scale))
	} else {
		result = checkruntime.CopyNumericVar(numericVarTrunc(arg, scale))
	}
	if scale < 0 {
		result = checkruntime.CopyNumericVar(numericVarRescaled(result, 0))
	}
	return numericVarResult(result)
}

func RoundOtcq(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	input = checkruntime.CopyNumericValue(input)
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
	numericUnknownInput13 := false
	if input.Kind == checkruntime.NumericValueUnknown {
		numericUnknownInput13 = true
	}
	numericUnimplementedInput14 := false
	if input.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedInput14 = true
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
	if (numericUnknownInput13 || numericUnimplementedInput14) || (scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor690)
	}
	numericNullInput15 := false
	if input.Kind == checkruntime.NumericValueNull {
		numericNullInput15 = true
	}
	if numericNullInput15 || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		work := checkruntime.CopyNumericVar(input.Value)
		if scale.Kind == checkruntime.Int4ValueValue {
			precision := langruntime.CheckedI32(scale.Value)
			return numericRoundValue(work, precision, 1)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

func TruncHay3(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	input = checkruntime.CopyNumericValue(input)
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
	numericUnknownInput19 := false
	if input.Kind == checkruntime.NumericValueUnknown {
		numericUnknownInput19 = true
	}
	numericUnimplementedInput20 := false
	if input.Kind == checkruntime.NumericValueUnimplemented {
		numericUnimplementedInput20 = true
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
	if (numericUnknownInput19 || numericUnimplementedInput20) || (scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnimplemented})) {
		return checkruntime.NumericUnresolved(conditionFlavor1020)
	}
	numericNullInput21 := false
	if input.Kind == checkruntime.NumericValueNull {
		numericNullInput21 = true
	}
	if numericNullInput21 || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		work := checkruntime.CopyNumericVar(input.Value)
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
func numericVarZero(dscale int) checkruntime.NumericVar {
	dscale = langruntime.CheckedI32(dscale)
	digits := []int{}
	return checkruntime.NumericVar{Sign: 1, Weight: 0, Dscale: dscale, Digits: digits}
}
func numericVarCount(value *checkruntime.NumericVar) int {
	return int(int32(len(value.Digits)))
}
func numericVarDigit(value *checkruntime.NumericVar, index int) int {
	index = langruntime.CheckedI32(index)
	if index < 0 || index >= numericVarCount(value) {
		return 0
	}
	return (int(int32(value.Digits[langruntime.IndexFromI32(index, 0)])))
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

func numericVarFromI64(value int64) checkruntime.NumericVar {
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
	return checkruntime.NumericVar{Sign: sign, Weight: langruntime.CheckedSignedSubtract(count, 1), Dscale: 0, Digits: digits}
}
func numericVarStrip(value checkruntime.NumericVar) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	weight := value.Weight
	start := 0
	for start < len(value.Digits) && (int(int32(value.Digits[start]))) == 0 {
		start = langruntime.CheckedAdd(start, 1)
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	end := len(value.Digits)
	for end > start && (int(int32(value.Digits[langruntime.CheckedSubtract(end, 1)]))) == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	digits := []int{}
	index := start
	for index < end {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(value.Digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	sign := value.Sign
	if end == start {
		sign = langruntime.CheckedI32(1)
		weight = langruntime.CheckedI32(0)
	}
	return checkruntime.NumericVar{Sign: sign, Weight: weight, Dscale: value.Dscale, Digits: digits}
}
func numericVarShifted(value *checkruntime.NumericVar, places int) checkruntime.NumericVar {
	places = langruntime.CheckedI32(places)
	digits := []int{}
	index := 0
	for index < len(value.Digits) {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedIndex(value.Digits[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return checkruntime.NumericVar{Sign: value.Sign, Weight: langruntime.CheckedSignedAdd(value.Weight, places), Dscale: value.Dscale, Digits: digits}
}
func numericVarCmpAbs(left *checkruntime.NumericVar, right *checkruntime.NumericVar) int {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	leftWeight := left.Weight
	rightWeight := right.Weight
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
func numericVarCmp(left *checkruntime.NumericVar, right *checkruntime.NumericVar) int {
	if numericVarCount(left) == 0 {
		if numericVarCount(right) == 0 {
			return 0
		}
		if right.Sign < 0 {
			return 1
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if numericVarCount(right) == 0 {
		if left.Sign > 0 {
			return 1
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if left.Sign > 0 {
		if right.Sign < 0 {
			return 1
		}
		return numericVarCmpAbs(left, right)
	}
	if right.Sign > 0 {
		return langruntime.CheckedSignedNegate(1)
	}
	return numericVarCmpAbs(right, left)
}
func numericVarAddAbs(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	resWeight := left.Weight
	if right.Weight > resWeight {
		resWeight = langruntime.CheckedI32(right.Weight)
	}
	resWeight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(resWeight, 1))
	resDscale := left.Dscale
	if right.Dscale > resDscale {
		resDscale = langruntime.CheckedI32(right.Dscale)
	}
	rscale1 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(leftCount, left.Weight), 1)
	rscale2 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(rightCount, right.Weight), 1)
	resRscale := rscale1
	if rscale2 > resRscale {
		resRscale = langruntime.CheckedI32(rscale2)
	}
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, resWeight), 1)
	if resNdigits <= 0 {
		resNdigits = langruntime.CheckedI32(1)
	}
	digits := numericVarZeros(resNdigits)
	i1 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, left.Weight), 1)
	i2 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, right.Weight), 1)
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
	return numericVarStrip(checkruntime.NumericVar{Sign: 1, Weight: resWeight, Dscale: resDscale, Digits: digits})
}
func numericVarSubAbs(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	leftCount := numericVarCount(left)
	rightCount := numericVarCount(right)
	resWeight := left.Weight
	resDscale := left.Dscale
	if right.Dscale > resDscale {
		resDscale = langruntime.CheckedI32(right.Dscale)
	}
	rscale1 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(leftCount, left.Weight), 1)
	rscale2 := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(rightCount, right.Weight), 1)
	resRscale := rscale1
	if rscale2 > resRscale {
		resRscale = langruntime.CheckedI32(rscale2)
	}
	resNdigits := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, resWeight), 1)
	if resNdigits <= 0 {
		resNdigits = langruntime.CheckedI32(1)
	}
	digits := numericVarZeros(resNdigits)
	i1 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, left.Weight), 1)
	i2 := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(resRscale, right.Weight), 1)
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
	return numericVarStrip(checkruntime.NumericVar{Sign: 1, Weight: resWeight, Dscale: resDscale, Digits: digits})
}
func numericVarSigned(value checkruntime.NumericVar, sign int) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	sign = langruntime.CheckedI32(sign)
	return checkruntime.NumericVar{Sign: sign, Weight: value.Weight, Dscale: value.Dscale, Digits: value.Digits}
}
func numericVarSum(left *checkruntime.NumericVar, right *checkruntime.NumericVar, rightSign int) checkruntime.NumericVar {
	rightSign = langruntime.CheckedI32(rightSign)
	dscale := left.Dscale
	if right.Dscale > dscale {
		dscale = langruntime.CheckedI32(right.Dscale)
	}
	if left.Sign == rightSign {
		return numericVarSigned(numericVarAddAbs(left, right), left.Sign)
	}
	order := numericVarCmpAbs(left, right)
	if order == 0 {
		return numericVarZero(dscale)
	}
	if order > 0 {
		return numericVarSigned(numericVarSubAbs(left, right), left.Sign)
	}
	return numericVarSigned(numericVarSubAbs(right, left), rightSign)
}
func numericVarAdd(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	return numericVarSum(left, right, right.Sign)
}
func numericVarSub(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	return numericVarSum(left, right, langruntime.CheckedSignedSubtract(0, right.Sign))
}
func numericVarRound(value checkruntime.NumericVar, rscale int) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	rscale = langruntime.CheckedI32(rscale)
	sign := value.Sign
	weight := value.Weight
	digits := value.Digits
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
	return checkruntime.NumericVar{Sign: sign, Weight: weight, Dscale: rscale, Digits: rounded}
}
func numericVarTrunc(value checkruntime.NumericVar, rscale int) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	rscale = langruntime.CheckedI32(rscale)
	sign := value.Sign
	weight := value.Weight
	digits := value.Digits
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
	return checkruntime.NumericVar{Sign: sign, Weight: weight, Dscale: rscale, Digits: truncated}
}
func numericVarMul(left *checkruntime.NumericVar, right *checkruntime.NumericVar, rscale int) checkruntime.NumericVar {
	rscale = langruntime.CheckedI32(rscale)
	if numericVarCount(left) > numericVarCount(right) {
		return numericVarMul(right, left, rscale)
	}
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	if var1ndigits == 0 {
		return numericVarZero(rscale)
	}
	if var1ndigits <= 6 && rscale == langruntime.CheckedSignedAdd(left.Dscale, right.Dscale) {
		return numericVarMulExact(left, right)
	}
	resSign := 1
	if left.Sign != right.Sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	var1ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var1ndigits, 1)), 2)
	var2ndigitpairs := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(var2ndigits, 1)), 2)
	resNdigits := langruntime.CheckedSignedAdd(var1ndigits, var2ndigits)
	resNdigitpairs := langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide(resNdigits, 2), 1)
	pairOffset := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(resNdigitpairs, var1ndigitpairs), var2ndigitpairs), 1)
	resWeight := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.Weight, right.Weight), 1), langruntime.CheckedSignedMultiply(2, resNdigitpairs)), resNdigits), langruntime.CheckedSignedRemainder(var1ndigits, 2)), langruntime.CheckedSignedRemainder(var2ndigits, 2))
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
	product := checkruntime.NumericVar{Sign: resSign, Weight: weight, Dscale: rscale, Digits: digits}
	return numericVarStrip(numericVarRound(product, rscale))
}
func numericVarMulExact(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	resSign := 1
	if left.Sign != right.Sign {
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
	dscale := langruntime.CheckedSignedAdd(left.Dscale, right.Dscale)
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
	return checkruntime.NumericVar{Sign: resSign, Weight: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.Weight, right.Weight), 1), dropped), Dscale: dscale, Digits: digits}
}
func numericVarDivInt(value *checkruntime.NumericVar, ival int, ivalWeight int, rscale int, round bool) checkruntime.NumericVar {
	ival = langruntime.CheckedI32(ival)
	ivalWeight = langruntime.CheckedI32(ivalWeight)
	rscale = langruntime.CheckedI32(rscale)
	varNdigits := numericVarCount(value)
	if varNdigits == 0 {
		return numericVarZero(rscale)
	}
	resSign := 1
	if value.Sign > 0 {
		if ival < 0 {
			resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
	} else if ival > 0 {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedSubtract(value.Weight, ivalWeight)
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
	quotient := checkruntime.NumericVar{Sign: resSign, Weight: resWeight, Dscale: rscale, Digits: digits}
	if round {
		return numericVarStrip(numericVarRound(quotient, rscale))
	}
	return numericVarStrip(numericVarTrunc(quotient, rscale))
}
func numericVarDiv(left *checkruntime.NumericVar, right *checkruntime.NumericVar, rscale int, round bool, exact bool) checkruntime.NumericVar {
	rscale = langruntime.CheckedI32(rscale)
	if exact || numericVarCount(right) <= langruntime.CheckedSignedMultiply(2, (langruntime.CheckedSignedAdd(numericVarDivGuardDigits, 2))) || numericVarCount(left) == 0 {
		return numericVarDivExact(left, right, rscale, round)
	}
	return numericVarDivApproximate(left, right, rscale, round)
}
func numericVarDivExact(left *checkruntime.NumericVar, right *checkruntime.NumericVar, rscale int, round bool) checkruntime.NumericVar {
	rscale = langruntime.CheckedI32(rscale)
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	if var2ndigits <= 2 {
		idivisor := numericVarDigit(right, 0)
		idivisorWeight := right.Weight
		if var2ndigits == 2 {
			idivisor = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(idivisor, numericVarNbase), numericVarDigit(right, 1)))
			idivisorWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(idivisorWeight, 1))
		}
		if right.Sign < 0 {
			idivisor = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, idivisor))
		}
		return numericVarDivInt(left, idivisor, idivisorWeight, rscale, round)
	}
	if var1ndigits == 0 {
		return numericVarZero(rscale)
	}
	resSign := 1
	if left.Sign != right.Sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedSubtract(left.Weight, right.Weight)
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
	for index < len(left.Digits) {
		dividend[langruntime.CheckedAdd(index, 1)] = langruntime.CheckedIndex(left.Digits[index])
		index = langruntime.CheckedAdd(index, 1)
	}
	index = langruntime.CheckedIndex(0)
	for index < len(right.Digits) {
		divisor[langruntime.CheckedAdd(index, 1)] = langruntime.CheckedIndex(right.Digits[index])
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
	quotient := checkruntime.NumericVar{Sign: resSign, Weight: resWeight, Dscale: rscale, Digits: resDigits}
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
func numericVarDivApproximate(left *checkruntime.NumericVar, right *checkruntime.NumericVar, rscale int, round bool) checkruntime.NumericVar {
	rscale = langruntime.CheckedI32(rscale)
	var1ndigits := numericVarCount(left)
	var2ndigits := numericVarCount(right)
	resSign := 1
	if left.Sign != right.Sign {
		resSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	resWeight := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(left.Weight, right.Weight), 1)
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
	quotient := checkruntime.NumericVar{Sign: resSign, Weight: resWeight, Dscale: rscale, Digits: digits}
	if round {
		return numericVarStrip(numericVarRound(quotient, rscale))
	}
	return numericVarStrip(numericVarTrunc(quotient, rscale))
}

func numericVarMod(left *checkruntime.NumericVar, right *checkruntime.NumericVar) checkruntime.NumericVar {
	quotient := numericVarDiv(left, right, 0, false, true)
	product := numericVarMul(right, &quotient, right.Dscale)
	return numericVarSub(left, &product)
}
func numericVarResult(value checkruntime.NumericVar) checkruntime.NumericValue {
	value = checkruntime.CopyNumericVar(value)
	stripped := numericVarStrip(value)
	if (numericVarCount(&stripped) > 0 && (stripped.Weight > 32767 || stripped.Weight < langruntime.CheckedSignedNegate(32768))) || stripped.Dscale > 16383 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: stripped}
}
func numericVarRescaled(value checkruntime.NumericVar, dscale int) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	dscale = langruntime.CheckedI32(dscale)
	return checkruntime.NumericVar{Sign: value.Sign, Weight: value.Weight, Dscale: dscale, Digits: value.Digits}
}

func numericVarCeil(value *checkruntime.NumericVar) checkruntime.NumericVar {
	one := numericVarFromI64(int64(1))
	truncated := numericVarTrunc(numericVarShifted(value, 0), 0)
	if value.Sign > 0 && numericVarCmp(value, &truncated) != 0 {
		return numericVarAdd(&truncated, &one)
	}
	return truncated
}
func numericVarFloor(value *checkruntime.NumericVar) checkruntime.NumericVar {
	one := numericVarFromI64(int64(1))
	truncated := numericVarTrunc(numericVarShifted(value, 0), 0)
	if value.Sign < 0 && numericVarCmp(value, &truncated) != 0 {
		return numericVarSub(&truncated, &one)
	}
	return truncated
}
func numericVarKind(value *checkruntime.NumericVar) int {
	if value.Sign == checkruntime.NumericSignNan {
		return 3
	}
	if value.Sign == checkruntime.NumericSignPinf {
		return 2
	}
	if value.Sign == checkruntime.NumericSignNinf {
		return 0
	}
	return 1
}
func numericVarSignum(value *checkruntime.NumericVar) int {
	if numericVarCount(value) == 0 {
		return 0
	}
	return value.Sign
}
func numericVarAbsolute(value checkruntime.NumericVar) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	if value.Sign == checkruntime.NumericSignNinf {
		return checkruntime.NumericVarSpecial(checkruntime.NumericSignPinf)
	}
	if value.Sign == langruntime.CheckedSignedNegate(1) {
		return numericVarSigned(value, 1)
	}
	return value
}
func numericVarNegated(value checkruntime.NumericVar) checkruntime.NumericVar {
	value = checkruntime.CopyNumericVar(value)
	if value.Sign == checkruntime.NumericSignNinf {
		return checkruntime.NumericVarSpecial(checkruntime.NumericSignPinf)
	}
	if value.Sign == checkruntime.NumericSignPinf {
		return checkruntime.NumericVarSpecial(checkruntime.NumericSignNinf)
	}
	if value.Sign == checkruntime.NumericSignNan || numericVarCount(&value) == 0 {
		return value
	}
	sign := langruntime.CheckedSignedSubtract(0, value.Sign)
	return numericVarSigned(value, sign)
}

func numericVarCompareValues(left *checkruntime.NumericVar, right *checkruntime.NumericVar) int {
	leftKind := numericVarKind(left)
	rightKind := numericVarKind(right)
	if leftKind == 3 {
		if rightKind == 3 {
			return 0
		}
		return 1
	}
	if leftKind == 2 {
		if rightKind == 3 {
			return langruntime.CheckedSignedNegate(1)
		}
		if rightKind == 2 {
			return 0
		}
		return 1
	}
	if leftKind == 0 {
		if rightKind == 0 {
			return 0
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if rightKind == 0 {
		return 1
	}
	if rightKind != 1 {
		return langruntime.CheckedSignedNegate(1)
	}
	return numericVarCmp(left, right)
}

const numericSupportRangeError = 3452547

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
				return checkruntime.MakeNumericValue("-Infinity")
			}
			if parts.Special == 2 {
				return checkruntime.MakeNumericValue("Infinity")
			}
			return checkruntime.MakeNumericValue("NaN")
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
			result := checkruntime.MakeNumericValue(number)
			if negative {
				result = checkruntime.CopyNumericValue(NumericUminusWcmy(result))
			}
			return result
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}
