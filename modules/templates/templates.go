package templates

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"log"
)

var tmpl *template.Template

func Init() {
	var err error
	tmpl, err = template.ParseFiles("./web/index.html")
	if err != nil {
		log.Fatal("Failed to parse the spa template:", err)
	}
}

func Exec(wr io.Writer, name string, data any) error {
	var buffer bytes.Buffer
	err := tmpl.ExecuteTemplate(&buffer, name, data)
	if err != nil {
		fmt.Println(err)
		return err
	}

	buffer.WriteTo(wr)
	return nil
}
