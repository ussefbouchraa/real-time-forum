package posts

import (
	"encoding/json"
	"log"
	"net/http"

	"real-time-forum/modules/core"
)

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
	switch r.Method {
	case http.MethodPost:
		var newPost struct {
			Content    string   `json:"content"`
			Categories []string `json:"categories"`
		}
		if err := json.NewDecoder(r.Body).Decode(&newPost); err != nil {
			log.Printf("Invalid JSON: %v", err)
			http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
			return
		}

		// Validate content
		if newPost.Content == "" {
			log.Printf("Empty content")
			http.Error(w, `{"error": "Post content cannot be empty"}`, http.StatusBadRequest)
			return
		}
		log.Printf("Received content: %s, categories: %v", newPost.Content, newPost.Categories)

		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "content": newPost.Content})

	case http.MethodGet:
		// categories := r.URL.Query().Get("categories")
		// onlyMyPosts := r.URL.Query().Get("myPosts") == "true"
		// onlyMyLikedPosts := r.URL.Query().Get("likedPosts") == "true"
		// searchTerm := r.URL.Query().Get("search")
		query := `
            SELECT p.post_id, p.user_id, p.content, p.created_at, u.nickname,
			COALESCE(SUM(CASE WHEN r.reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
			COALESCE(SUM(CASE WHEN r.reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
			FROM posts p
			JOIN users u ON p.user_id = u.user_id
			LEFT JOIN reactions r ON p.post_id = r.post_id
			GROUP BY p.post_id, p.user_id, p.content, p.created_at, u.nickname
			ORDER BY p.created_at DESC
			LIMIT 20 OFFSET 0;
        `
		_ = query
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

// CommentHandler handles the creation and retrieval of comments
func CommentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Comment handler implementation will go here
}
