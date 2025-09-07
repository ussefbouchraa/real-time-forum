package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"real-time-forum/modules/auth"
	"real-time-forum/modules/posts"
	"real-time-forum/modules/chat"
	"real-time-forum/modules/core"

)


func mainHandler(w http.ResponseWriter, r *http.Request){
if r.URL.Path == "/" && r.Method == http.MethodGet {
	tmpl, err := template.ParseGlob("static/*.html")
	// tmpl, err := template.ParseFiles("static/index.html")
	if err != nil { http.Error(w, "Internal Server Error", http.StatusInternalServerError); return}
	tmpl.Execute(w, nil)
	
}else if strings.HasPrefix(r.URL.Path, "/static"){
	switch r.URL.Path{
		case "/static/style.css"  :
			http.StripPrefix("/static/",http.FileServer(http.Dir("static"))).ServeHTTP(w,r) 
		default :
			http.Error(w, "Forbiden Page", http.StatusForbidden)
	}
			
}else{	http.Error(w, "Page Not Found", http.StatusNotFound)}

}

func main(){
	args := os.Args[1: ]
	if len(args) != 0 { return }
	

	// Read DB path from config.
	// Open a connection to SQLite (or other DB).
	// Optionally run migrations to create tables if they don’t exist.
	
    // Load config + Init DB
    core.InitDB(core.LoadConfig().DatabasePath)



	http.HandleFunc("/", mainHandler)
	http.HandleFunc("/login", auth.LoginHandler)
	http.HandleFunc("/register", auth.RegisterHandler)
	http.HandleFunc("/posts", posts.PostsHandler)
	http.HandleFunc("/ws/chat", chat.ChatWebSocketHandler)


	fmt.Println("Server started at http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
	log.Fatal("ListenAndServe:", err)
	}


}