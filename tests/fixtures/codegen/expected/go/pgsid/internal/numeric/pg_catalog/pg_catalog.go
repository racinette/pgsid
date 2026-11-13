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

func numericWorkMagnitude(left numericWork, right numericWork) int {
	left = copynumericWork(left)
	right = copynumericWork(right)
	if left.sign == 0 {
		if right.sign == 0 {
			return 0
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if right.sign == 0 {
		return 1
	}
	if left.weight < right.weight {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.weight > right.weight {
		return 1
	}
	first := []rune(left.digits)
	second := []rune(right.digits)
	index := 0
	for index < len(first) || index < len(second) {
		a := 0
		b := 0
		if index < len(first) {
			a = langruntime.CheckedI32(numericWireDecimalDigit(first[index]))
		}
		if index < len(second) {
			b = langruntime.CheckedI32(numericWireDecimalDigit(second[index]))
		}
		if a < b {
			return langruntime.CheckedSignedNegate(1)
		}
		if a > b {
			return 1
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return 0
}
func numericWorkSum(left numericWork, right numericWork, subtract bool) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale := left.scale
	if right.scale > scale {
		scale = langruntime.CheckedI32(right.scale)
	}
	sign := left.sign
	otherSign := right.sign
	if subtract {
		otherSign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, otherSign))
	}
	adding := sign == otherSign
	swap := false
	if adding == false {
		order := numericWorkMagnitude(copynumericWork(left), copynumericWork(right))
		if order < 0 {
			swap = true
			sign = langruntime.CheckedI32(otherSign)
		}
		if order == 0 {
			sign = langruntime.CheckedI32(0)
		}
	}
	weight := left.weight
	if right.weight > weight {
		weight = langruntime.CheckedI32(right.weight)
	}
	weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
	first := []rune(left.digits)
	second := []rune(right.digits)
	aIndex := 0
	bIndex := 0
	aDigits := []numericWireDigit{}
	bDigits := []numericWireDigit{}
	position := weight
	for position >= langruntime.CheckedSignedSubtract(0, scale) {
		a := 0
		b := 0
		if position <= left.weight && aIndex < len(first) {
			a = langruntime.CheckedI32(numericWireDecimalDigit(first[aIndex]))
			aIndex = langruntime.CheckedAdd(aIndex, 1)
		}
		if position <= right.weight && bIndex < len(second) {
			b = langruntime.CheckedI32(numericWireDecimalDigit(second[bIndex]))
			bIndex = langruntime.CheckedAdd(bIndex, 1)
		}
		langruntime.CheckedAdd(len(aDigits), 1)
		aDigits = append(aDigits, copynumericWireDigit(numericWireDigit{value: a}))
		langruntime.CheckedAdd(len(bDigits), 1)
		bDigits = append(bDigits, copynumericWireDigit(numericWireDigit{value: b}))
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	result := []numericWireDigit{}
	index := 0
	for index < len(aDigits) {
		langruntime.CheckedAdd(len(result), 1)
		result = append(result, copynumericWireDigit(numericWireDigit{value: 0}))
		index = langruntime.CheckedAdd(index, 1)
	}
	carry := 0
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		a := aDigits[index].value
		b := bDigits[index].value
		if swap {
			a = langruntime.CheckedI32(bDigits[index].value)
			b = langruntime.CheckedI32(aDigits[index].value)
		}
		digit := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(a, b), carry)
		if adding {
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(digit, 10))
			digit = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(digit, 10))
		} else {
			digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(a, b), carry))
			carry = langruntime.CheckedI32(0)
			if digit < 0 {
				digit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(digit, 10))
				carry = langruntime.CheckedI32(1)
			}
		}
		result[index] = copynumericWireDigit(numericWireDigit{value: digit})
	}
	end := len(result)
	for end > 0 && result[langruntime.CheckedSubtract(end, 1)].value == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	start := 0
	for start < end && result[start].value == 0 {
		start = langruntime.CheckedAdd(start, 1)
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	digits := langruntime.NewTextBuffer("")
	index = langruntime.CheckedIndex(start)
	for index < end {
		digits = append(digits, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(result[index].value, 48)), '0')))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	if start == end {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: string(digits)}
}
func numericWorkAdd(left numericWork, right numericWork, subtract bool) checkruntime.NumericValue {
	left = copynumericWork(left)
	right = copynumericWork(right)
	work := numericWorkSum(left, right, subtract)
	if work.weight > 131071 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
}
func numericProductWords(characters []rune) []numericWireDigit {
	characters = langruntime.CheckedChars(characters)
	words := []numericWireDigit{}
	end := len(characters)
	for end > 0 {
		value := 0
		factor := 1
		width := 0
		for end > 0 && width < 4 {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
			value = langruntime.CheckedI32(langruntime.CheckedSignedAdd(value, langruntime.CheckedSignedMultiply(numericWireDecimalDigit(characters[end]), factor)))
			factor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(factor, 10))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, copynumericWireDigit(numericWireDigit{value: value}))
	}
	return words
}
func numericWorkProduct(left numericWork, right numericWork) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale := langruntime.CheckedSignedAdd(left.scale, right.scale)
	sign := langruntime.CheckedSignedMultiply(left.sign, right.sign)
	first := []rune(left.digits)
	second := []rune(right.digits)
	aCount := 0
	bCount := 0
	index := 0
	for index < len(first) {
		aCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(aCount, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	index = langruntime.CheckedIndex(0)
	for index < len(second) {
		bCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bCount, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	a := numericProductWords(first)
	b := numericProductWords(second)
	result := []numericWireDigit{}
	index = langruntime.CheckedIndex(0)
	for index < langruntime.CheckedAdd(langruntime.CheckedAdd(len(a), len(b)), 1) {
		langruntime.CheckedAdd(len(result), 1)
		result = append(result, copynumericWireDigit(numericWireDigit{value: 0}))
		index = langruntime.CheckedAdd(index, 1)
	}
	aIndex := 0
	for aIndex < len(a) {
		bIndex := 0
		carry := 0
		for bIndex < len(b) {
			offset := langruntime.CheckedAdd(aIndex, bIndex)
			product := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(a[aIndex].value, b[bIndex].value), result[offset].value), carry)
			result[offset] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(product, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(product, 10000))
			bIndex = langruntime.CheckedAdd(bIndex, 1)
		}
		offset := langruntime.CheckedAdd(aIndex, bIndex)
		for carry > 0 {
			word := langruntime.CheckedSignedAdd(result[offset].value, carry)
			result[offset] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(word, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(word, 10000))
			offset = langruntime.CheckedAdd(offset, 1)
		}
		aIndex = langruntime.CheckedAdd(aIndex, 1)
	}
	end := len(result)
	for end > 0 && result[langruntime.CheckedSubtract(end, 1)].value == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	coefficient := langruntime.NewTextBuffer("")
	count := 0
	for end > 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		word := result[end].value
		place := 1000
		for place > 0 {
			digit := langruntime.CheckedSignedDivide(word, place)
			word = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(word, place))
			if string(coefficient) != "" || digit != 0 {
				coefficient = append(coefficient, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))...)
				count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
			}
			place = langruntime.CheckedI32(langruntime.CheckedSignedDivide(place, 10))
		}
	}
	weight := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.weight, right.weight), count), aCount), bCount), 1)
	characters := []rune(string(coefficient))
	end = langruntime.CheckedIndex(len(characters))
	for end > 0 && characters[langruntime.CheckedSubtract(end, 1)] == '0' {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	digits := langruntime.NewTextBuffer("")
	index = langruntime.CheckedIndex(0)
	for index < end {
		digits = append(digits, string(langruntime.CheckedChar(characters[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	if sign == 0 {
		weight = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: string(digits)}
}
func numericWorkMultiply(left numericWork, right numericWork) checkruntime.NumericValue {
	left = copynumericWork(left)
	right = copynumericWork(right)
	work := numericWorkProduct(left, right)
	scale := work.scale
	return numericWorkRound(work, scale, 1)
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
			if mode == 2 {
				return numericWorkMultiply(first, second)
			}
			return numericWorkAdd(first, second, mode == 1)
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

func numericDivisionScale(left numericWork, right numericWork) int {
	left = copynumericWork(left)
	right = copynumericWork(right)
	firstWeight := 0
	secondWeight := 0
	firstDigit := 0
	secondDigit := 0
	first := []rune(left.digits)
	second := []rune(right.digits)
	if left.sign != 0 {
		firstWeight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(left.weight, 4))
		width := langruntime.CheckedSignedRemainder(left.weight, 4)
		if width < 0 {
			firstWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(firstWeight, 1))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 4))
		}
		width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		index := 0
		for width > 0 {
			firstDigit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(firstDigit, 10))
			if index < len(first) {
				firstDigit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(firstDigit, numericWireDecimalDigit(first[index])))
			}
			index = langruntime.CheckedAdd(index, 1)
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
	}
	if right.sign != 0 {
		secondWeight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(right.weight, 4))
		width := langruntime.CheckedSignedRemainder(right.weight, 4)
		if width < 0 {
			secondWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(secondWeight, 1))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 4))
		}
		width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		index := 0
		for width > 0 {
			secondDigit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(secondDigit, 10))
			if index < len(second) {
				secondDigit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(secondDigit, numericWireDecimalDigit(second[index])))
			}
			index = langruntime.CheckedAdd(index, 1)
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
	}
	quotientWeight := langruntime.CheckedSignedSubtract(firstWeight, secondWeight)
	if firstDigit <= secondDigit {
		quotientWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(quotientWeight, 1))
	}
	scale := langruntime.CheckedSignedSubtract(16, langruntime.CheckedSignedMultiply(quotientWeight, 4))
	if scale < left.scale {
		scale = langruntime.CheckedI32(left.scale)
	}
	if scale < right.scale {
		scale = langruntime.CheckedI32(right.scale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	return scale
}
func numericDivisionWork(left numericWork, right numericWork, scale int, rounding bool) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale = langruntime.CheckedI32(scale)
	first := []rune(left.digits)
	second := []rune(right.digits)
	denominator := []numericWireDigit{}
	remainder := []numericWireDigit{}
	langruntime.CheckedAdd(len(remainder), 1)
	remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: 0}))
	secondExponent := langruntime.CheckedSignedAdd(right.weight, 1)
	index := 0
	for index < len(second) {
		langruntime.CheckedAdd(len(denominator), 1)
		denominator = append(denominator, copynumericWireDigit(numericWireDigit{value: numericWireDecimalDigit(second[index])}))
		langruntime.CheckedAdd(len(remainder), 1)
		remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: 0}))
		secondExponent = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(secondExponent, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	position := langruntime.CheckedSignedSubtract(left.weight, secondExponent)
	boundary := langruntime.CheckedSignedSubtract(0, scale)
	if rounding {
		boundary = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(boundary, 1))
	}
	coefficient := langruntime.NewTextBuffer("")
	weight := 0
	sign := 0
	index = langruntime.CheckedIndex(0)
	for position >= boundary && left.sign != 0 {
		cursor := 0
		for langruntime.CheckedAdd(cursor, 1) < len(remainder) {
			remainder[cursor] = copynumericWireDigit(remainder[langruntime.CheckedAdd(cursor, 1)])
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		digit := 0
		if index < len(first) {
			digit = langruntime.CheckedI32(numericWireDecimalDigit(first[index]))
		}
		remainder[cursor] = copynumericWireDigit(numericWireDigit{value: digit})
		index = langruntime.CheckedAdd(index, 1)
		quotient := 0
		subtract := true
		for subtract {
			subtract = remainder[0].value != 0
			if subtract == false {
				order := 0
				cursor = langruntime.CheckedIndex(0)
				for cursor < len(denominator) && order == 0 {
					if remainder[langruntime.CheckedAdd(cursor, 1)].value < denominator[cursor].value {
						order = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
					}
					if remainder[langruntime.CheckedAdd(cursor, 1)].value > denominator[cursor].value {
						order = langruntime.CheckedI32(1)
					}
					cursor = langruntime.CheckedAdd(cursor, 1)
				}
				subtract = order >= 0
			}
			if subtract {
				borrow := 0
				cursor = langruntime.CheckedIndex(len(denominator))
				for cursor > 0 {
					difference := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(remainder[cursor].value, denominator[langruntime.CheckedSubtract(cursor, 1)].value), borrow)
					borrow = langruntime.CheckedI32(0)
					if difference < 0 {
						difference = langruntime.CheckedI32(langruntime.CheckedSignedAdd(difference, 10))
						borrow = langruntime.CheckedI32(1)
					}
					remainder[cursor] = copynumericWireDigit(numericWireDigit{value: difference})
					cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
				}
				remainder[0] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedSubtract(remainder[0].value, borrow)})
				quotient = langruntime.CheckedI32(langruntime.CheckedSignedAdd(quotient, 1))
			}
		}
		if quotient != 0 && sign == 0 {
			sign = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(left.sign, right.sign))
			weight = langruntime.CheckedI32(position)
		}
		if sign != 0 {
			coefficient = append(coefficient, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(quotient, 48)), '0')))...)
		}
		nonzero := false
		cursor = langruntime.CheckedIndex(0)
		for cursor < len(remainder) {
			if remainder[cursor].value != 0 {
				nonzero = true
			}
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		if index >= len(first) && nonzero == false {
			position = langruntime.CheckedI32(boundary)
		}
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: string(coefficient)}
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
			if mode == 2 {
				quotient := numericDivisionWork(copynumericWork(a), copynumericWork(b), 0, false)
				product := numericWorkMultiply(quotient, b)
				if product.Kind == checkruntime.NumericValueValue {
					multiplied := langruntime.CheckedString(product.Value)
					return numericWorkAdd(a, numericWorkFromValue(multiplied), true)
				}
				return product
			}
			scale := 0
			rounding := false
			if mode == 0 {
				scale = langruntime.CheckedI32(numericDivisionScale(copynumericWork(a), copynumericWork(b)))
				rounding = true
			}
			quotient := numericDivisionWork(a, b, scale, rounding)
			roundMode := 0
			if rounding {
				roundMode = langruntime.CheckedI32(1)
			}
			return numericWorkRound(quotient, scale, roundMode)
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
			return numericWorkRound(work, precision, 1)
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
			return numericWorkRound(work, precision, 0)
		}
	}
	return checkruntime.NumericUnresolved(unresolvedFlavor)
}

type numericWireDigit struct {
	value int
}

func copynumericWireDigit(value numericWireDigit) numericWireDigit {
	return numericWireDigit{value: langruntime.CheckedI32(value.value)}
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

func numericWorkRounded(work numericWork, scale int, mode int) numericWork {
	work = copynumericWork(work)
	scale = langruntime.CheckedI32(scale)
	mode = langruntime.CheckedI32(mode)
	original := []rune(work.digits)
	boundary := langruntime.CheckedSignedSubtract(0, scale)
	digits := []rune{}
	position := work.weight
	index := 0
	for index < len(original) && position >= boundary {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedChar(original[index]))
		index = langruntime.CheckedAdd(index, 1)
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	increase := false
	if index < len(original) {
		if mode == 1 && position == langruntime.CheckedSignedSubtract(boundary, 1) && numericWireDecimalDigit(original[index]) >= 5 {
			increase = true
		}
		if mode == 2 && work.sign > 0 {
			increase = true
		}
		if mode == 3 && work.sign < 0 {
			increase = true
		}
	}
	weight := work.weight
	leadingCarry := false
	if increase {
		if len(digits) == 0 {
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedChar('1'))
			weight = langruntime.CheckedI32(boundary)
		} else {
			carry := true
			cursor := len(digits)
			symbols := []rune("0123456789")
			for cursor > 0 && carry {
				cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
				if digits[cursor] == '9' {
					digits[cursor] = langruntime.CheckedChar('0')
				} else {
					symbol := 0
					for symbols[symbol] != digits[cursor] {
						symbol = langruntime.CheckedAdd(symbol, 1)
					}
					digits[cursor] = langruntime.CheckedChar(symbols[langruntime.CheckedAdd(symbol, 1)])
					carry = false
				}
			}
			if carry {
				leadingCarry = true
				weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
			}
		}
	}
	end := len(digits)
	for end > 0 && digits[langruntime.CheckedSubtract(end, 1)] == '0' {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	coefficient := langruntime.NewTextBuffer("")
	cursor := 0
	if leadingCarry {
		coefficient = append(coefficient, string(langruntime.CheckedChar('1'))...)
	} else {
		for cursor < end {
			coefficient = append(coefficient, string(langruntime.CheckedChar(digits[cursor]))...)
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
	}
	sign := work.sign
	if end == 0 && leadingCarry == false {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	outputScale := scale
	if outputScale < 0 {
		outputScale = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: outputScale, digits: string(coefficient)}
}
func numericWorkRound(work numericWork, requested int, mode int) checkruntime.NumericValue {
	work = copynumericWork(work)
	requested = langruntime.CheckedI32(requested)
	mode = langruntime.CheckedI32(mode)
	unresolvedFlavor := 0
	if work.valid == false {
		return checkruntime.NumericUnresolved(unresolvedFlavor)
	}
	if work.special != 1 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
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
	rounded := numericWorkRounded(work, scale, mode)
	if rounded.weight > 131071 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(rounded)}
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
