package generated

import "testing"

func TestSignedCalendarArithmetic(t *testing.T) {
	cases := []struct {
		name                  string
		operation             func(int, int) int
		left, right, expected int
	}{
		{"minimum product", CheckedSignedMultiply, MinSharedI32, 1, MinSharedI32},
		{"maximum product", CheckedSignedMultiply, MaxSharedIndex, 1, MaxSharedIndex},
		{"negative product", CheckedSignedMultiply, -7, -3, 21},
		{"zero product", CheckedSignedMultiply, -7, 0, 0},
		{"negative quotient", CheckedSignedDivide, -7, 3, -2},
		{"negative divisor", CheckedSignedDivide, 7, -3, -2},
		{"zero quotient", CheckedSignedDivide, -1, 3, 0},
		{"minimum quotient", CheckedSignedDivide, MinSharedI32, 1, MinSharedI32},
		{"negative remainder", CheckedSignedRemainder, -7, 3, -1},
		{"negative remainder divisor", CheckedSignedRemainder, 7, -3, 1},
		{"zero remainder", CheckedSignedRemainder, -6, 3, 0},
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
		{"product overflow", CheckedSignedMultiply, MaxSharedIndex, 2},
		{"minimum product overflow", CheckedSignedMultiply, MinSharedI32, -1},
		{"quotient overflow", CheckedSignedDivide, MinSharedI32, -1},
		{"remainder overflow", CheckedSignedRemainder, MinSharedI32, -1},
		{"zero divisor", CheckedSignedDivide, 1, 0},
		{"zero remainder divisor", CheckedSignedRemainder, 1, 0},
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
		{"maximum addition", CheckedI64Add, MaxSharedI64, 0, MaxSharedI64},
		{"minimum addition", CheckedI64Add, MinSharedI64, MaxSharedI64, -1},
		{"minimum subtraction", CheckedI64Subtract, MinSharedI64, MinSharedI64, 0},
		{"exact subtraction", CheckedI64Subtract, 9007199254740993, 9007199254740992, 1},
		{"minimum multiplication", CheckedI64Multiply, MinSharedI64, 1, MinSharedI64},
		{"maximum multiplication", CheckedI64Multiply, MaxSharedI64, 1, MaxSharedI64},
		{"negative multiplication", CheckedI64Multiply, -7, -3, 21},
		{"zero multiplication", CheckedI64Multiply, MinSharedI64, 0, 0},
		{"exact division", CheckedI64Divide, 9007199254740993, 3, 3002399751580331},
		{"negative quotient", CheckedI64Divide, -7, 3, -2},
		{"negative divisor", CheckedI64Divide, 7, -3, -2},
		{"zero quotient", CheckedI64Divide, -1, 3, 0},
		{"minimum quotient", CheckedI64Divide, MinSharedI64, 1, MinSharedI64},
		{"negative remainder", CheckedI64Remainder, -7, 3, -1},
		{"negative divisor remainder", CheckedI64Remainder, 7, -3, 1},
		{"minimum remainder", CheckedI64Remainder, MinSharedI64, 3, -2},
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
		{"addition overflow", CheckedI64Add, MaxSharedI64, 1},
		{"addition underflow", CheckedI64Add, MinSharedI64, -1},
		{"subtraction underflow", CheckedI64Subtract, MinSharedI64, 1},
		{"subtraction overflow", CheckedI64Subtract, MaxSharedI64, -1},
		{"minimum product", CheckedI64Multiply, MinSharedI64, -1},
		{"minimum multiplier", CheckedI64Multiply, -1, MinSharedI64},
		{"product overflow", CheckedI64Multiply, MaxSharedI64, 2},
		{"large product", CheckedI64Multiply, MinSharedI64, MinSharedI64},
		{"division overflow", CheckedI64Divide, MinSharedI64, -1},
		{"remainder overflow", CheckedI64Remainder, MinSharedI64, -1},
		{"zero divisor", CheckedI64Divide, 1, 0},
		{"zero remainder divisor", CheckedI64Remainder, 1, 0},
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
