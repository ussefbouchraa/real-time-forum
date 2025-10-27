package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"real-time-forum/modules/auth"
	"real-time-forum/modules/core"
	"real-time-forum/modules/posts"
	"real-time-forum/modules/templates"
)

func mainHandler(w http.ResponseWriter, r *http.Request) {
	// Set security headers
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://robohash.org;")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// Set cachign policy
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

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

func StartSessionCleanup() {
	go func() {
		for {
			time.Sleep(15 * time.Minute)
			core.Db.Exec("DELETE FROM sessions WHERE expires_at < ?", time.Now())
		}
	}()
}

func main() {
	templates.Init()

	core.InitDB(core.LoadConfig().DatabasePath)
	// initialize post services
	postService := posts.NewPostService(core.Db)
	posts.SetPostService(postService)
	commentService := posts.NewCommentService(core.Db)
	posts.SetCommentService(commentService)
	
	// serve static files
	http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./web/css/"))))
	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./web/js/"))))
	
	// API routes
	http.HandleFunc("/ws", auth.WebSocketHandler)
	http.HandleFunc("/api/posts", posts.PostsHandler)
	http.HandleFunc("/api/comments", posts.CommentHandler)
	http.HandleFunc("/api/reactions", posts.ReactionHandler)
	http.HandleFunc("/", mainHandler)

	// Start a background goroutine that periodically cleans up expired sessions
	// using the indexed 'expires_at' column to keep the database search performant
	StartSessionCleanup()

	fmt.Println("Server started at http://localhost:8080/#home")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
