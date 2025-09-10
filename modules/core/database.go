// internal/core/database.go
package core

import (
    "database/sql"
    _ "github.com/mattn/go-sqlite3"
    "log"
)

var db *sql.DB

func InitDB(path string) {
    var err error
    db, err = sql.Open("sqlite3", path)
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    createTables()
}

func GetDB() *sql.DB {
	return db
}

// Optional: migrations
func createTables() {
    userTable()
    categoryTable()
    postTable()
    commentTable()
    postCategoryTable()
}

func userTable() {
    query := `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        nickname TEXT UNIQUE,
        age SMALLINT,
        email TEXT UNIQUE,
        password TEXT
    )`
    if _, err := GetDB().Exec(query); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
}

func categoryTable() {
    query := `CREATE TABLE IF NOT EXISTS category (
        category_id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL
    )`
    if _, err := GetDB().Exec(query); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
}

func postTable() {
    query := `CREATE TABLE IF NOT EXISTS post (
        post_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        post_reaction INTEGER,
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`
    if _, err := GetDB().Exec(query); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
}

func commentTable() {
    query := `CREATE TABLE IF NOT EXISTS comment (
        comment_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        comment_reaction INTEGER,
        user_id TEXT,
        post_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (post_id) REFERENCES post(post_id)
    )`
    if _, err := GetDB().Exec(query); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
}

func postCategoryTable() {
    query := `CREATE TABLE IF NOT EXISTS post_category (
        post_id TEXT,
        category_id TEXT,
        PRIMARY KEY (post_id, category_id),
        FOREIGN KEY (post_id) REFERENCES post(post_id),
        FOREIGN KEY (category_id) REFERENCES category(category_id)
    )`
    if _, err := GetDB().Exec(query); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }
}
