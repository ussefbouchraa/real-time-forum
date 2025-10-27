<h1 align="center">Real-Time Forum</h1>
<p align="center">A dynamic web application featuring a classic forum and a live one-on-one chat system, built with Go and vanilla JavaScript.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go" alt="Go Version">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript" alt="JavaScript Version">
</p>

## 📝 Overview

**Real-Time Forum** is a full-stack web application that combines a traditional discussion forum with a modern, real-time private chat system. The backend is built with Go, leveraging WebSockets for instant communication, while the frontend is a responsive Single Page Application (SPA) created with vanilla JavaScript. This project serves as a practical demonstration of building interactive, real-time web services from the ground up without relying on heavy frameworks.


## 📁 Project Structure

```
real-time-forum/
├── .gitignore                # Git ignore file
├── go.mod                    # Go module dependencies
├── go.sum                    # Go module checksums
├── modules/                  # Backend logic
│   ├── auth/                 # Authentication services
│   │   ├── auth_service.go
│   │   └── ws_handler.go
│   ├── chat/                 # Chat functionality
│   │   ├── chat_message.go
│   │   └── chat_service.go
│   ├── core/                 # Core utilities
│   │   ├── config.go
│   │   └── database.go
│   ├── posts/                # Forum post handling
│   │   ├── post.go
│   │   ├── post_handler.go
│   │   └── post_service.go
│   └── templates/            # HTML template rendering
│       └── templates.go
├── r-forum.db                # SQLite database
├── readme.md                 # Project documentation
├── server/                   # Server entry point
│   └── main.go
└── web/                      # Frontend assets
    ├── css/                  # Styles and favicon
    │   ├── favicon.png
    │   └── style.css
    ├── index.html            # Main HTML file
    └── js/                   # JavaScript files
        ├── app.js            # Core SPA logic
        ├── components.js     # Reusable UI components
        ├── renders.js        # Rendering logic
        ├── setupEvent.js     # Event listeners
        └── utils.js          # Utility functions
```



## ✨ Features

**Forum & Content**
- **Create & Comment**: Users can create posts and comment on them.
- **Reactions**: Like or dislike posts and comments.
- **Advanced Filtering**: Filter posts by category, author, or liked status.
- **Infinite Scroll**:  
  - **Posts:** New posts are automatically fetched and displayed as the user scrolls down the page.  
  - **Comments:** Comments use a "Load more" button to fetch additional content on demand.  
  - **Messages:** Chat messages are fetched automatically while scrolling, using an offset-based loading system for smooth and efficient data retrieval.

**Real-Time Chat**
- **Private Messaging**: One-on-one instant messaging with other users. Supports **multi-tab synchronization**, allowing chat activity to stay updated across all open tabs.
- **Online Presence**: See which users are currently online.
- **Notifications**: Get notified of new, unread messages.
- **Chat History**: Infinite scroll to load older messages in a conversation.

**Core**
- **User Authentication**: Secure registration and login with session management.
- **Single Page Application (SPA)**: A fluid and fast user experience with hash-based routing.




## 🛠️ Tech Stack

| Area    | Technology                                                              |
| :------ | :---------------------------------------------------------------------- |
| **Backend**   | Go, `net/http`, Gorilla WebSocket                               |
| **Frontend**  | JavaScript (ES6+), SPA Architecture, Custom CSS         |
| **Database**  | SQLite 3                                                        |
| **Security**  | `bcrypt` for password hashing, UUIDs for session tokens         |


## 🔒 Security
Security is a high priority for this application. We have implemented several layered defenses to protect against common web vulnerabilities.

### Content Security Policy (CSP)
A strict CSP is enforced via HTTP headers to mitigate Cross-Site Scripting (XSS) and data injection attacks. This policy explicitly whitelists trusted sources for scripts, styles, fonts, and images, and blocks all inline scripts and styles.

**Policy Implemented:**
`default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://robohash.org;`

> **Note on Console Errors:** You may see an error in the browser console like `Refused to apply inline style...`. This is expected behavior and confirms the CSP is working correctly. It is actively blocking inline styles, which are a potential vector for XSS attacks.

### Cross-Site WebSocket Hijacking (CSWH)
To prevent malicious websites from hijacking a user's WebSocket session, the server is designed to validate the `Origin` header of incoming WebSocket upgrade requests in a production environment. This ensures that only our trusted frontend domain can establish a connection.

### CSRF Protection
Cross-Site Request Forgery (CSRF) is primarily mitigated by our strict Content Security Policy. The `default-src 'self'` directive prevents other domains from making requests (e.g., via forms or scripts) to our server, as they would violate the same-origin policy.

### Additional Security Headers
We also set other headers to further harden the application:

- **`X-Content-Type-Options: nosniff`**: Prevents the browser from MIME-sniffing the content type, which stops it from, for example, executing a text file as if it were a script.

- **`Cache-Control: no-cache, no-store, must-revalidate`**: Instructs the browser not to cache sensitive session data, ensuring that private information isn't stored on a shared computer or in a proxy.


## 🚀 Getting Started

### Prerequisites

*   Go (version 1.21 or newer)
*   A modern web browser (e.g., Chrome, Firefox, Safari)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/real-time-forum.git
    cd real-time-forum
    ```

2.  **Initialize Go modules:**
    This downloads the required backend dependencies.
    ```bash
    go mod tidy
    ```

3.  **Run the server:**
    This compiles and runs the application.
    ```bash
    go run server/main.go
    ```

4.  **Open the application:**
    Navigate to the URL shown in your terminal.
    > Server started at http://localhost:8080/#home
    
    Open your web browser and navigate to **http://localhost:8080**.


Enjoy using the Real-Time Forum!
