package main

import (
	"context"
	"fmt"
	"net/http"

	"google.golang.org/api/idtoken"
)

func main() {
	http.HandleFunc("/", getRoot)
	http.HandleFunc("/login", login)

	addr := "localhost:8080"
	fmt.Printf("Server listening on http://%v", addr)
	http.ListenAndServe(addr, nil)
}

func getRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Get Root")
	http.ServeFile(w, r, "client/index.html")
}

func login(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Login")
	fmt.Println("Url: " + r.RequestURI)

	fmt.Println("Headers: ")
	for key, value := range r.Header {
		fmt.Printf("%v : %v\n", key, value)
	}

	fmt.Println("\nForm Values: ")
	r.ParseForm()
	for key, value := range r.Form {
		fmt.Printf("%v : %v\n", key, value)
	}
	idToken := r.Form.Get("credential")
	fmt.Printf("Id Token: %s\n", idToken)
	payload, err := idtoken.Validate(context.Background(), idToken, "")
	if err != nil {
		fmt.Println("Failed to validate idToken,", err)
	} else {
		fmt.Println("Validate Succeed. Payload:", payload)
	}
}
