package main

import (
	transpiler "pgsid-check-transpiler"
	"unsafe"
)

var input, output []byte

//go:wasmexport alloc
func alloc(size uint32) uint32 {
	if size == 0 {
		input = nil
		return 0
	}
	input = make([]byte, size)
	return uint32(uintptr(unsafe.Pointer(&input[0])))
}

//go:wasmexport transpile
func transpile() uint32 {
	var err error
	output, err = transpiler.Transpile(input)
	if err != nil {
		output = []byte(err.Error())
		return 1
	}
	return 0
}

//go:wasmexport transpile_configured
func transpileConfigured() uint32 {
	var err error
	output, err = transpiler.TranspileConfigured(input)
	if err != nil {
		output = []byte(err.Error())
		return 1
	}
	return 0
}

//go:wasmexport output_ptr
func outputPtr() uint32 {
	if len(output) == 0 {
		return 0
	}
	return uint32(uintptr(unsafe.Pointer(&output[0])))
}

//go:wasmexport output_len
func outputLen() uint32 {
	return uint32(len(output))
}

//go:wasmexport dispose
func dispose() {
	input = nil
	output = nil
}

func main() {}
