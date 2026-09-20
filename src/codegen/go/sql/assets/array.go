package pgsidsql

type SqlArray struct {
	ElementType string
	Dimensions  []int64
	LowerBounds []int64
	Elements    []SqlArrayElement
	Valid       bool
	Error       string
}

type SqlArrayElement struct {
	Type  string
	Value any
	Valid bool
	Error string
}

func arrayElementInput(elementType string, value any) SqlArrayElement {
	switch typed := value.(type) {
	case SqlInteger:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlFloat:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlDecimal:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlBoolean:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlText:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlUuid:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlEnum:
		return SqlArrayElement{Type: elementType, Value: typed, Valid: typed.Valid, Error: typed.Error}
	default:
		return SqlArrayElement{Error: "XX000"}
	}
}

func arrayCoerceElement(target string, element SqlArrayElement) SqlArrayElement {
	if element.Type == target || !element.Valid || element.Error != "" {
		element.Type = target
		return element
	}
	source := element.Type
	var value any
	switch target {
	case `pg_catalog."numeric"`:
		if strings.HasPrefix(source, "pg_catalog.int") {
			value = decimalFromInteger(element.Value.(SqlInteger))
		}
	case "pg_catalog.float4":
		switch typed := element.Value.(type) {
		case SqlInteger:
			value = float4FromInteger(typed)
		case SqlDecimal:
			value = float4FromDecimal(typed)
		case SqlFloat:
			value = SqlFloat{Value: float64(float32(typed.Value)), Valid: true}
		}
	case "pg_catalog.float8":
		switch typed := element.Value.(type) {
		case SqlInteger:
			value = float8FromInteger(typed)
		case SqlDecimal:
			value = float8FromDecimal(typed)
		case SqlFloat:
			value = typed
		}
	case "pg_catalog.text", `pg_catalog."varchar"`:
		if source == "pg_catalog.bpchar" {
			value = bpcharText(element.Value.(SqlText))
		} else if source == "pg_catalog.text" || source == `pg_catalog."varchar"` {
			value = element.Value
		}
	default:
		if strings.HasPrefix(target, "pg_catalog.int") && strings.HasPrefix(source, "pg_catalog.int") {
			value = element.Value
		}
	}
	if value == nil {
		return SqlArrayElement{Error: "XX000"}
	}
	return arrayElementInput(target, value)
}

func arrayCoerce(target string, value SqlArray) SqlArray {
	if value.Error != "" || value.ElementType == target {
		return value
	}
	if !value.Valid {
		value.ElementType = target
		return value
	}
	elements := make([]SqlArrayElement, len(value.Elements))
	for index, element := range value.Elements {
		elements[index] = arrayCoerceElement(target, element)
		if elements[index].Error != "" {
			return SqlArray{Error: elements[index].Error}
		}
	}
	value.ElementType = target
	value.Elements = elements
	return value
}

func arrayElementText(elementType string, element SqlArrayElement) string {
	var output string
	switch value := element.Value.(type) {
	case SqlInteger:
		output = strconv.FormatInt(value.Value, 10)
	case SqlFloat:
		switch {
		case math.IsNaN(value.Value):
			output = "NaN"
		case math.IsInf(value.Value, 1):
			output = "Infinity"
		case math.IsInf(value.Value, -1):
			output = "-Infinity"
		default:
			bits := 64
			if elementType == "pg_catalog.float4" {
				bits = 32
			}
			output = strconv.FormatFloat(value.Value, 'g', -1, bits)
		}
	case SqlDecimal:
		output = sqlDecimalText(value)
	case SqlBoolean:
		if value.Value {
			output = "t"
		} else {
			output = "f"
		}
	case SqlText:
		output = value.Value
	case SqlUuid:
		output = uuidText(value).Value
	case SqlEnum:
		output = value.Label
	}
	if elementType == "pg_catalog.text" || elementType == `pg_catalog."varchar"` || elementType == "pg_catalog.bpchar" {
		quote := output == "" || strings.EqualFold(output, "NULL") || strings.ContainsAny(output, ",\"\\{} \t\r\n")
		if quote {
			output = `"` + strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(output) + `"`
		}
	}
	return output
}

func arrayElementCompare(elementType string, left, right SqlArrayElement) SqlInteger {
	switch a := left.Value.(type) {
	case SqlInteger:
		b := right.Value.(SqlInteger)
		if a.Value < b.Value {
			return SqlInteger{Value: -1, Valid: true}
		}
		if a.Value > b.Value {
			return SqlInteger{Value: 1, Valid: true}
		}
		return SqlInteger{Value: 0, Valid: true}
	case SqlFloat:
		return sqlFloatCompare(a, right.Value.(SqlFloat))
	case SqlDecimal:
		return sqlDecimalCompare(a, right.Value.(SqlDecimal))
	case SqlBoolean:
		b := right.Value.(SqlBoolean)
		av, bv := int64(0), int64(0)
		if a.Value {
			av = 1
		}
		if b.Value {
			bv = 1
		}
		return SqlInteger{Value: av - bv, Valid: true}
	case SqlText:
		b := right.Value.(SqlText)
		leftText, rightText := a.Value, b.Value
		if elementType == "pg_catalog.bpchar" {
			leftText = strings.TrimRight(leftText, " ")
			rightText = strings.TrimRight(rightText, " ")
		}
		return SqlInteger{Value: int64(strings.Compare(leftText, rightText)), Valid: true}
	case SqlUuid:
		return uuidCompare(a, right.Value.(SqlUuid))
	case SqlEnum:
		return enumCompare(a, right.Value.(SqlEnum))
	default:
		return SqlInteger{Error: "XX000"}
	}
}

func arrayInput(elementType string, dimensions, lowerBounds []int64, elements []SqlArrayElement) SqlArray {
	for _, element := range elements {
		if element.Error != "" {
			return SqlArray{Error: element.Error}
		}
	}
	return SqlArray{
		ElementType: elementType,
		Dimensions:  append([]int64{}, dimensions...),
		LowerBounds: append([]int64{}, lowerBounds...),
		Elements:    append([]SqlArrayElement{}, elements...),
		Valid:       true,
	}
}

func arrayText(value SqlArray) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	if len(value.Dimensions) == 0 {
		return SqlText{Value: "{}", Valid: true}
	}
	offset := 0
	var render func(int) string
	render = func(depth int) string {
		var output strings.Builder
		output.WriteByte('{')
		for index := int64(0); index < value.Dimensions[depth]; index++ {
			if index > 0 {
				output.WriteByte(',')
			}
			if depth == len(value.Dimensions)-1 {
				element := value.Elements[offset]
				offset++
				if !element.Valid {
					output.WriteString("NULL")
				} else {
					output.WriteString(arrayElementText(value.ElementType, element))
				}
			} else {
				output.WriteString(render(depth + 1))
			}
		}
		output.WriteByte('}')
		return output.String()
	}
	output := render(0)
	hasCustomBounds := false
	for _, bound := range value.LowerBounds {
		if bound != 1 {
			hasCustomBounds = true
			break
		}
	}
	if hasCustomBounds {
		var prefix strings.Builder
		for index, dimension := range value.Dimensions {
			prefix.WriteByte('[')
			prefix.WriteString(strconv.FormatInt(value.LowerBounds[index], 10))
			prefix.WriteByte(':')
			prefix.WriteString(strconv.FormatInt(value.LowerBounds[index]+dimension-1, 10))
			prefix.WriteByte(']')
		}
		output = prefix.String() + "=" + output
	}
	return SqlText{Value: output, Valid: true}
}

func arrayCardinality(value SqlArray) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(len(value.Elements)), Valid: true}
}

func arrayNdims(value SqlArray) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid || len(value.Dimensions) == 0 {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(len(value.Dimensions)), Valid: true}
}

func arrayDims(value SqlArray) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid || len(value.Dimensions) == 0 {
		return SqlText{}
	}
	var output strings.Builder
	for index, dimension := range value.Dimensions {
		output.WriteByte('[')
		output.WriteString(strconv.FormatInt(value.LowerBounds[index], 10))
		output.WriteByte(':')
		output.WriteString(strconv.FormatInt(value.LowerBounds[index]+dimension-1, 10))
		output.WriteByte(']')
	}
	return SqlText{Value: output.String(), Valid: true}
}

func arrayDimension(value SqlArray, dimension SqlInteger, part string) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if dimension.Error != "" {
		return SqlInteger{Error: dimension.Error}
	}
	if !value.Valid || !dimension.Valid || dimension.Value <= 0 || dimension.Value > int64(len(value.Dimensions)) {
		return SqlInteger{}
	}
	index := int(dimension.Value - 1)
	switch part {
	case "length":
		return SqlInteger{Value: value.Dimensions[index], Valid: true}
	case "lower":
		return SqlInteger{Value: value.LowerBounds[index], Valid: true}
	default:
		return SqlInteger{Value: value.LowerBounds[index] + value.Dimensions[index] - 1, Valid: true}
	}
}

func arrayLength(value SqlArray, dimension SqlInteger) SqlInteger {
	return arrayDimension(value, dimension, "length")
}

func arrayLower(value SqlArray, dimension SqlInteger) SqlInteger {
	return arrayDimension(value, dimension, "lower")
}

func arrayUpper(value SqlArray, dimension SqlInteger) SqlInteger {
	return arrayDimension(value, dimension, "upper")
}

func arrayCompare(left, right SqlArray) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if left.ElementType != right.ElementType {
		return SqlInteger{Error: "42804"}
	}
	count := min(len(left.Elements), len(right.Elements))
	for index := 0; index < count; index++ {
		a, b := left.Elements[index], right.Elements[index]
		if !a.Valid && !b.Valid {
			continue
		}
		if !a.Valid {
			return SqlInteger{Value: 1, Valid: true}
		}
		if !b.Valid {
			return SqlInteger{Value: -1, Valid: true}
		}
		comparison := arrayElementCompare(left.ElementType, a, b)
		if comparison.Error != "" {
			return comparison
		}
		if comparison.Value != 0 {
			return comparison
		}
	}
	if len(left.Elements) != len(right.Elements) {
		if len(left.Elements) < len(right.Elements) {
			return SqlInteger{Value: -1, Valid: true}
		}
		return SqlInteger{Value: 1, Valid: true}
	}
	if len(left.Dimensions) != len(right.Dimensions) {
		if len(left.Dimensions) < len(right.Dimensions) {
			return SqlInteger{Value: -1, Valid: true}
		}
		return SqlInteger{Value: 1, Valid: true}
	}
	for index, dimension := range left.Dimensions {
		if dimension < right.Dimensions[index] {
			return SqlInteger{Value: -1, Valid: true}
		}
		if dimension > right.Dimensions[index] {
			return SqlInteger{Value: 1, Valid: true}
		}
	}
	for index, bound := range left.LowerBounds {
		if bound < right.LowerBounds[index] {
			return SqlInteger{Value: -1, Valid: true}
		}
		if bound > right.LowerBounds[index] {
			return SqlInteger{Value: 1, Valid: true}
		}
	}
	return SqlInteger{Value: 0, Valid: true}
}

func arrayComparison(left, right SqlArray, operation string) SqlBoolean {
	comparison := arrayCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	var result bool
	switch operation {
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func arrayLt(left, right SqlArray) SqlBoolean { return arrayComparison(left, right, "lt") }
func arrayLe(left, right SqlArray) SqlBoolean { return arrayComparison(left, right, "le") }
func arrayGt(left, right SqlArray) SqlBoolean { return arrayComparison(left, right, "gt") }
func arrayGe(left, right SqlArray) SqlBoolean { return arrayComparison(left, right, "ge") }

func arrayEq(left, right SqlArray) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	if left.ElementType != right.ElementType {
		return SqlBoolean{Error: "42804"}
	}
	if len(left.Dimensions) != len(right.Dimensions) || len(left.Elements) != len(right.Elements) {
		return SqlBoolean{Value: false, Valid: true}
	}
	for index := range left.Dimensions {
		if left.Dimensions[index] != right.Dimensions[index] || left.LowerBounds[index] != right.LowerBounds[index] {
			return SqlBoolean{Value: false, Valid: true}
		}
	}
	for index, element := range left.Elements {
		other := right.Elements[index]
		if element.Valid != other.Valid {
			return SqlBoolean{Value: false, Valid: true}
		}
		if element.Valid {
			comparison := arrayElementCompare(left.ElementType, element, other)
			if comparison.Error != "" {
				return SqlBoolean{Error: comparison.Error}
			}
			if comparison.Value != 0 {
				return SqlBoolean{Value: false, Valid: true}
			}
		}
	}
	return SqlBoolean{Value: true, Valid: true}
}

func arrayNe(left, right SqlArray) SqlBoolean {
	equal := arrayEq(left, right)
	if equal.Error != "" || !equal.Valid {
		return equal
	}
	equal.Value = !equal.Value
	return equal
}

func arrayContains(left, right SqlArray) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	for _, candidate := range right.Elements {
		if !candidate.Valid {
			return SqlBoolean{Value: false, Valid: true}
		}
		found := false
		for _, element := range left.Elements {
			if element.Valid {
				comparison := arrayElementCompare(left.ElementType, element, candidate)
				if comparison.Error != "" {
					return SqlBoolean{Error: comparison.Error}
				}
				if comparison.Value == 0 {
					found = true
					break
				}
			}
		}
		if !found {
			return SqlBoolean{Value: false, Valid: true}
		}
	}
	return SqlBoolean{Value: true, Valid: true}
}

func arrayContained(left, right SqlArray) SqlBoolean { return arrayContains(right, left) }

func arrayOverlap(left, right SqlArray) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	for _, candidate := range left.Elements {
		if !candidate.Valid {
			continue
		}
		for _, element := range right.Elements {
			if element.Valid {
				comparison := arrayElementCompare(left.ElementType, element, candidate)
				if comparison.Error != "" {
					return SqlBoolean{Error: comparison.Error}
				}
				if comparison.Value == 0 {
					return SqlBoolean{Value: true, Valid: true}
				}
			}
		}
	}
	return SqlBoolean{Value: false, Valid: true}
}

func arrayConcat(left, right SqlArray) SqlArray {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid {
		return right
	}
	if !right.Valid {
		return left
	}
	if left.ElementType != right.ElementType {
		return SqlArray{Error: "42804"}
	}
	if len(left.Dimensions) == 0 {
		return right
	}
	if len(right.Dimensions) == 0 {
		return left
	}
	difference := len(left.Dimensions) - len(right.Dimensions)
	if difference < -1 || difference > 1 {
		return SqlArray{Error: "2202E"}
	}
	var dimensions, lowerBounds []int64
	if difference == 0 {
		for index := 1; index < len(left.Dimensions); index++ {
			if left.Dimensions[index] != right.Dimensions[index] || left.LowerBounds[index] != right.LowerBounds[index] {
				return SqlArray{Error: "2202E"}
			}
		}
		dimensions = append([]int64{}, left.Dimensions...)
		dimensions[0] += right.Dimensions[0]
		lowerBounds = append([]int64{}, left.LowerBounds...)
	} else {
		outer, inner := left, right
		if difference < 0 {
			outer, inner = right, left
		}
		for index := range inner.Dimensions {
			if inner.Dimensions[index] != outer.Dimensions[index+1] || inner.LowerBounds[index] != outer.LowerBounds[index+1] {
				return SqlArray{Error: "2202E"}
			}
		}
		dimensions = append([]int64{}, outer.Dimensions...)
		dimensions[0]++
		lowerBounds = append([]int64{}, outer.LowerBounds...)
	}
	elements := append([]SqlArrayElement{}, left.Elements...)
	elements = append(elements, right.Elements...)
	return SqlArray{
		ElementType: left.ElementType,
		Dimensions:  dimensions,
		LowerBounds: lowerBounds,
		Elements:    elements,
		Valid:       true,
	}
}

func arraySubscript(value SqlArray, subscripts ...SqlInteger) SqlArrayElement {
	if value.Error != "" {
		return SqlArrayElement{Error: value.Error}
	}
	if !value.Valid || len(subscripts) != len(value.Dimensions) {
		return SqlArrayElement{}
	}
	offset := int64(0)
	for index, subscript := range subscripts {
		if subscript.Error != "" {
			return SqlArrayElement{Error: subscript.Error}
		}
		if !subscript.Valid {
			return SqlArrayElement{}
		}
		position := subscript.Value - value.LowerBounds[index]
		if position < 0 || position >= value.Dimensions[index] {
			return SqlArrayElement{}
		}
		offset = offset*value.Dimensions[index] + position
	}
	return value.Elements[offset]
}

func arraySubscriptInteger(value SqlArray, subscripts ...SqlInteger) SqlInteger {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlInteger{Error: element.Error}
	}
	if !element.Valid {
		return SqlInteger{}
	}
	return element.Value.(SqlInteger)
}

func arraySubscriptFloat(value SqlArray, subscripts ...SqlInteger) SqlFloat {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlFloat{Error: element.Error}
	}
	if !element.Valid {
		return SqlFloat{}
	}
	return element.Value.(SqlFloat)
}

func arraySubscriptDecimal(value SqlArray, subscripts ...SqlInteger) SqlDecimal {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlDecimal{Error: element.Error}
	}
	if !element.Valid {
		return SqlDecimal{}
	}
	return element.Value.(SqlDecimal)
}

func arraySubscriptBoolean(value SqlArray, subscripts ...SqlInteger) SqlBoolean {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlBoolean{Error: element.Error}
	}
	if !element.Valid {
		return SqlBoolean{}
	}
	return element.Value.(SqlBoolean)
}

func arraySubscriptText(value SqlArray, subscripts ...SqlInteger) SqlText {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlText{Error: element.Error}
	}
	if !element.Valid {
		return SqlText{}
	}
	return element.Value.(SqlText)
}

func arraySubscriptUuid(value SqlArray, subscripts ...SqlInteger) SqlUuid {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlUuid{Error: element.Error}
	}
	if !element.Valid {
		return SqlUuid{}
	}
	return element.Value.(SqlUuid)
}

func arraySubscriptEnum(value SqlArray, subscripts ...SqlInteger) SqlEnum {
	element := arraySubscript(value, subscripts...)
	if element.Error != "" {
		return SqlEnum{Error: element.Error}
	}
	if !element.Valid {
		return SqlEnum{}
	}
	return element.Value.(SqlEnum)
}

func arrayElementNotDistinct(elementType string, left, right SqlArrayElement) (bool, string) {
	if !left.Valid || !right.Valid {
		return !left.Valid && !right.Valid, ""
	}
	comparison := arrayElementCompare(elementType, left, right)
	return comparison.Valid && comparison.Value == 0, comparison.Error
}

func arrayAppend(value SqlArray, element SqlArrayElement) SqlArray {
	if value.Error != "" {
		return value
	}
	if !value.Valid || len(value.Dimensions) == 0 {
		return SqlArray{
			ElementType: element.Type,
			Dimensions:  []int64{1},
			LowerBounds: []int64{1},
			Elements:    []SqlArrayElement{element},
			Valid:       true,
		}
	}
	if len(value.Dimensions) != 1 {
		return SqlArray{Error: "22000"}
	}
	dimension := value.Dimensions[0] + 1
	if value.LowerBounds[0]+dimension-1 > 2147483647 {
		return SqlArray{Error: "22003"}
	}
	value.Dimensions = []int64{dimension}
	value.Elements = append(append([]SqlArrayElement{}, value.Elements...), element)
	return value
}

func arrayPrepend(element SqlArrayElement, value SqlArray) SqlArray {
	if value.Error != "" {
		return value
	}
	if !value.Valid || len(value.Dimensions) == 0 {
		return SqlArray{
			ElementType: element.Type,
			Dimensions:  []int64{1},
			LowerBounds: []int64{1},
			Elements:    []SqlArrayElement{element},
			Valid:       true,
		}
	}
	if len(value.Dimensions) != 1 {
		return SqlArray{Error: "22000"}
	}
	if value.LowerBounds[0] == -2147483648 {
		return SqlArray{Error: "22003"}
	}
	value.Dimensions = []int64{value.Dimensions[0] + 1}
	value.Elements = append([]SqlArrayElement{element}, value.Elements...)
	return value
}

func arrayPosition(value SqlArray, search SqlArrayElement) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if len(value.Dimensions) > 1 {
		return SqlInteger{Error: "0A000"}
	}
	if len(value.Dimensions) == 0 {
		return SqlInteger{}
	}
	return arrayPositionFrom(value, search, value.LowerBounds[0])
}

func arrayPositionStart(value SqlArray, search SqlArrayElement, start SqlInteger) SqlInteger {
	if start.Error != "" {
		return SqlInteger{Error: start.Error}
	}
	if !start.Valid {
		return SqlInteger{Error: "22004"}
	}
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if len(value.Dimensions) > 1 {
		return SqlInteger{Error: "0A000"}
	}
	if len(value.Dimensions) == 0 {
		return SqlInteger{}
	}
	return arrayPositionFrom(value, search, start.Value)
}

func arrayPositionFrom(value SqlArray, search SqlArrayElement, start int64) SqlInteger {
	first := max(int64(0), start-value.LowerBounds[0])
	for index := first; index < int64(len(value.Elements)); index++ {
		match, code := arrayElementNotDistinct(value.ElementType, value.Elements[index], search)
		if code != "" {
			return SqlInteger{Error: code}
		}
		if match {
			return SqlInteger{Value: value.LowerBounds[0] + index, Valid: true}
		}
	}
	return SqlInteger{}
}

func arrayPositions(value SqlArray, search SqlArrayElement) SqlArray {
	if value.Error != "" {
		return SqlArray{Error: value.Error}
	}
	if !value.Valid {
		return SqlArray{}
	}
	if len(value.Dimensions) > 1 {
		return SqlArray{Error: "0A000"}
	}
	elements := []SqlArrayElement{}
	if len(value.Dimensions) == 1 {
		for index, element := range value.Elements {
			match, code := arrayElementNotDistinct(value.ElementType, element, search)
			if code != "" {
				return SqlArray{Error: code}
			}
			if match {
				position := SqlInteger{Value: value.LowerBounds[0] + int64(index), Valid: true}
				elements = append(elements, arrayElementInput("pg_catalog.int4", position))
			}
		}
	}
	if len(elements) == 0 {
		return SqlArray{ElementType: "pg_catalog.int4", Valid: true}
	}
	return SqlArray{
		ElementType: "pg_catalog.int4",
		Dimensions:  []int64{int64(len(elements))},
		LowerBounds: []int64{1},
		Elements:    elements,
		Valid:       true,
	}
}

func arrayRemove(value SqlArray, search SqlArrayElement) SqlArray {
	if value.Error != "" || !value.Valid {
		return value
	}
	if len(value.Dimensions) > 1 {
		return SqlArray{Error: "0A000"}
	}
	if len(value.Dimensions) == 0 {
		return value
	}
	elements := []SqlArrayElement{}
	for _, element := range value.Elements {
		match, code := arrayElementNotDistinct(value.ElementType, element, search)
		if code != "" {
			return SqlArray{Error: code}
		}
		if !match {
			elements = append(elements, element)
		}
	}
	if len(elements) == 0 {
		return SqlArray{ElementType: value.ElementType, Valid: true}
	}
	value.Dimensions = []int64{int64(len(elements))}
	value.Elements = elements
	return value
}

func arrayReplace(value SqlArray, search, replacement SqlArrayElement) SqlArray {
	if value.Error != "" || !value.Valid {
		return value
	}
	elements := append([]SqlArrayElement{}, value.Elements...)
	for index, element := range elements {
		match, code := arrayElementNotDistinct(value.ElementType, element, search)
		if code != "" {
			return SqlArray{Error: code}
		}
		if match {
			elements[index] = replacement
		}
	}
	value.Elements = elements
	return value
}

func arrayFill(element SqlArrayElement, dimensions SqlArray) SqlArray {
	return arrayFillInternal(element, dimensions, SqlArray{}, false)
}

func arrayFillBounds(element SqlArrayElement, dimensions, lowerBounds SqlArray) SqlArray {
	return arrayFillInternal(element, dimensions, lowerBounds, true)
}

func arrayFillInternal(element SqlArrayElement, dimensions, lowerBounds SqlArray, hasBounds bool) SqlArray {
	if dimensions.Error != "" {
		return SqlArray{Error: dimensions.Error}
	}
	if !dimensions.Valid || (hasBounds && !lowerBounds.Valid) {
		return SqlArray{Error: "22004"}
	}
	if len(dimensions.Dimensions) > 1 || (hasBounds && len(lowerBounds.Dimensions) > 1) {
		return SqlArray{Error: "2202E"}
	}
	dims := make([]int64, len(dimensions.Elements))
	for index, value := range dimensions.Elements {
		if !value.Valid {
			return SqlArray{Error: "22004"}
		}
		dims[index] = value.Value.(SqlInteger).Value
		if dims[index] < 0 {
			return SqlArray{Error: "54000"}
		}
	}
	if len(dims) > 6 {
		return SqlArray{Error: "54000"}
	}
	lbs := make([]int64, len(dims))
	if hasBounds {
		if len(lowerBounds.Elements) != len(dims) {
			return SqlArray{Error: "2202E"}
		}
		for index, value := range lowerBounds.Elements {
			if !value.Valid {
				return SqlArray{Error: "22004"}
			}
			lbs[index] = value.Value.(SqlInteger).Value
		}
	} else {
		for index := range lbs {
			lbs[index] = 1
		}
	}
	count := int64(1)
	for _, dimension := range dims {
		count *= dimension
	}
	if len(dims) == 0 || count == 0 {
		return SqlArray{ElementType: element.Type, Valid: true}
	}
	elements := make([]SqlArrayElement, count)
	for index := range elements {
		elements[index] = element
	}
	return SqlArray{
		ElementType: element.Type,
		Dimensions:  dims,
		LowerBounds: lbs,
		Elements:    elements,
		Valid:       true,
	}
}

func arrayTrim(value SqlArray, count SqlInteger) SqlArray {
	if value.Error != "" {
		return value
	}
	if count.Error != "" {
		return SqlArray{Error: count.Error}
	}
	if !value.Valid || !count.Valid {
		return SqlArray{}
	}
	outer := int64(0)
	if len(value.Dimensions) > 0 {
		outer = value.Dimensions[0]
	}
	if count.Value < 0 || count.Value > outer {
		return SqlArray{Error: "2202E"}
	}
	if count.Value == outer {
		return SqlArray{ElementType: value.ElementType, Valid: true}
	}
	if len(value.Dimensions) == 0 || count.Value == 0 {
		return value
	}
	chunk := int64(len(value.Elements)) / outer
	value.Dimensions = append([]int64{}, value.Dimensions...)
	value.Dimensions[0] = outer - count.Value
	value.LowerBounds = make([]int64, len(value.Dimensions))
	for index := range value.LowerBounds {
		value.LowerBounds[index] = 1
	}
	value.Elements = append([]SqlArrayElement{}, value.Elements[:int64(len(value.Elements))-count.Value*chunk]...)
	return value
}

func arrayReverse(value SqlArray) SqlArray {
	if value.Error != "" || !value.Valid || len(value.Dimensions) == 0 || value.Dimensions[0] < 2 {
		return value
	}
	outer := value.Dimensions[0]
	chunk := int64(len(value.Elements)) / outer
	elements := make([]SqlArrayElement, 0, len(value.Elements))
	for index := outer - 1; index >= 0; index-- {
		elements = append(elements, value.Elements[index*chunk:(index+1)*chunk]...)
	}
	value.Elements = elements
	return value
}

func arraySort(value SqlArray) SqlArray {
	return arraySortInternal(value, SqlBoolean{Value: false, Valid: true}, SqlBoolean{Value: false, Valid: true})
}

func arraySortOrder(value SqlArray, descending SqlBoolean) SqlArray {
	return arraySortInternal(value, descending, descending)
}

func arraySortNulls(value SqlArray, descending, nullsFirst SqlBoolean) SqlArray {
	return arraySortInternal(value, descending, nullsFirst)
}

func arraySortInternal(value SqlArray, descending, nullsFirst SqlBoolean) SqlArray {
	if value.Error != "" {
		return value
	}
	if descending.Error != "" {
		return SqlArray{Error: descending.Error}
	}
	if nullsFirst.Error != "" {
		return SqlArray{Error: nullsFirst.Error}
	}
	if !value.Valid || !descending.Valid || !nullsFirst.Valid {
		return SqlArray{}
	}
	if len(value.Dimensions) == 0 || value.Dimensions[0] < 2 {
		return value
	}
	outer := int(value.Dimensions[0])
	chunk := len(value.Elements) / outer
	slices := make([][]SqlArrayElement, outer)
	for index := range slices {
		slices[index] = append([]SqlArrayElement{}, value.Elements[index*chunk:(index+1)*chunk]...)
	}
	sort.SliceStable(slices, func(i, j int) bool {
		for index := 0; index < chunk; index++ {
			left, right := slices[i][index], slices[j][index]
			if !left.Valid || !right.Valid {
				if !left.Valid && !right.Valid {
					continue
				}
				if len(value.Dimensions) == 1 {
					return !left.Valid == nullsFirst.Value
				}
				comparison := int64(-1)
				if !left.Valid {
					comparison = 1
				}
				if descending.Value {
					comparison = -comparison
				}
				return comparison < 0
			}
			comparison := arrayElementCompare(value.ElementType, left, right)
			if comparison.Value != 0 {
				if descending.Value {
					return comparison.Value > 0
				}
				return comparison.Value < 0
			}
		}
		return false
	})
	elements := make([]SqlArrayElement, 0, len(value.Elements))
	for _, slice := range slices {
		elements = append(elements, slice...)
	}
	value.Elements = elements
	return value
}

func arraySlice(
	value SqlArray,
	lowers, uppers []SqlInteger,
	lowerProvided, upperProvided []bool,
) SqlArray {
	if value.Error != "" || !value.Valid {
		return value
	}
	if len(value.Dimensions) == 0 || len(lowers) != len(value.Dimensions) {
		return SqlArray{ElementType: value.ElementType, Valid: true}
	}
	lowerValues, upperValues := make([]int64, len(lowers)), make([]int64, len(uppers))
	for index := range lowers {
		lowerValues[index] = value.LowerBounds[index]
		upperValues[index] = value.LowerBounds[index] + value.Dimensions[index] - 1
		if lowerProvided[index] {
			if !lowers[index].Valid {
				return SqlArray{}
			}
			lowerValues[index] = max(lowerValues[index], lowers[index].Value)
		}
		if upperProvided[index] {
			if !uppers[index].Valid {
				return SqlArray{}
			}
			upperValues[index] = min(upperValues[index], uppers[index].Value)
		}
		if lowerValues[index] > upperValues[index] {
			return SqlArray{ElementType: value.ElementType, Valid: true}
		}
	}
	dimensions := make([]int64, len(lowers))
	for index := range dimensions {
		dimensions[index] = upperValues[index] - lowerValues[index] + 1
	}
	elements := []SqlArrayElement{}
	var visit func(int, int64)
	visit = func(depth int, offset int64) {
		if depth == len(value.Dimensions) {
			elements = append(elements, value.Elements[offset])
			return
		}
		stride := int64(1)
		for _, dimension := range value.Dimensions[depth+1:] {
			stride *= dimension
		}
		for coordinate := lowerValues[depth]; coordinate <= upperValues[depth]; coordinate++ {
			visit(depth+1, offset+(coordinate-value.LowerBounds[depth])*stride)
		}
	}
	visit(0, 0)
	lowerBounds := make([]int64, len(dimensions))
	for index := range lowerBounds {
		lowerBounds[index] = 1
	}
	return SqlArray{
		ElementType: value.ElementType,
		Dimensions:  dimensions,
		LowerBounds: lowerBounds,
		Elements:    elements,
		Valid:       true,
	}
}

func arrayAssign(value SqlArray, subscripts []SqlInteger, element SqlArrayElement) SqlArray {
	for _, subscript := range subscripts {
		if subscript.Error != "" {
			return SqlArray{Error: subscript.Error}
		}
		if !subscript.Valid {
			return SqlArray{Error: "22004"}
		}
	}
	if value.Error != "" {
		return value
	}
	if !value.Valid || len(value.Dimensions) == 0 {
		dimensions, lowerBounds := make([]int64, len(subscripts)), make([]int64, len(subscripts))
		for index, subscript := range subscripts {
			dimensions[index] = 1
			lowerBounds[index] = subscript.Value
		}
		return SqlArray{
			ElementType: element.Type,
			Dimensions:  dimensions,
			LowerBounds: lowerBounds,
			Elements:    []SqlArrayElement{element},
			Valid:       true,
		}
	}
	if len(subscripts) != len(value.Dimensions) {
		return SqlArray{Error: "2202E"}
	}
	if len(value.Dimensions) == 1 {
		oldLower := value.LowerBounds[0]
		oldUpper := oldLower + value.Dimensions[0] - 1
		lower := min(oldLower, subscripts[0].Value)
		upper := max(oldUpper, subscripts[0].Value)
		elements := make([]SqlArrayElement, upper-lower+1)
		for index := range elements {
			elements[index] = SqlArrayElement{Type: value.ElementType}
		}
		copy(elements[oldLower-lower:], value.Elements)
		elements[subscripts[0].Value-lower] = element
		value.Dimensions = []int64{int64(len(elements))}
		value.LowerBounds = []int64{lower}
		value.Elements = elements
		return value
	}
	offset := int64(0)
	for index, subscript := range subscripts {
		position := subscript.Value - value.LowerBounds[index]
		if position < 0 || position >= value.Dimensions[index] {
			return SqlArray{Error: "2202E"}
		}
		offset = offset*value.Dimensions[index] + position
	}
	value.Elements = append([]SqlArrayElement{}, value.Elements...)
	value.Elements[offset] = element
	return value
}

func sqlIsNullArray(value SqlArray) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullArray(value SqlArray) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseArray(otherwise func() SqlArray, conditions []func() SqlBoolean, branches []func() SqlArray) SqlArray {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlArray{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceArray(operands ...func() SqlArray) SqlArray {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlArray{}
}
