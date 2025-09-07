real-time-forum/
├── server/
│       └── main.go
├── internal/
│   ├── core/
│   │   └── database.go       // DB connection (singleton)
│   ├── auth/
│   │   ├── user.go           // User struct
│   │   ├── auth_service.go   // AuthService struct + methods
│   │   └── auth_handler.go   // HTTP handlers (use AuthService)
│   ├── posts/
│   │   ├── post.go           // Post, Comment structs
│   │   ├── post_service.go   // PostService struct + methods
│   │   └── post_handler.go   // HTTP handlers
│   ├── chat/
│   │   ├── message.go        // Message struct
│   │   ├── chat_service.go   // ChatService struct + methods
│   │   ├── hub.go            // Hub (manages clients, OOP style)
│   │   └── chat_handler.go   // WebSocket + REST handlers
│   └── middleware/
│       └── auth.go           // Session check
├── web/
│   ├── index.html
│   ├── style.css
│   └── app.js
