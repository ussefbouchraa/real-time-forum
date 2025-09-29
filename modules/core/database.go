package core

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var Db *sql.DB

func InitDB(path string) {
	var err error
	Db, err = sql.Open("sqlite3", path)
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	_, err = Db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		log.Fatal("Failed to enable foreign keys:", err)
	}

	createUsersTable()
	createPostsTable()
	createCommentsTable()
	createCategoriesTable()
	createPostsCategoriesTable()
	createCommentsReactionsTable()
	createPostsReactionsTable()
	createSessionsTable()
}

func createUsersTable() {
	query := `
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nickname TEXT NOT NULL UNIQUE,
        age INTEGER NOT NULL,
		gender TEXT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create users table: %v", err)
	}
}

func createCategoriesTable() {
	query := `
    CREATE TABLE IF NOT EXISTS categories(
        category_id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create categories table: %v", err)
	}
}

func createPostsCategoriesTable() {
	query := `
    CREATE TABLE IF NOT EXISTS posts_categories(
        post_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        PRIMARY KEY (post_id , category_id),
        FOREIGN KEY (post_id) REFERENCES posts(post_id),
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create posts_categories table: %v", err)
	}
}

func createPostsTable() {
	query := `
    CREATE TABLE IF NOT EXISTS posts(
        post_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create posts table: %v", err)
	}
}

func createPostsReactionsTable() {
	query := `
    CREATE TABLE IF NOT EXISTS posts_reactions(
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reaction_type INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (post_id) REFERENCES posts(post_id)              
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create posts_reactions table: %v", err)
	}
}

func createCommentsTable() {
	query := `
    CREATE TABLE IF NOT EXISTS comments(
        comment_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        user_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (post_id) REFERENCES posts(post_id)
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create comments table: %v", err)
	}
}

func createCommentsReactionsTable() {
	query := `
    CREATE TABLE IF NOT EXISTS comments_reactions(
        comment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reaction_type INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (comment_id, user_id),
        FOREIGN KEY (comment_id) REFERENCES comments(comment_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)               
        );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create comments_reactions table: %v", err)
	}
}

func createSessionsTable() {
	query := `
    CREATE TABLE IF NOT EXISTS sessions(
        session_id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        expires_at DATETIME,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );`

	_, err := Db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create sessions table: %v", err)
	}

	indexQuery := `
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);`
	_, err = Db.Exec(indexQuery)
	if err != nil {
		log.Fatalf("Failed to create index on sessions: %v", err)
	}
}
