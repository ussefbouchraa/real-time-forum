package posts

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// PostService handles business logic for posts
type PostService struct {
	db *sql.DB // inject the DB
}

// NewPostService creates a new service instance
func NewPostService(db *sql.DB) *PostService {
	return &PostService{db: db}
}

// CreatePost creates a new post with categories
func (s *PostService) CreatePost(userID string, newPost NewPost) (*Post, error) {
	if err := validateNewPost(newPost); err != nil {
		return &Post{}, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return &Post{}, fmt.Errorf("transaction error: %v", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	postID := uuid.New().String()
	_, err = tx.Exec("INSERT INTO posts (post_id, user_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
		postID, userID, newPost.Content)
	if err != nil {
		return &Post{}, fmt.Errorf("insert post error: %v", err)
	}

	for _, categoryName := range newPost.Categories {
		var categoryID string
		err = tx.QueryRow("SELECT category_id FROM categories WHERE category_name = ?", categoryName).Scan(&categoryID)
		if err != nil {
			return &Post{}, fmt.Errorf("invalid category %s: %v", categoryName, err)
		}
		_, err = tx.Exec("INSERT INTO posts_categories (post_id, category_id) VALUES (?, ?)", postID, categoryID)
		if err != nil {
			return &Post{}, fmt.Errorf("insert posts_categories error: %v", err)
		}
	}

	var nickname string
	err = tx.QueryRow("SELECT nickname FROM users WHERE user_id = ?", userID).Scan(&nickname)
	if err != nil {
		return &Post{}, fmt.Errorf("fetch nickname error: %v", err)
	}

	if err = tx.Commit(); err != nil {
		return &Post{}, fmt.Errorf("commit error: %v", err)
	}

	return &Post{
		PostID:       postID,
		Content:      newPost.Content,
		CreatedAt:    time.Now(),
		Author:       Author{Nickname: nickname},
		Categories:   newPost.Categories,
		LikeCount:    0,
		DislikeCount: 0,
	}, nil
}

// GetInitialPosts fetches the 3 newest posts with categories, likes, etc.
func (s *PostService) GetInitialPosts() ([]Post, error) {
	query := `
		SELECT p.post_id, p.user_id, p.content, p.created_at, u.nickname,
			   COALESCE(SUM(CASE WHEN pr.reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
			   COALESCE(SUM(CASE WHEN pr.reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
		FROM posts p
		JOIN users u ON p.user_id = u.user_id
		LEFT JOIN posts_reactions pr ON p.post_id = pr.post_id
		GROUP BY p.post_id
		ORDER BY p.created_at DESC
		LIMIT 3`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query error: %v", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.PostID, &p.UserID, &p.Content, &p.CreatedAt, &p.Author.Nickname, &p.LikeCount, &p.DislikeCount); err != nil {
			return nil, fmt.Errorf("scan error: %v", err)
		}

		// Fetch categories
		catRows, err := s.db.Query(`
			SELECT c.category_name
			FROM posts_categories pc
			JOIN categories c ON pc.category_id = c.category_id
			WHERE pc.post_id = ?`, p.PostID)
		if err != nil {
			return nil, fmt.Errorf("category query error: %v", err)
		}
		p.Categories = []string{}
		for catRows.Next() {
			var cat string
			if err := catRows.Scan(&cat); err != nil {
				catRows.Close()
				return nil, fmt.Errorf("category scan error: %v", err)
			}
			p.Categories = append(p.Categories, cat)
		}
		catRows.Close()

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %v", err)
	}

	return posts, nil
}

func validateNewPost(newPost NewPost) error {
	if newPost.Content == "" {
		return fmt.Errorf("Post content cannot be empty")
	}
	if len(newPost.Content) > 700 {
		return fmt.Errorf("Post content exceeds maximum length of 700 characters")
	}
	if strings.TrimSpace(newPost.Content) == "" {
		return fmt.Errorf("Post content cannot be just whitespace")
	}
	return nil
}
