package main

import (
	"encoding/json"
	"os"
	"strconv"
	"time"

	"github.com/shopspring/decimal"
)

type observation struct {
	Kind    string  `json:"kind"`
	Value   string  `json:"value,omitempty"`
	Message string  `json:"message,omitempty"`
	Elapsed float64 `json:"elapsedMs"`
}

func evaluate() observation {
	operation, left, right, mode := os.Args[1], os.Args[2], os.Args[3], os.Args[4]
	scale, err := strconv.Atoi(os.Args[5])
	if err != nil {
		panic(err)
	}
	guard, err := strconv.Atoi(os.Args[6])
	if err != nil {
		panic(err)
	}
	a, err := decimal.NewFromString(left)
	if err != nil {
		return observation{Kind: "library-error", Message: err.Error()}
	}
	b, err := decimal.NewFromString(right)
	if err != nil {
		return observation{Kind: "library-error", Message: err.Error()}
	}
	precision := int32(scale + guard)
	if mode == "native" {
		precision = 16
	}
	var result decimal.Decimal
	switch operation {
	case "power":
		if mode == "native" {
			result = a.Pow(b)
		} else {
			result, err = a.PowWithPrecision(b, precision)
		}
	case "sqrt":
		if mode == "native" {
			result = a.Pow(decimal.New(5, -1))
		} else {
			result, err = a.PowWithPrecision(decimal.New(5, -1), precision)
		}
	case "exp":
		result, err = a.ExpTaylor(precision)
	case "ln":
		result, err = a.Ln(precision)
	case "log10", "log":
		base := decimal.NewFromInt(10)
		if operation == "log" {
			base = b
		}
		var numerator, denominator decimal.Decimal
		numerator, err = a.Ln(precision)
		if err != nil {
			break
		}
		denominator, err = base.Ln(precision)
		if err != nil {
			break
		}
		if denominator.IsZero() {
			return observation{Kind: "library-error", Message: "logarithm base rounds to one at working precision"}
		}
		result = numerator.DivRound(denominator, precision)
	default:
		panic("unknown operation")
	}
	if err != nil {
		return observation{Kind: "library-error", Message: err.Error()}
	}
	text := result.String()
	if mode != "native" {
		text = result.Round(int32(scale)).StringFixed(int32(scale))
	}
	return observation{Kind: "value", Value: text}
}

func main() {
	start := time.Now()
	result := func() (result observation) {
		defer func() {
			if recover() != nil {
				result = observation{Kind: "library-error", Message: "library panic"}
			}
		}()
		return evaluate()
	}()
	result.Elapsed = float64(time.Since(start).Microseconds()) / 1000
	output, err := os.Create(os.Args[7])
	if err != nil {
		panic(err)
	}
	defer output.Close()
	if err := json.NewEncoder(output).Encode(result); err != nil {
		panic(err)
	}
}
