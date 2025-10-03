package posts

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"real-time-forum/modules/core"
)

var postService *PostService

// SetPostService sets the service instance (called from main.go)
func SetPostService(service *PostService) {
	postService = service
}

func PostsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	sessionID := r.Header.Get("Session-ID")
	if sessionID == "" {
		http.Error(w, "Session required", http.StatusUnauthorized)
		return
	}
	var userID string
	err := core.Db.QueryRow("SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP", sessionID).Scan(&userID)
	if err != nil {
		log.Printf("Session error for session_id %s: %v", sessionID, err)
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	log.Printf("✔️ Authenticated user_id: %s", userID)
	switch r.Method {
	case http.MethodPost:
		var newPost NewPost
		if err := json.NewDecoder(r.Body).Decode(&newPost); err != nil {
			log.Printf("❌ Invalid JSON: %v", err)
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		post, err := postService.CreatePost(userID, newPost)
		if err != nil {
			log.Printf("❌ Create post error: %v", err)
			http.Error(w, fmt.Sprintf(`"%s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"post":   post,
		})

	case http.MethodGet:
		if r.Header.Get("request-type") == "initial-fetch" {
			posts, err := postService.GetInitialPosts()
			if err != nil {
				log.Printf("❌ Fetch posts error: %v", err)
				http.Error(w, `Failed to fetch posts`, http.StatusInternalServerError)
				return
			}
			if len(posts) == 0 {
				log.Printf("No posts found")
				json.NewEncoder(w).Encode(map[string]string{"error": "No posts found"})
				w.WriteHeader(http.StatusOK)
				return
			}
			log.Printf("✔️ Fetched %d posts", len(posts))
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "ok",
				"posts":  posts,
			})
		} else {
			// TODO: Handle other GET cases (filtering by categories)
			http.Error(w, "Not implemented", http.StatusNotImplemented)
		}
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// CommentHandler handles the creation and retrieval of comments
func CommentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Comment handler implementation will go here
}
