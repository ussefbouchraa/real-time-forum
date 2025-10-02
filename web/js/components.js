export const components = {};

// Utility function to prevent XSS attacks
export function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Posts Component
components.posts = (posts, isAuthenticated) => {
    if (!posts || posts.length === 0) {
        return `<section class="posts-container"><p>No posts available. Be the first to post!</p></section>`;
    }

    return `
        <section class="posts-container" id="posts-container">
            <h2 class="posts-title">All Posts</h2>
            <div class="posts-list">
                ${posts.map(post => components.post(post, isAuthenticated)).join('')}
            </div>
            <div class="posts-loader">
                <div class="loading-spinner">Loading more posts...</div>
            </div>
        </section>
    `;
}

// Navbar Component
components.navbar = (isAuthenticated = false) => {
    return `
        <header class="navbar">
            <div id="in-logo">
                <div class="logo-box">Real-Time Forum</div>
                <a href="#home" data-link></a>
            </div>
            <nav class="nav-links">
                <div class="auth-buttons">
                    ${isAuthenticated ? `
                        <a href="#profile" data-link>Profile</a>
                        <a href="#logout" data-link>Logout</a>
                    ` : `
                        <a href="#login" data-link>Login</a>
                        <a href="#register" data-link>Register</a>
                    `}
                </div>
            </nav>
        </header>
    `;
};

// Home/Layout Component
components.home = (isAuthenticated, userData = {}) => {

    const posts = userData.posts || [];
    const formError = userData.form_error || '';

    return `
        ${isAuthenticated ? components.postToggleSection(userData, formError) : ''}
        ${components.posts(posts, isAuthenticated)}
        ${components.chatSidebar()}
        <button class="chat-toggle-btn">💬</button>
    `;
};

// Post Toggle Section Component
components.postToggleSection = (userData, formError) => {
    return `
        <div class="post-toggle-wrapper">
            <input type="radio" name="post-toggle" id="show-filter" hidden>
            <input type="radio" name="post-toggle" id="show-create" hidden>
            <div class="toggle-buttons">
                <label for="show-filter">🔍 Filter Posts</label>
                <label for="show-create">➕ Make a Post</label>
            </div>
            <div class="Welcome-msg">
                <p>👋Welcome, ${escapeHTML(userData.nickname)} </p>
            </div>

            ${formError ? components.errorPopup(formError) : ''}
            
        <!-- post filtring form -->

            <div class="post-sections">
                <div class="post-section filter-section">
                    <form id="filter-form" method="GET" action="/api/posts">
                        <div class="filter-options">
                            <h4>Filter by Categories:</h4>
                            <div class="category-tags-filter">
                                <label class="category-tag">
                                    <input type="checkbox" name="category-filter" value="technology">
                                    <span>Technology</span>
                                </label>
                                <label class="category-tag">
                                    <input type="checkbox" name="category-filter" value="gaming">
                                    <span>Gaming</span>
                                </label>
                                <label class="category-tag">
                                    <input type="checkbox" name="category-filter" value="science">
                                    <span>Science</span>
                                </label>
                                <label class="category-tag">
                                    <input type="checkbox" name="category-filter" value="art & creativity">
                                    <span>Art & Creativity</span>
                                </label>
                                <label class="category-tag">
                                    <input type="checkbox" name="category-filter" value="general">
                                    <span>General</span>
                                </label>
                            </div>
                        </div>
                        <div class="filter-checkboxes">
                            <label class="filter-option">
                                <input type="checkbox" name="myPosts">
                                <span>My Posts</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" name="likedPosts">
                                <span>Liked Posts</span>
                            </label>
                        </div>
                        <button type="submit">Apply Filters</button>
                    </form>
                </div>

    <!-- post creation form -->

                <div class="post-section create-section">
                    <form id="create-post-form" method="POST" action="/api/posts">
                        <textarea name="content" placeholder="Write your post..." maxlength="5000"></textarea>
                        <h4>Select Categories:</h4>
                        <div class="category-options">
                            <label class="category-tag">
                                <input type="checkbox" name="categories" value="technology">
                                <span>Technology</span>
                            </label>
                            <label class="category-tag">
                                <input type="checkbox" name="categories" value="gaming">
                                <span>Gaming</span>
                            </label>
                            <label class="category-tag">
                                <input type="checkbox" name="categories" value="science">
                                <span>Science</span>
                            </label>
                            <label class="category-tag">
                                <input type="checkbox" name="categories" value="art & creativity">
                                <span>Art & Creativity</span>
                            </label>
                            <label class="category-tag">
                                <input type="checkbox" name="categories" value="general">
                                <span>General</span>
                            </label>
                        </div>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </div>
        </div>
    `;
};

// Single Post Component
components.post = (post, isAuthenticated) => {
    return `
        <article class="forum-post" data-post-id="${escapeHTML(post.post_id)}">
            <div class="post-header">
                <span class="post-author">Posted by ${escapeHTML(post.author.nickname)} </span>
                <span class="post-date">${new Date(post.created_at).toLocaleString()}</span>
            </div>

            <div class="post-content">${escapeHTML(post.content)}</div>

            <div class="post-footer">
                <div class="post-categories">
                    ${post.categories.map(cat =>
        `<span class="category-badge">${escapeHTML(cat.Name)}</span>`
    ).join('')}
                </div>
                <div class="post-stats">
                    ${isAuthenticated ? `
                        <button class="reaction-btn like-btn" data-post-id="${post.post_id}" data-type="like">
                            <span>👍</span>
                            <span class="count">${post.like_count}</span>
                        </button>
                        <button class="reaction-btn dislike-btn" data-post-id="${post.post_id}" data-type="dislike">
                            <span>👎</span>
                            <span class="count">${post.dislike_count}</span>
                        </button>
                        <button class="reaction-btn comments-btn toggle-comments" data-post-id="${post.post_id}">
                            <span>💬</span>
                            <span class="count">${post.comments ? post.comments.length : 0}</span>
                        </button>
                    ` : `
                        <span class="likes">👍 ${post.like_count}</span>
                        <span class="dislikes">👎 ${post.dislike_count}</span>
                        <span class="comments">💬 ${post.comments ? post.comments.length : 0} comments</span>
                    `}
                </div>
            </div>
            
            ${isAuthenticated ? components.commentForm(post.post_id) : ''}
            
            <div class="comment-section">
                ${post.comments && post.comments.length > 0 ?
            post.comments.map(comment => components.comment(comment, isAuthenticated)).join('')
            : '<p class="no-comments">No comments yet.</p>'
        }
            </div>
        </article>
    `;
};

// Comment Form Component
components.commentForm = (post_id) => {
    return `
        <div class="comment-form">
            <form class="create-comment-form" data-post-id="${post_id}">
                <textarea name="content" placeholder="Add a comment..." maxlength="249"></textarea>
                <button type="submit">Post Comment</button>
            </form>
        </div>
    `;
};

// Comment Component
components.comment = (comment, isAuthenticated) => {
    return `
        <div class="comment" data-comment-id="${comment.ID}">
            <div class="comment-header">
                <span class="comment-author">${escapeHTML(comment.Author.nickname)}</span>
                <span class="post-date">${new Date(comment.CreatedAt).toLocaleString()}</span>
            </div>
            <p class="comment-content">${escapeHTML(comment.Content)}</p>
            ${isAuthenticated ? `
                <div class="comment-reactions">
                    <button class="reaction-btn like-btn" data-comment-id="${comment.ID}" data-type="like">
                        <span>👍</span>
                        <span class="count">${escapeHTML(comment.like_count)}</span>
                    </button>
                    <button class="reaction-btn dislike-btn" data-comment-id="${comment.ID}" data-type="dislike">
                        <span>👎</span>
                        <span class="count">${comment.Dislike_count}</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
};

// Login Component
components.login = () => {
    return `
        <div class="auth-container">
            <div class="login_container">
                <h1>Login</h1>
                <form id="login-form">
                    <div class="error-container"></div>
                    
                    <label for="email_or_nickname">Email or Nickname</label>
                    <input type="text" id="email_or_nickname" name="identifier" placeholder="Enter your email or nickname" >
                    
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password">
                    
                    <div class="new_account_div">
                        <b>Don't have an account?</b>
                        <a href="#register" data-link>Create one here!</a>
                        <br>
                        <a href="#home" data-link class="back-to-home">Back to Home Page</a>
                    </div>
                    <input type="submit" class="login_button" value="Sign In">
                </form>
            </div>
        </div>
    `;
};

// Register Component
components.register = () => {
    return `
        <div class="auth-container">
            <div id="signup_container">
                <h1>Register</h1>
                <form id="register-form">
                    <div class="error-container"></div>
                    
                    <label for="nickname">Nickname *</label>
                    <input type="text" id="nickname" name="nickname" 
                        placeholder="Choose a nickname" required>
                    
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" 
                        placeholder="Enter your email address" required>
                    
                    <label for="password">Password *</label>
                    <input type="password" id="password" name="password" 
                        placeholder="Create a secure password" required minlength="6" maxlength="20">
                    
                    <label for="first_name">First Name *</label>
                    <input type="text" id="first_name" name="firstname" 
                        placeholder="Enter your first name" required>
                    
                    <label for="last_name">Last Name *</label>
                    <input type="text" id="last_name" name="lastname" 
                        placeholder="Enter your last name" required>
                    
                    <label for="age">Age *</label>
                    <input type="number" id="age" name="age" 
                        placeholder="Enter your age" min="13" max="120" required>
                    
                    <label for="gender">Gender</label>
                    <select id="gender" name="gender">
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    
                    <div class="have_account_div">
                        <b>Already have an account?</b>
                        <a href="#login" data-link>Log in here!</a>
                        <br>
                        <a href="#home" data-link class="back-to-home">Back to Home Page</a>
                    </div>
                    <input type="submit" id="submit_button" value="Create Account">
                </form>
            </div>
        </div>
    `;
};

// Profile Component
components.profile = (userData) => {
    return `
        <div class="profile-container">
            <h1>Your Profile</h1>
            <div class="profile-info">
                <div class="profile-field">
                    <label>Nickname:</label>
                    <span>${escapeHTML(userData.nickname)}</span>
                </div>
                <div class="profile-field">
                    <label>Email:</label>
                    <span>${escapeHTML(userData.email)}</span>
                </div>
                <div class="profile-field">
                    <label>First Name:</label>
                    <span>${escapeHTML(userData.first_name)}</span>
                </div>
                <div class="profile-field">
                    <label>Last Name:</label>
                    <span>${escapeHTML(userData.last_name)}</span>
                </div>
                <div class="profile-field">
                    <label>Age:</label>
                    <span>${escapeHTML(userData.age)}</span>
                </div>
                <div class="profile-field">
                    <label>Gender:</label>
                    <span>${escapeHTML(userData.gender) || 'Not specified'}</span>
                </div>
            </div>
        </div>
        ${components.chatSidebar()}
        <button class="chat-toggle-btn">💬</button>    `;
};

// User List Item Component (for private messages)
components.userListItem = (user, unreadCount = 0, lastMessage = null) => {
    const displayName = user.nickname || `${user.firstname} ${user.lastname}`;
    const statusClass = user.isOnline ? 'online' : 'offline';
    const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString() : '';
    const lastMessagePreview = lastMessage ?
        (lastMessage.content.length > 30 ?
            lastMessage.content.substring(0, 30) + '...' : lastMessage.content) :
        'No messages yet';

    return `
        <div class="user-list-item" data-user-id="${user.id}">
            <div class="user-avatar ${statusClass}"></div>
            <div class="user-info">
                <div class="user-name">${displayName}</div>
                <div class="last-message">${lastMessagePreview}</div>
            </div>
            <div class="message-info">
                <div class="last-time">${lastMessageTime}</div>
                ${unreadCount > 0 ? `<div class="unread-count">${unreadCount}</div>` : ''}
            </div>
        </div>
    `;
};
components.chatSidebar = () => {
    return `
            <div class="sidebar-container hide">
            <div class="messages-header">
                <h3>CHAT MESSAGE </h3>
            </div>
            <div class="online-users">
                <h4>Online Users</h4>
                <div id="online-users-list" class="users-list"></div>
            </div>
            <div class="conversations">
                <h4>Conversations</h4>
                <div id="conversations-list" class="users-list"></div>
            </div>
        </div>

        <div id="active-chat-container" class="chat-container">
            <div class="chat-header">
                <h3 id="chat-with-user">Select a user to chat</h3>
                <button id="close-chat" class="close-btn">×</button>
            </div>
            <div id="chat-messages" class="chat-messages"></div>
            <div class="chat-input">
                <textarea id="message-input" placeholder="Type your message..."></textarea>
                <button id="send-message" class="close-btn">close</button>
                <button id="send-message">Send</button>
            </div>
        </div>
        <\div>
    `;
};

// Chat Message Component
components.chatMessage = (message, isOwn = false) => {
    return `
        <div class="message ${isOwn ? 'own-message' : 'other-message'}">
            <div class="message-header">
                <span class="message-sender">${isOwn ? 'You' : message.senderName}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message.content}</div>
        </div>
    `;
};

// Error Popup Component
components.errorPopup = (message) => {
    return `
        <div class="error-popout">
            <span class="error-close">&times;</span>
            <p class="error-message">${message}</p>
        </div>
    `;
};

// Loading Component
components.loading = () => {
    return `<div class="loading-spinner">Loading...</div>`;
};