//go:build js && wasm
package main

import (
	"syscall/js"
	"github.com/conductor-oss/markitdown"
	"io"
	"strings"
)

func convertData(this js.Value, args []js.Value) any {
	if len(args) < 3 {
		return js.ValueOf(map[string]any{"error": "requires data, filename, mimetype"})
	}

	data := args[0]
	filename := args[1].String()
	mimeType := args[2].String()

	// Convert js Uint8Array to Go byte slice
	length := data.Get("length").Int()
	goBytes := make([]byte, length)
	js.CopyBytesToGo(goBytes, data)

	m := markitdown.New()
	info := markitdown.StreamInfo{
		Extension: getExtension(filename),
		MIMEType:  mimeType,
	}

	reader := strings.NewReader(string(goBytes))
	res, err := m.ConvertReader(reader, info)

	if err != nil {
		return js.ValueOf(map[string]any{"error": err.Error()})
	}

	return js.ValueOf(map[string]any{
		"markdown": res.Markdown,
		"error":    "",
	})
}

func getExtension(filename string) string {
	idx := strings.LastIndex(filename, ".")
	if idx >= 0 {
		return filename[idx:]
	}
	return ""
}

func main() {
	c := make(chan struct{})
	js.Global().Set("markitdownConvert", js.FuncOf(convertData))
	<-c
}
