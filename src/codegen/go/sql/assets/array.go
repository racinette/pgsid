package pgsidsql

type SqlArray struct {
	ElementType string
	Dimensions  []int64
	LowerBounds []int64
	Elements    []SqlInteger
	Valid       bool
	Error       string
}

func arrayInput(elementType string, dimensions, lowerBounds []int64, elements []SqlInteger) SqlArray {
	for _, element := range elements {
		if element.Error != "" {
			return SqlArray{Error: element.Error}
		}
	}
	return SqlArray{
		ElementType: elementType,
		Dimensions:  append([]int64{}, dimensions...),
		LowerBounds: append([]int64{}, lowerBounds...),
		Elements:    append([]SqlInteger{}, elements...),
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
					output.WriteString(strconv.FormatInt(element.Value, 10))
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
		if a.Value < b.Value {
			return SqlInteger{Value: -1, Valid: true}
		}
		if a.Value > b.Value {
			return SqlInteger{Value: 1, Valid: true}
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
		if element.Valid != other.Valid || (element.Valid && element.Value != other.Value) {
			return SqlBoolean{Value: false, Valid: true}
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
			if element.Valid && element.Value == candidate.Value {
				found = true
				break
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
			if element.Valid && element.Value == candidate.Value {
				return SqlBoolean{Value: true, Valid: true}
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
	elements := append([]SqlInteger{}, left.Elements...)
	elements = append(elements, right.Elements...)
	return SqlArray{
		ElementType: left.ElementType,
		Dimensions:  dimensions,
		LowerBounds: lowerBounds,
		Elements:    elements,
		Valid:       true,
	}
}

func arraySubscript(value SqlArray, subscripts ...SqlInteger) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid || len(subscripts) != len(value.Dimensions) {
		return SqlInteger{}
	}
	offset := int64(0)
	for index, subscript := range subscripts {
		if subscript.Error != "" {
			return SqlInteger{Error: subscript.Error}
		}
		if !subscript.Valid {
			return SqlInteger{}
		}
		position := subscript.Value - value.LowerBounds[index]
		if position < 0 || position >= value.Dimensions[index] {
			return SqlInteger{}
		}
		offset = offset*value.Dimensions[index] + position
	}
	return value.Elements[offset]
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
