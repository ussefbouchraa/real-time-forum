CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nickname TEXT NOT NULL UNIQUE,
        age INTEGER NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL 

    );