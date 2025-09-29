package posts

import "time"

type Post struct {
	PostID       string         `json:"post_id"`
	UserID       string         `json:"user_id"`
	Content      string         `json:"content"`
	CreatedAt    time.Time      `json:"created_at"`
	Author       Author         `json:"author,omitempty"`
	Categories   []Category     `json:"categories"`
	Comments     []Comment      `json:"comments,omitempty"`
	LikeCount    int            `json:"like_count"`
	DislikeCount int            `json:"dislike_count"`
	Reactions    []PostReaction `json:"reactions,omitempty"`
}

type Comment struct {
	PostID       string            `json:"post_id"`
	UserID       string            `json:"user_id"`
	Content      string            `json:"content"`
	CreatedAt    time.Time         `json:"created_at"`
	Author       Author            `json:"author"`
	LikeCount    int               `json:"like_count"`
	DislikeCount int               `json:"dislike_count"`
	Reactions    []CommentReaction `json:"reactions,omitempty"`
}

// Category represents a post category
type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Author struct {
	Nickname string `json:"nickname"`
}

type PostReaction struct {
	PostID       string `json:"post_id"`
	UserID       string `json:"user_id"`
	ReactionType int    `json:"reaction_type"`
}

type CommentReaction struct {
	CommentID    string `json:"comment_id"`
	UserID       string `json:"user_id"`
	ReactionType int    `json:"reaction_type"`
}
