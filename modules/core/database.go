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

    // createTables()
}

func GetDB() *sql.DB {
	return db
}

// Optional: migrations

// func createTables() {
//     query := `
//     CREATE TABLE IF NOT EXISTS users (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         nickname TEXT UNIQUE,
//         email TEXT UNIQUE,
//         password TEXT,
//         age INTEGER,
//         gender TEXT,
//         first_name TEXT,
//         last_name TEXT
//     );
//     `
//     _, err := db.Exec(query)
//     if err != nil {
//         log.Fatal("Failed to run migrations:", err)
//     }
// }
