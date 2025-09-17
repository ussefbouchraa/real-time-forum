// Component registry
const components = {};

// Navbar Component
components.navbar = (isAuthenticated = false, userData = {}) => {
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
components.home = (data = {}) => {
    const isAuthenticated = data.isAuthenticated || false;
    const userData = data.userData || {};
    const posts = data.posts || [];
    const formError = data.form_error || '';
    
    return `
        ${isAuthenticated ? components.menuSection(userData, formError) : ''}
        ${components.posts(posts, isAuthenticated)}
        
        ${components.chatSidebar()}
        <button class="chat-toggle-btn">💬</button>
        
    `;
};

// Post Toggle Section Component
components.menuSection = (userData, formError) => {
    return `
        <div class="menu-container">
            <input type="radio" name="post-toggle" id="show-filter" checked hidden>
            <input type="radio" name="post-toggle" id="show-create" hidden>
            <div class="toggle-buttons">
                <label for="show-filter">🔍 Filter Posts</label>
                <label for="show-create">➕ Make a Post</label>
            </div>
            <div class="Welcome-msg">
                <p>👋Welcome, ${userData.nickname || userData.firstName} </p>
            </div>

            ${formError ? components.errorPopup(formError) : ''}
            
            <div class="post-sections">
                <div class="post-section filter-section">
                    <form id="filter-form">
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
                <div class="post-section create-section">
                    <form id="create-post-form">
                        <textarea name="content" placeholder="Write your post..." required maxlength="5000"></textarea>
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

// Posts Component
components.posts = (posts, isAuthenticated) => {
    if (!posts || posts.length === 0) {
        return `<section class="posts-container"><p>No posts available. Be the first to post!</p></section>`;
    }
    
    return `
        <section class="posts-container">
            <h2 class="posts-title">All Posts</h2>
            ${posts.map(post => components.post(post, isAuthenticated)).join('')}
        </section>
    `;
};

// Single Post Component
components.post = (post, isAuthenticated) => {
    return `
        <article class="forum-post" data-post-id="${post.ID}">
            <div class="post-header">
                <span class="post-author">Posted by ${post.Author.UserName} </span>
                <span class="post-date">${new Date(post.CreatedAt).toLocaleString()}</span>
            </div>

            <div class="post-content">${post.Content}</div>

            <div class="post-footer">
                <div class="post-categories">
                    ${post.Categories.map(cat => 
                        `<span class="category-badge">${cat.Name}</span>`
                    ).join('')}
                </div>
                <div class="post-stats">
                    ${isAuthenticated ? `
                        <button class="reaction-btn like-btn" data-post-id="${post.ID}" data-type="like">
                            <span>👍</span>
                            <span class="count">${post.LikeCount}</span>
                        </button>
                        <button class="reaction-btn dislike-btn" data-post-id="${post.ID}" data-type="dislike">
                            <span>👎</span>
                            <span class="count">${post.DislikeCount}</span>
                        </button>
                        <button class="reaction-btn comments-btn toggle-comments" data-post-id="${post.ID}">
                            <span>💬</span>
                            <span class="count">${post.Comments ? post.Comments.length : 0}</span>
                        </button>
                    ` : `
                        <span class="likes">👍 ${post.LikeCount}</span>
                        <span class="dislikes">👎 ${post.DislikeCount}</span>
                        <span class="comments">💬 ${post.Comments ? post.Comments.length : 0} comments</span>
                    `}
                </div>
            </div>
            
            ${isAuthenticated ? components.commentForm(post.ID) : ''}
            
            <div class="comment-section" style="display: none;">
                ${post.Comments && post.Comments.length > 0 ? 
                    post.Comments.map(comment => components.comment(comment, isAuthenticated)).join('') 
                    : '<p class="no-comments">No comments yet.</p>'
                }
            </div>
        </article>
    `;
};

// Comment Form Component
components.commentForm = (postId) => {
    return `
        <div class="comment-form">
            <form class="create-comment-form" data-post-id="${postId}">
                <textarea name="content" placeholder="Add a comment..." required maxlength="249"></textarea>
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
                <span class="comment-author">${comment.Author.UserName}</span>
                <span class="post-date">${new Date(comment.CreatedAt).toLocaleString()}</span>
            </div>
            <p class="comment-content">${comment.Content}</p>
            ${isAuthenticated ? `
                <div class="comment-reactions">
                    <button class="reaction-btn like-btn" data-comment-id="${comment.ID}" data-type="like">
                        <span>👍</span>
                        <span class="count">${comment.LikeCount}</span>
                    </button>
                    <button class="reaction-btn dislike-btn" data-comment-id="${comment.ID}" data-type="dislike">
                        <span>👎</span>
                        <span class="count">${comment.DislikeCount}</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
};

// Login Component
components.login = (error = '', email = '') => {
    return `
        <div class="auth-container">
            <div class="login_container">
                <h1>Login</h1>
                <form id="login-form">
                    ${error ? components.errorPopup(error) : ''}
                    
                    <label for="login_identifier">Email or Nickname</label>
                    <input type="text" id="login_identifier" name="identifier" placeholder="Enter your email or nickname" value="${email}">
                    
                    <label for="login_password">Password</label>
                    <input type="password" id="login_password" name="password" placeholder="Enter your password">
                    
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
components.register = (error = '', formData = {}) => {
    return `
        <div class="auth-container">
            <div id="signup_container">
                <h1>Register</h1>
                <form id="register-form">
                    ${error ? components.errorPopup(error) : ''}
                    
                    <label for="register_nickname">Nickname *</label>
                    <input type="text" id="register_nickname" name="nickname" required 
                        placeholder="Choose a nickname" value="${formData.nickname || ''}">
                    
                    <label for="register_email">Email *</label>
                    <input type="email" id="register_email" name="email" required 
                        placeholder="Enter your email address" value="${formData.email || ''}">
                    
                    <label for="register_password">Password *</label>
                    <input type="password" id="register_password" name="password" required 
                        placeholder="Create a secure password">
                    
                    <label for="register_firstname">First Name *</label>
                    <input type="text" id="register_firstname" name="firstname" required 
                        placeholder="Enter your first name" value="${formData.firstname || ''}">
                    
                    <label for="register_lastname">Last Name *</label>
                    <input type="text" id="register_lastname" name="lastname" required 
                        placeholder="Enter your last name" value="${formData.lastname || ''}">
                    
                    <label for="register_age">Age *</label>
                    <input type="number" id="register_age" name="age" required min="13" 
                        placeholder="Enter your age" value="${formData.age || ''}">
                    
                    <label for="register_gender">Gender</label>
                    <select id="register_gender" name="gender">
                        <option value="">Select gender</option>
                        <option value="male" ${formData.gender === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${formData.gender === 'female' ? 'selected' : ''}>Female</option>
                        <option value="other" ${formData.gender === 'other' ? 'selected' : ''}>Other</option>
                        <option value="prefer_not_to_say" ${formData.gender === 'prefer_not_to_say' ? 'selected' : ''}>Prefer not to say</option>
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
                    <span>${userData.nickname}</span>
                </div>
                <div class="profile-field">
                    <label>Email:</label>
                    <span>${userData.email}</span>
                </div>
                <div class="profile-field">
                    <label>First Name:</label>
                    <span>${userData.firstname}</span>
                </div>
                <div class="profile-field">
                    <label>Last Name:</label>
                    <span>${userData.lastname}</span>
                </div>
                <div class="profile-field">
                    <label>Age:</label>
                    <span>${userData.age}</span>
                </div>
                <div class="profile-field">
                    <label>Gender:</label>
                    <span>${userData.gender || 'Not specified'}</span>
                </div>
                <div class="profile-field">
                    <label>Member since:</label>
                    <span>${new Date(userData.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        ${components.chatSidebar()}
        <button class="chat-toggle-btn">💬</button>
        
    `;
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