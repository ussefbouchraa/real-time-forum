package main

import (
	"fmt"
	"log"
	"net/http"

	"real-time-forum/modules/auth"
	"real-time-forum/modules/chat"
	"real-time-forum/modules/core"
	"real-time-forum/modules/posts"
	"real-time-forum/modules/templates"
)

func mainHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.Error(w, "Page not found", http.StatusNotFound)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if templates.Exec(w, "index.html", nil) != nil {
		http.Error(w, "Could not execute template", 500)
		fmt.Println("Error executing template.")
		return
	}
}

func main() {
	templates.Init()

	core.InitDB(core.LoadConfig().DatabasePath)

	// serve static files
	fs := http.FileServer(http.Dir("./web/assets"))
	http.Handle("/assets/", http.StripPrefix("/assets/", fs))

	// API routes
	http.HandleFunc("/", mainHandler)
	http.HandleFunc("/ws", auth.WebSocketHandler)
	http.HandleFunc("/posts", posts.PostsHandler)
	http.HandleFunc("/ws/chat", chat.ChatWebSocketHandler)

	fmt.Println("Server started at http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
