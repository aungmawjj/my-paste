package main

import (
	"html/template"
	"os"

	_ "embed"
)

//go:embed login_template.html
var loginTemplate string

type LoginTemplateData struct {
	GoogleClientId   string
	LoginCallbackUri string
}

func main() {

	data := LoginTemplateData{
		GoogleClientId:   "605091559450-3jl3h3ev302tgbd5c1eaqi1hel28squt.apps.googleusercontent.com",
		LoginCallbackUri: "/login-callback",
	}

	tmpl := template.Must(template.New("hello").Parse(loginTemplate))
	tmpl.Execute(os.Stderr, data)

}
