package posts

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"real-time-forum/modules/core"
)

var (
	postService    *PostService
	commentService *CommentService
)

// SetPostService sets the service instance (called from main.go)
func SetPostService(service *PostService) {
	postService = service
}

func SetCommentService(service *CommentService) {
	commentService = service
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
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodPost:
		var newPost *NewPost
		if err := json.NewDecoder(r.Body).Decode(&newPost); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		post, err := postService.CreatePost(userID, newPost)
		if err != nil {
			http.Error(w, fmt.Sprintf(`"%s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"post":   post,
		})

	case http.MethodGet:
		if r.Header.Get("request-type") == "fetch-3-posts" {
			LastPostId := ""
			if r.Header.Get("Last-Post-ID") != "" {
				LastPostId = r.Header.Get("Last-Post-ID")
			} else {
				_ = LastPostId
			}
			posts, err := postService.GetPosts(LastPostId)
			if err != nil {
				http.Error(w, `Failed to fetch posts`, http.StatusInternalServerError)
				return
			}
			if len(posts) == 0 {
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(map[string]string{"error": "No posts found"})
				return
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "ok",
				"posts":  posts,
			})
		} else if r.Header.Get("request-type") == "fetch-3-comments" {
			LastCommentId := ""
			if r.Header.Get("Last-Comment-ID") != "" {
				LastCommentId = r.Header.Get("Last-Comment-ID")
			} else {
				_ = LastCommentId
				http.Error(w, `Failed to fetch comments`, http.StatusNotAcceptable)
			}
			PostId := ""
			if r.Header.Get("Post-ID") != "" {
				PostId = r.Header.Get("Post-ID")
			} else {
				_ = PostId
			}
			comments, err := postService.GetComments(PostId, LastCommentId, 3)
			if err != nil {
				http.Error(w, `{"error": "Failed to fetch comments"}`, http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":   "ok",
				"comments": comments,
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
		if r.Header.Get("request-type") == "create_comment" {
			var newComment *NewComment
			if err := json.NewDecoder(r.Body).Decode(&newComment); err != nil {
				log.Printf("❌ Invalid JSON: %v", err)
				http.Error(w, "Invalid JSON", http.StatusBadRequest)
				return
			}
			comment, err := commentService.CreateComment(userID, newComment.PostID, newComment.Content)
			if err != nil {
				log.Printf("❌ Create comment error: %v", err)
				http.Error(w, fmt.Sprintf(`"%s"}`, err.Error()), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":  "ok",
				"comment": comment,
			})
		}
	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}
