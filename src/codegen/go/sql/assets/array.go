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
	Value any
	Valid bool
	Error string
}

func arrayElementInput(value any) SqlArrayElement {
	switch typed := value.(type) {
	case SqlInteger:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlFloat:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlDecimal:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlBoolean:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlText:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlUuid:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	case SqlEnum:
		return SqlArrayElement{Value: typed, Valid: typed.Valid, Error: typed.Error}
	default:
		return SqlArrayElement{Error: "XX000"}
	}
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
