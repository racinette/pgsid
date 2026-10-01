package generated

import "testing"

func TestSignedCalendarArithmetic(t *testing.T) {
	cases := []struct {
		name                  string
		operation             func(int, int) int
		left, right, expected int
	}{
		{"minimum product", checkedSignedMultiply, minSharedI32, 1, minSharedI32},
		{"maximum product", checkedSignedMultiply, maxSharedIndex, 1, maxSharedIndex},
		{"negative product", checkedSignedMultiply, -7, -3, 21},
		{"zero product", checkedSignedMultiply, -7, 0, 0},
		{"negative quotient", checkedSignedDivide, -7, 3, -2},
		{"negative divisor", checkedSignedDivide, 7, -3, -2},
		{"zero quotient", checkedSignedDivide, -1, 3, 0},
		{"minimum quotient", checkedSignedDivide, minSharedI32, 1, minSharedI32},
		{"negative remainder", checkedSignedRemainder, -7, 3, -1},
		{"negative remainder divisor", checkedSignedRemainder, 7, -3, 1},
		{"zero remainder", checkedSignedRemainder, -6, 3, 0},
	}
	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			if actual := item.operation(item.left, item.right); actual != item.expected {
				t.Fatalf("got %d, expected %d", actual, item.expected)
			}
		})
	}
}

func TestSignedCalendarArithmeticRejectsInvalidOperations(t *testing.T) {
	cases := []struct {
		name        string
		operation   func(int, int) int
		left, right int
	}{
		{"product overflow", checkedSignedMultiply, maxSharedIndex, 2},
		{"minimum product overflow", checkedSignedMultiply, minSharedI32, -1},
		{"quotient overflow", checkedSignedDivide, minSharedI32, -1},
		{"remainder overflow", checkedSignedRemainder, minSharedI32, -1},
		{"zero divisor", checkedSignedDivide, 1, 0},
		{"zero remainder divisor", checkedSignedRemainder, 1, 0},
	}
	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			defer func() {
				if recover() == nil {
					t.Fatal("expected panic")
				}
			}()
			item.operation(item.left, item.right)
		})
	}
}
