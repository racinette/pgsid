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

func TestTimestampArithmetic(t *testing.T) {
	cases := []struct {
		name                  string
		operation             func(int64, int64) int64
		left, right, expected int64
	}{
		{"maximum addition", checkedI64Add, maxSharedI64, 0, maxSharedI64},
		{"minimum addition", checkedI64Add, minSharedI64, maxSharedI64, -1},
		{"minimum subtraction", checkedI64Subtract, minSharedI64, minSharedI64, 0},
		{"exact subtraction", checkedI64Subtract, 9007199254740993, 9007199254740992, 1},
		{"minimum multiplication", checkedI64Multiply, minSharedI64, 1, minSharedI64},
		{"maximum multiplication", checkedI64Multiply, maxSharedI64, 1, maxSharedI64},
		{"negative multiplication", checkedI64Multiply, -7, -3, 21},
		{"zero multiplication", checkedI64Multiply, minSharedI64, 0, 0},
		{"exact division", checkedI64Divide, 9007199254740993, 3, 3002399751580331},
		{"negative quotient", checkedI64Divide, -7, 3, -2},
		{"negative divisor", checkedI64Divide, 7, -3, -2},
		{"zero quotient", checkedI64Divide, -1, 3, 0},
		{"minimum quotient", checkedI64Divide, minSharedI64, 1, minSharedI64},
		{"negative remainder", checkedI64Remainder, -7, 3, -1},
		{"negative divisor remainder", checkedI64Remainder, 7, -3, 1},
		{"minimum remainder", checkedI64Remainder, minSharedI64, 3, -2},
	}
	for _, item := range cases {
		t.Run(item.name, func(t *testing.T) {
			if actual := item.operation(item.left, item.right); actual != item.expected {
				t.Fatalf("got %d, expected %d", actual, item.expected)
			}
		})
	}
}

func TestTimestampArithmeticRejectsOverflow(t *testing.T) {
	cases := []struct {
		name        string
		operation   func(int64, int64) int64
		left, right int64
	}{
		{"addition overflow", checkedI64Add, maxSharedI64, 1},
		{"addition underflow", checkedI64Add, minSharedI64, -1},
		{"subtraction underflow", checkedI64Subtract, minSharedI64, 1},
		{"subtraction overflow", checkedI64Subtract, maxSharedI64, -1},
		{"minimum product", checkedI64Multiply, minSharedI64, -1},
		{"minimum multiplier", checkedI64Multiply, -1, minSharedI64},
		{"product overflow", checkedI64Multiply, maxSharedI64, 2},
		{"large product", checkedI64Multiply, minSharedI64, minSharedI64},
		{"division overflow", checkedI64Divide, minSharedI64, -1},
		{"remainder overflow", checkedI64Remainder, minSharedI64, -1},
		{"zero divisor", checkedI64Divide, 1, 0},
		{"zero remainder divisor", checkedI64Remainder, 1, 0},
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
