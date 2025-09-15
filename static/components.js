// All page components in one object
const Components = {
    // Navigation bar component
    navbar: (isAuthenticated, username) => {
        return `
            <nav class="navbar">
                <a href="#" class="logo" data-link="/">Forum</a>
                <div class="nav-links">
                    ${isAuthenticated ? `
                        <span>Welcome, ${username}</span>
                        <div class="auth-buttons">
                            <a href="#" data-link="/logout">Logout</a>
                        </div>
                    ` : `
                        <div class="auth-buttons">
                            <a href="#" data-link="/login">Login</a>
                            <a href="#" data-link="/register">Register</a>
                        </div>
                    `}
                </div>
            </nav>
        `;
    },

    // Login page component
    login: (error = '') => {
        return `
            ${Components.navbar(false)}
            <div class="form-container">
                <h1>Login</h1>
                ${error ? `<div class="error">${error}</div>` : ''}
                <form id="login-form">
                    <label for="email">Email</label>
                    <input type="text" id="email" name="email" placeholder="Enter your email" required>
                    
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    
                    <div class="form-links">
                        <b>Don't have an account?</b>
                        <a href="#" data-link="/register">Create here!</a>
                    </div>
                    
                    <input type="submit" value="Sign In">
                </form>
            </div>
        `;
    },

    // Register page component
    register: (error = '', formData = {}) => {
        return `
            ${Components.navbar(false)}
            <div class="form-container">
                <h1>Sign Up</h1>
                ${error ? `<div class="error">${error}</div>` : ''}
                <form id="register-form">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Enter your username" 
                        value="${formData.username || ''}" required>
                    
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address" 
                        value="${formData.email || ''}" required>
                    
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Create a secure password" required>
                    
                    <div class="form-links">
                        <b>Already have an account?</b>
                        <a href="#" data-link="/login">Log in here!</a>
                    </div>
                    
                    <input type="submit" value="Sign Up">
                </form>
            </div>
        `;
    },

    // Posts page component
    posts: (posts = [], error = '') => {
        return `
            ${Components.navbar(true, "User")}
            <div class="posts-container">
                <h2>All Posts</h2>
                ${error ? `<div class="error">${error}</div>` : ''}
                
                <div class="create-post">
                    <h3>Create a New Post</h3>
                    <form id="create-post-form">
                        <textarea id="post-content" placeholder="What's on your mind?" required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>
                
                <div class="posts-list">
                    ${posts.length > 0 ? 
                        posts.map(post => Components.postItem(post)).join('') : 
                        '<p>No posts available.</p>'
                    }
                </div>
            </div>
            
            ${Components.chatSidebar()}
        `;
    },

    // Single post item component
    postItem: (post) => {
        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <span class="post-author">Posted by ${post.author}</span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button class="action-btn like-btn">
                        <span>👍</span>
                        <span class="count">${post.likes || 0}</span>
                    </button>
                    <button class="action-btn comment-btn">
                        <span>💬</span>
                        <span class="count">${post.comments ? post.comments.length : 0}</span>
                    </button>
                </div>
                
                <div class="comments-section" style="display: none;">
                    ${post.comments ? post.comments.map(comment => `
                        <div class="comment">
                            <div class="comment-author">${comment.author}</div>
                            <div class="comment-content">${comment.content}</div>
                        </div>
                    `).join('') : ''}
                    
                    <form class="comment-form">
                        <input type="text" placeholder="Add a comment..." required>
                        <button type="submit">Comment</button>
                    </form>
                </div>
            </div>
        `;
    },

    // Chat sidebar component
    chatSidebar: () => {
        return `
            <div class="chat-sidebar">
                <h3>Online Users</h3>
                <ul class="user-list">
                    <li class="user-item user-online">User1</li>
                    <li class="user-item user-online">User2</li>
                    <li class="user-item user-offline">User3</li>
                </ul>
                
                <div class="chat-window">
                    <h4>Chat with User1</h4>
                    <div class="messages">
                        <div class="message">Hello!</div>
                        <div class="message">How are you?</div>
                    </div>
                    <form class="message-form">
                        <input type="text" placeholder="Type a message..." required>
                        <button type="submit">Send</button>
                    </form>
                </div>
            </div>
        `;
    },

    // Error page component
    error: (statusCode, message) => {
        return `
            ${Components.navbar(false)}
            <div class="form-container">
                <h2>Oops!</h2>
                <h1>${statusCode}</h1>
                <p>${message}</p>
                <div class="form-links">
                    <a href="#" data-link="/">Go back to home page</a>
                </div>
            </div>
        `;
    }
};