// Component registry
const components = {};

// Navbar Component
components.navbar = (isAuthenticated = false, username = '') => {
    return `
        <header class="navbar">
            <div id="in-logo">
                <div class="logo-box">Forum</div>
                <a href="#home" data-link></a>
            </div>
            <nav class="nav-links">
                <div class="auth-buttons">
                    ${isAuthenticated ? `
                        <span class="welcome-text">Welcome, ${username}</span>
                        <a href="#logout" data-link>Logout</a>
                    ` : `
                        <a href="#login" data-link>Login</a>
                        <a href="#signup" data-link>Register</a>
                    `}
                </div>
            </nav>
        </header>
    `;
};

// Home/Layout Component
components.home = (data = {}) => {
    const isAuthenticated = data.isAuthenticated || false;
    const username = data.username || '';
    const posts = data.posts || [];
    const formError = data.form_error || '';
    
    return `
        ${components.postToggleSection(isAuthenticated, username, formError)}
        ${components.posts(posts, isAuthenticated)}
    `;
};

// Post Toggle Section Component
components.postToggleSection = (isAuthenticated, username, formError) => {
    return `
        <div class="post-toggle-wrapper">
            <input type="radio" name="post-toggle" id="show-filter" checked hidden>
            <input type="radio" name="post-toggle" id="show-create" hidden>
            <div class="toggle-buttons">
                ${isAuthenticated ? `
                    <label for="show-filter">🔍 Filter Posts</label>
                    <label for="show-create">➕ Make a Post</label>
                ` : `
                    <label for="show-filter">🔍 Filter Posts</label>
                `}
            </div>
            <div class="Welcome-msg">
                ${isAuthenticated ? `<p>👋Welcome, ${username} </p>` : ''}
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
        return `<section class="posts-container"><p>No posts available.</p></section>`;
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
                        <button class="reaction-btn comments-btn" data-post-id="${post.ID}">
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
            
            ${post.Comments && post.Comments.length > 0 ? `
                <div class="comment-section">
                    ${post.Comments.map(comment => components.comment(comment, isAuthenticated)).join('')}
                </div>
            ` : ''}
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
            <span class="comment-author">Posted by ${comment.Author.UserName}</span>
            <span class="post-date">${new Date(comment.CreatedAt).toLocaleString()}</span>
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
                    
                    <label for="email_input">Email</label>
                    <input type="text" id="email_input" name="email" placeholder="Enter your email" value="${email}">
                    
                    <label for="password_input">Password</label>
                    <input type="password" id="password_input" name="password" placeholder="Enter your password">
                    
                    <div class="new_account_div">
                        <b>don't have an account?</b>
                        <a href="#signup" data-link>create here!</a>
                        <br>
                        <a href="#home" data-link class="back-to-home">Back to Home Page</a>
                    </div>
                    <input type="submit" class="login_button" value="Sign In">
                </form>
            </div>
        </div>
    `;
};

// Signup Component
components.signup = (error = '', username = '', email = '') => {
    return `
        <div class="auth-container">
            <div id="signup_container">
                <h1>Sign up</h1>
                <form id="signup-form">
                    ${error ? components.errorPopup(error) : ''}
                    
                    <label for="username_input">Username</label>
                    <input type="text" id="username_input" name="username" required placeholder="Enter your username" value="${username}">
                    
                    <label for="email_input">Email</label>
                    <input type="email" id="email_input" name="email" required placeholder="Enter your email address" value="${email}">
                    
                    <label for="password_input">Password</label>
                    <input type="password" id="password_input" name="password" required placeholder="Create a secure password">
                    
                    <div class="have_account_div">
                        <b>Already have an account?</b>
                        <a href="#login" data-link>log in here!</a>
                        <br>
                        <a href="#home" data-link class="back-to-home">Back to Home Page</a>
                    </div>
                    <input type="submit" id="submit_button" value="Sign Up">
                </form>
            </div>
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