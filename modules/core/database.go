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

    _, err = db.Exec("PRAGMA foreign_keys = ON")
    if err != nil {
        log.Fatal("Failed to enable foreign keys:", err)
    }

    createUsersTable()
    createCategoryTable()
    createPostCategoryTable()
}

func createUsersTable(){
    query := `
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nickname TEXT NOT NULL UNIQUE,
        age INTEGER NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    );`

    _ , err := db.Exec(query)
    if err != nil {
        log.Fatalf("Failed to create users table: %v", err)
    }
}

func createCategoryTable(){
    query := `
    CREATE TABLE IF NOT EXISTS category(
        category_id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL
    );`

    _ , err := db.Exec(query)
    if err != nil {
        log.Fatalf("Failed to create category table: %v", err)
    }
}

func createPostCategoryTable(){
    query := `
    CREATE TABLE IF NOT EXISTS postcategory(
        post_id TEXT,
        category_id TEXT,
        PRIMARY KEY (post_id , category_id ),
        FOREIGN KEY (post_id) REFERENCES post(post_id),
        FOREIGN KEY (category_id) REFERENCES category(category_id)
    );`

    _ , err := db.Exec(query)
    if err != nil {
        log.Fatalf("Failed to create postcategory table: %v", err)
    }
}
