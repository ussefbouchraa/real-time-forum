package auth

import (
	"net/http"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement login logic
	w.Write([]byte("Login Page"))
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement register logic
	w.Write([]byte("Register Page"))
}
