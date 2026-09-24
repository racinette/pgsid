package main

import (
	"fmt"
	"os"

	transpiler "pgsid-regex-transpiler-spike"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: transpile AST_JSON OUTPUT_GO")
		os.Exit(1)
	}
	input, err := os.ReadFile(os.Args[1])
	if err == nil {
		var output []byte
		output, err = transpiler.Transpile(input)
		if err == nil {
			err = os.WriteFile(os.Args[2], output, 0o644)
		}
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
