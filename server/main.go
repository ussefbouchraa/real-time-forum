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

// mainHandler: Serves the root "/" route - delivers the SPA entry point (index.html)
// Enforces GET method, sets security headers, and renders the main template
func mainHandler(w http.ResponseWriter, r *http.Request) {
	// Set CSP to restrict resource loading to trusted sources only
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://robohash.org;")

	// Prevent MIME type sniffing attacks
	w.Header().Set("X-Content-Type-Options", "nosniff")

	// Disable caching to ensure fresh content on each load
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	// Reject non-GET requests early
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Render the main HTML template; return 500 on failure
	if templates.Exec(w, "index.html", nil) != nil {
		http.Error(w, "Could not execute template", 500)
		fmt.Println("Error executing template.")
		return
	}
}

// StartSessionCleanup: Launches a background goroutine that deletes expired sessions
// Runs every 15 minutes using the indexed 'expires_at' column for efficiency
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

	// Load config and open SQLite database connection
	core.InitDB(core.LoadConfig().DatabasePath)

	// Initialize and register post/comment services with the shared DB
	postService := posts.NewPostService(core.Db)
	posts.SetPostService(postService)
	commentService := posts.NewCommentService(core.Db)
	posts.SetCommentService(commentService)

	// Serve static assets (CSS, JS) from the web directory
	http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./web/css/"))))
	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./web/js/"))))

	// API endpoints
	http.HandleFunc("/ws", auth.WebSocketHandler)            // WebSocket for real-time chat
	http.HandleFunc("/api/posts", posts.PostsHandler)        // Some of the CRUD operations for posts
	http.HandleFunc("/api/comments", posts.CommentHandler)   // Comment management
	http.HandleFunc("/api/reactions", posts.ReactionHandler) // Like/dislike reactions
	http.HandleFunc("/", mainHandler)                        // SPA root entry

	// Start periodic cleanup of expired sessions
	StartSessionCleanup()

	fmt.Println("Server started at http://localhost:8080/#home")

	// Start HTTP server on port 8080; fatal on failure
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
