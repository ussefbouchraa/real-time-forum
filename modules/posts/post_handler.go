package posts

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"real-time-forum/modules/core"

	"github.com/google/uuid"
)

func PostsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	sessionID := r.Header.Get("Session-ID")
	fmt.Println("sessionID:", sessionID)
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
			log.Printf("❌Invalid JSON: %v", err)
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Validate content
		err := validateNewPost(newPost)
		if err != nil {
			log.Printf("❌%v", err.Error())
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		log.Printf("✔️ Received content: %s, categories: %v", newPost.Content, newPost.Categories)

		// Start transaction
		tx, err := core.Db.Begin()
		if err != nil {
			log.Printf("Transaction error: %v", err)
			http.Error(w, `{"error": "Database error"}`, http.StatusInternalServerError)
			return
		}

		// Generate post ID
		postID := uuid.New().String()
		log.Printf("Generated post_id: %s", postID)

		// Insert post
		_, err = tx.Exec("INSERT INTO posts (post_id, user_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
			postID, userID, newPost.Content)
		if err != nil {
			tx.Rollback()
			log.Printf("Insert post error: %v", err)
			http.Error(w, `{"error": "Failed to create post"}`, http.StatusInternalServerError)
			return
		}

		log.Printf("✔️ Post created with post_id: %s", postID)

		// Validate and insert categories
		for _, categoryName := range newPost.Categories {
			var categoryID string
			err = tx.QueryRow("SELECT category_id FROM categories WHERE category_name = ?", categoryName).Scan(&categoryID)
			if err != nil {
				tx.Rollback()
				log.Printf("Invalid category %s: %v", categoryName, err)
				http.Error(w, `{"error": "Invalid category: `+categoryName+`"}`, http.StatusBadRequest)
				return
			}
			log.Printf("Found category_id %s for %s", categoryID, categoryName)

			_, err = tx.Exec("INSERT INTO posts_categories (post_id, category_id) VALUES (?, ?)", postID, categoryID)
			if err != nil {
				tx.Rollback()
				log.Printf("Insert posts_categories error: %v", err)
				http.Error(w, `{"error": "Failed to add categories"}`, http.StatusInternalServerError)
				return
			}
		}
		var nickname string
		err = tx.QueryRow("SELECT nickname FROM users WHERE user_id = ?", userID).Scan(&nickname)
		if err != nil {
			tx.Rollback()
			log.Printf("Fetch nickname error: %v", err)
			http.Error(w, `{"error": "Failed to fetch user info"}`, http.StatusInternalServerError)
			return
		}
		log.Printf("✔️ Categories linked to post_id: %s", postID)

		// Commit transaction
		if err := tx.Commit(); err != nil {
			log.Printf("Commit error: %v", err)
			http.Error(w, `{"error": "Failed to commit transaction"}`, http.StatusInternalServerError)
			return
		}
		log.Printf("✔️ Transaction committed for post_id: %s", postID)

		post := Post{
			PostID:       postID,
			Content:      newPost.Content,
			CreatedAt:    time.Now(),
			Author:       Author{Nickname: nickname},
			Categories:   newPost.Categories,
			LikeCount:    0,
			DislikeCount: 0,
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"post":   post,
		})

	case http.MethodGet:
		if r.Header.Get("request-type") == "initial-fetch" {
			// Query 3 newest posts
			query := `
            SELECT p.post_id, p.user_id, p.content, p.created_at, u.nickname,
                   COALESCE(SUM(CASE WHEN pr.reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
                   COALESCE(SUM(CASE WHEN pr.reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
            FROM posts p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN posts_reactions pr ON p.post_id = pr.post_id
            GROUP BY p.post_id, p.user_id, p.content, p.created_at, u.nickname
            ORDER BY p.created_at DESC
            LIMIT 3`

			rows, err := core.Db.Query(query)
			if err != nil {
				log.Printf("Query error: %v", err)
				http.Error(w, `{"error": "Failed to fetch posts"}`, http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			// Step 5: Process posts
			var posts []Post
			for rows.Next() {
				var p Post
				err := rows.Scan(&p.PostID, &p.UserID, &p.Content, &p.CreatedAt, &p.Author.Nickname, &p.LikeCount, &p.DislikeCount)
				if err != nil {
					log.Printf("Scan error: %v", err)
					http.Error(w, `{"error": "Failed to scan posts"}`, http.StatusInternalServerError)
					return
				}
				// Step 6: Fetch categories
				catRows, err := core.Db.Query(`
                SELECT c.category_name
                FROM posts_categories pc
                JOIN categories c ON pc.category_id = c.category_id
                WHERE pc.post_id = ?`, p.PostID)
				if err != nil {
					log.Printf("Category query error for post_id %s: %v", p.PostID, err)
					http.Error(w, `{"error": "Failed to fetch categories"}`, http.StatusInternalServerError)
					return
				}
				p.Categories = []string{}
				for catRows.Next() {
					var categoryName string
					if err := catRows.Scan(&categoryName); err != nil {
						catRows.Close()
						log.Printf("Category scan error for post_id %s: %v", p.PostID, err)
						http.Error(w, `{"error": "Failed to scan categories"}`, http.StatusInternalServerError)
						return
					}
					p.Categories = append(p.Categories, categoryName)
				}
				catRows.Close()

				p.Comments = []Comment{}
				p.Reactions = []PostReaction{}
				posts = append(posts, p)
			}
			if err := rows.Err(); err != nil {
				log.Printf("Rows error: %v", err)
				http.Error(w, `{"error": "Failed to process posts"}`, http.StatusInternalServerError)
				return
			}

			// Step 7: Handle empty results
			if len(posts) == 0 {
				log.Printf("No posts found")
				json.NewEncoder(w).Encode(map[string]string{"error": "No posts found"})
				w.WriteHeader(http.StatusOK)
				return
			}

			log.Printf("✔️ Fetched %d posts", len(posts))
			// Step 8: Send response
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "ok",
				"posts":  posts,
			})
		} else {
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
		}
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
