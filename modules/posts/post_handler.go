package posts

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

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
			http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
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
				if errors.Is(err, sql.ErrNoRows) {
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode(map[string]string{"error": "✅No posts to show"})
					return
				}
				http.Error(w, `Failed to fetch posts`, http.StatusInternalServerError)
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
		} else if r.Header.Get("request-type") == "filter_posts" {
			// Extract filters from query params
			categoriesStr := r.URL.Query().Get("categories")
			var categories []string
			if categoriesStr != "" {
				categories = strings.Split(categoriesStr, ",")
			}
			onlyMyPosts := r.URL.Query().Get("myPosts") == "true"
			onlyMyLikedPosts := r.URL.Query().Get("likedPosts") == "true"
			PostId := ""
			if r.Header.Get("Last-Post-ID") != "" {
				PostId = r.Header.Get("Last-Post-ID")
			} else {
				_ = PostId
			}

			// Use the authenticated userID from session check (already done at top)
			posts, err := postService.GetFilteredPosts(userID, categories, onlyMyPosts, onlyMyLikedPosts, PostId)
			if err != nil {
				log.Printf("❌ Filter posts error: %v", err)
				http.Error(w, `Failed to fetch filtered posts`, http.StatusInternalServerError)
				return
			}
			if len(posts) == 0 {
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(map[string]string{"error": "✅No posts to show"})
				return
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "ok",
				"posts":  posts,
			})
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
				http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
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

// In modules/posts/post_handler.go
func ReactionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.Header.Get("Session-ID")
	if sessionID == "" {
		http.Error(w, `{"error": "Session required"}`, http.StatusUnauthorized)
		return
	}
	var userID string
	err := core.Db.QueryRow("SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP", sessionID).Scan(&userID)
	if err != nil {
		log.Printf("Session error for session_id %s: %v", sessionID, err)
		http.Error(w, `{"error": "Invalid session"}`, http.StatusUnauthorized)
		return
	}

	var reaction NewReaction
	if err := json.NewDecoder(r.Body).Decode(&reaction); err != nil {
		log.Printf("Invalid JSON: %v", err)
		http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if reaction.PostID == "" && reaction.CommentID == "" {
		http.Error(w, `{"error": "post_id or comment_id required"}`, http.StatusBadRequest)
		return
	}
	if reaction.PostID != "" && reaction.CommentID != "" {
		http.Error(w, `{"error": "cannot provide both post_id and comment_id"}`, http.StatusBadRequest)
		return
	}

	var updatedCounts struct {
		LikeCount    int `json:"like_count"`
		DislikeCount int `json:"dislike_count"`
	}

	if reaction.PostID != "" {
		err = postService.AddOrUpdatePostReaction(userID, reaction.PostID, reaction.ReactionType)
		if err != nil {
			log.Printf("Post reaction error: %v", err)
			http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		// Fetch updated counts
		err = postService.db.QueryRow(`
            SELECT COALESCE(SUM(CASE WHEN reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
                   COALESCE(SUM(CASE WHEN reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
            FROM posts_reactions WHERE post_id = ?`, reaction.PostID).Scan(&updatedCounts.LikeCount, &updatedCounts.DislikeCount)
		if err != nil {
			log.Printf("Failed to fetch post reaction counts: %v", err)
			http.Error(w, `{"error": "Failed to fetch reaction counts"}`, http.StatusInternalServerError)
			return
		}
	} else {
		err = postService.AddOrUpdateCommentReaction(userID, reaction.CommentID, reaction.ReactionType)
		if err != nil {
			log.Printf("Comment reaction error: %v", err)
			http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusBadRequest)
			return
		}
		// Fetch updated counts
		err = postService.db.QueryRow(`
            SELECT COALESCE(SUM(CASE WHEN reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
                   COALESCE(SUM(CASE WHEN reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
            FROM comments_reactions WHERE comment_id = ?`, reaction.CommentID).Scan(&updatedCounts.LikeCount, &updatedCounts.DislikeCount)
		if err != nil {
			log.Printf("Failed to fetch comment reaction counts: %v", err)
			http.Error(w, `{"error": "Failed to fetch reaction counts"}`, http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "ok",
		"like_count":    updatedCounts.LikeCount,
		"dislike_count": updatedCounts.DislikeCount,
	})
}
