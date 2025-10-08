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

type CommentService struct {
	db *sql.DB
}

// NewPostService creates a new service instance
func NewPostService(db *sql.DB) *PostService {
	return &PostService{db: db}
}

func NewCommentService(db *sql.DB) *CommentService {
	return &CommentService{db: db}
}

// CreatePost creates a new post with categories
func (ps *PostService) CreatePost(userID string, newPost *NewPost) (*Post, error) {
	if err := validateNewPost(newPost); err != nil {
		return &Post{}, err
	}

	tx, err := ps.db.Begin()
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

// fetch more posts
func (ps *PostService) GetPosts(lastPostID string) ([]Post, error) {
	limit := 3
	baseQuery := `
        SELECT p.post_id, p.user_id, p.content, p.created_at, u.nickname,
               COALESCE(SUM(CASE WHEN pr.reaction_type = 1 THEN 1 ELSE 0 END),0) AS like_count,
               COALESCE(SUM(CASE WHEN pr.reaction_type = -1 THEN 1 ELSE 0 END),0) AS dislike_count
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN posts_reactions pr ON p.post_id = pr.post_id
    `

	var whereQu string
	var args []interface{}
	if lastPostID != "" {
		var lastCreatedAt time.Time
		err := ps.db.QueryRow(`SELECT created_at FROM posts WHERE post_id = ?`, lastPostID).Scan(&lastCreatedAt)
		if err != nil {
			return nil, fmt.Errorf("invalid last_post_id: %w", err)
		}
		whereQu = " WHERE p.created_at < ?"
		args = append(args, lastCreatedAt)
	}

	query := fmt.Sprintf("%s%s GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ?", baseQuery, whereQu)
	args = append(args, limit)
	rows, err := ps.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("posts query error: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.PostID, &p.UserID, &p.Content, &p.CreatedAt, &p.Author.Nickname, &p.LikeCount, &p.DislikeCount); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}

		// Fetch categories
		catRows, err := ps.db.Query(`
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

		// Fetch comment count
		err = ps.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, p.PostID).Scan(&p.CommentCount)
		if err != nil {
			return nil, fmt.Errorf("count comments error: %v", err)
		}
		// Fetch initial comments (first 3)
		p.Comments, err = ps.GetComments(p.PostID, "", 3)
		if err != nil {
			return nil, fmt.Errorf("initial comments fetch error: %v", err)
		}

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %v", err)
	}
	if lastPostID != "" && len(posts) > 0 {
		return posts[1:], nil // Skip the last post if paginating
	}
	return posts, nil
}

// In modules/posts/post_service.go
func (ps *PostService) GetFilteredPosts(userID string, categories []string, onlyMyPosts, onlyMyLikedPosts bool, lastPostID string) ([]Post, error) {
	limit := 3

	baseQuery := `
        SELECT DISTINCT p.post_id, p.user_id, p.content, p.created_at, u.nickname,
               COALESCE(SUM(CASE WHEN pr.reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
               COALESCE(SUM(CASE WHEN pr.reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN posts_reactions pr ON p.post_id = pr.post_id
    `

	var whereClauses []string
	var args []interface{}

	// Category filter
	if len(categories) > 0 {
		categoryPlaceholders := strings.Repeat("?,", len(categories))
		categoryPlaceholders = categoryPlaceholders[:len(categoryPlaceholders)-1]
		whereClauses = append(whereClauses, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM posts_categories pc JOIN categories c ON pc.category_id = c.category_id WHERE pc.post_id = p.post_id AND c.category_name IN (%s))",
			categoryPlaceholders))
		for _, cat := range categories {
			args = append(args, cat)
		}
	}

	// My posts filter
	if onlyMyPosts {
		whereClauses = append(whereClauses, "p.user_id = ?")
		args = append(args, userID)
	}

	// Liked posts filter
	if onlyMyLikedPosts {
		whereClauses = append(whereClauses, `
            EXISTS (SELECT 1 FROM posts_reactions pr2 WHERE pr2.post_id = p.post_id AND pr2.user_id = ? AND pr2.reaction_type = 1)
        `)
		args = append(args, userID)
	}

	// Pagination
	if lastPostID != "" {
		var lastCreatedAt time.Time
		err := ps.db.QueryRow(`SELECT created_at FROM posts WHERE post_id = ?`, lastPostID).Scan(&lastCreatedAt)
		if err != nil {
			return nil, fmt.Errorf("invalid last_post_id: %w", err)
		}
		whereClauses = append(whereClauses, "p.created_at < ?")
		args = append(args, lastCreatedAt)
	}

	// Combine WHERE clauses
	var where string
	if len(whereClauses) > 0 {
		where = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := fmt.Sprintf("%s%s GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ?", baseQuery, where)
	args = append(args, limit)

	rows, err := ps.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("filtered posts query error: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.PostID, &p.UserID, &p.Content, &p.CreatedAt, &p.Author.Nickname, &p.LikeCount, &p.DislikeCount); err != nil {
			return nil, fmt.Errorf("scan filtered post: %w", err)
		}

		// Fetch categories
		catRows, err := ps.db.Query(`
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

		// Fetch comment count
		err = ps.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, p.PostID).Scan(&p.CommentCount)
		if err != nil {
			return nil, fmt.Errorf("count comments error: %v", err)
		}

		// Fetch initial comments
		p.Comments, err = ps.GetComments(p.PostID, "", 3)
		if err != nil {
			return nil, fmt.Errorf("initial comments fetch error: %v", err)
		}

		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %v", err)
	}

	if lastPostID != "" && len(posts) > 0 {
		return posts[1:], nil // Skip the last post if paginating
	}
	return posts, nil
}

func validateNewPost(newPost *NewPost) error {
	if newPost.Content == "" {
		return fmt.Errorf("Post content cannot be empty")
	}
	if len(newPost.Content) > 700 {
		return fmt.Errorf("Post content exceeds maximum length of 700 characters")
	}
	if strings.TrimSpace(newPost.Content) == "" {
		return fmt.Errorf("Post content cannot be just whitespace")
	}
	if len(newPost.Categories) == 0 {
		return fmt.Errorf("at least one category must be selected")
	}
	for _, c := range newPost.Categories {
		if strings.TrimSpace(c) == "" {
			return fmt.Errorf("Category cannot be empty or whitespace")
		}
	}
	return nil
}

// CommentService methods
func (cm *CommentService) CreateComment(userID, postID, content string) (*Comment, error) {
	if err := validateComment(content); err != nil {
		return &Comment{}, err
	}
	tx, err := cm.db.Begin()
	if err != nil {
		return &Comment{}, fmt.Errorf("transaction error: %v", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	commentID := uuid.New().String()
	_, err = tx.Exec("INSERT INTO comments (comment_id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
		commentID, postID, userID, content)
	if err != nil {
		return &Comment{}, fmt.Errorf("insert comment error: %v", err)
	}

	var nickname string
	err = tx.QueryRow("SELECT nickname FROM users WHERE user_id = ?", userID).Scan(&nickname)
	if err != nil {
		return &Comment{}, fmt.Errorf("fetch nickname error: %v", err)
	}

	err = tx.Commit()
	if err != nil {
		return &Comment{}, fmt.Errorf("commit error: %v", err)
	}

	return &Comment{
		CommentID: commentID,
		PostID:    postID,
		UserID:    userID,
		Content:   content,
		CreatedAt: time.Now(),
		Author:    Author{Nickname: nickname},
	}, nil
}

// GetComments fetches paginated comments for a post
func (ps *PostService) GetComments(postID string, lastCommentID string, limit int) ([]Comment, error) {
	baseQuery := `
        SELECT c.comment_id, c.post_id, c.user_id, c.content, c.created_at, u.nickname,
               COALESCE(SUM(CASE WHEN cr.reaction_type = 1 THEN 1 ELSE 0 END), 0) AS like_count,
               COALESCE(SUM(CASE WHEN cr.reaction_type = -1 THEN 1 ELSE 0 END), 0) AS dislike_count
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN comments_reactions cr ON c.comment_id = cr.comment_id
        WHERE c.post_id = ?
    `

	var where string
	var args []interface{}
	args = append(args, postID)

	if lastCommentID != "" {
		var lastCreatedAt time.Time
		err := ps.db.QueryRow(`SELECT created_at FROM comments WHERE comment_id = ?`, lastCommentID).Scan(&lastCreatedAt)
		if err != nil {
			return nil, fmt.Errorf("invalid last_comment_id: %w", err)
		}
		where = " AND c.created_at > ?"
		args = append(args, lastCreatedAt)
	}

	query := baseQuery + where + " GROUP BY c.comment_id ORDER BY c.created_at ASC LIMIT ?"
	args = append(args, limit)

	rows, err := ps.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("comments query error: %w", err)
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		if err := rows.Scan(&c.CommentID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.Author.Nickname, &c.LikeCount, &c.DislikeCount); err != nil {
			return nil, fmt.Errorf("comment scan error: %v", err)
		}
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %v", err)
	}
	return comments, nil
}

func validateComment(content string) error {
	if content == "" {
		return fmt.Errorf("comment content cannot be empty")
	}
	if len(content) > 700 {
		return fmt.Errorf("comment content exceeds maximum length of 700 characters")
	}
	if strings.TrimSpace(content) == "" {
		return fmt.Errorf("comment content cannot be just whitespace")
	}
	return nil
}
