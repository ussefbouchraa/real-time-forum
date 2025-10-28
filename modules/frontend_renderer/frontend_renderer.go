package frontend_renderer

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"log"
)

// tmpl holds the parsed SPA template (index.html) - global for reuse
var tmpl *template.Template

// Init parses the main HTML template at server startup
// Fatal on error - ensures server doesn't start with broken UI
func Init() {
	var err error
	tmpl, err = template.ParseFiles("./web/index.html")
	if err != nil {
		log.Fatal("Failed to parse the spa template:", err)
	}
}

// Exec renders a named template into the response writer
// Uses buffer to catch errors before writing to client
func Exec(wr io.Writer, name string, data any) error {
	var buffer bytes.Buffer

	// Execute template into buffer first - avoids partial writes
	err := tmpl.ExecuteTemplate(&buffer, name, data)
	if err != nil {
		fmt.Println(err)
		return err
	}

	// Stream complete result to client
	buffer.WriteTo(wr)
	return nil
}
