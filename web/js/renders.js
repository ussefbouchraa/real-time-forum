
import { components } from './components.js';

export const renders = {}

// Navigation: Renders navbar with auth state
renders.Navigation = (isAuthenticated) => {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = components.navbar(isAuthenticated);
    }
}

// Render home page with 3 initial posts
renders.Home = async (isAuthenticated, userData = {}) => {
    
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.loading();    
    try {
        // Fetch initial posts via API
        const response = await fetch('/api/posts', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Session-ID': localStorage.getItem('session_id'),
                'request-type': 'fetch-3-posts'
            }
        });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.hash = 'login';
                throw new Error('Invalid session, please log in');
            }
            const errorText = await response.text();
            throw new Error(errorText || `Failed to load post: ${response.status}`);
        }

        const data = await response.json();
        if (!data.error) {
            userData.posts = data.posts;
            mainContent.innerHTML = components.home(isAuthenticated, userData);
            document.querySelector('.posts-loader').style.display = 'none';
            return
        }

        mainContent.innerHTML = components.home(isAuthenticated, userData);
    } catch (error) {
        mainContent.innerHTML = components.errorPopup(error);
        console.error('Error loading posts:', error);
    }
}

// PostsList: Renders full list of posts (used in filtering)
renders.PostsList = (posts = []) => {
    const postsContainer = document.querySelector('.posts-container');
    if (!postsContainer) return;
    
    if (!posts || posts.length === 0) {        
        postsContainer.innerHTML = '<p>No posts found matching your criteria.</p>';
        return;
    }

    postsContainer.innerHTML = `
        <h2 class="posts-title">Posts</h2>
        <div class="posts-list">
        ${posts.map(post => components.post(post, true)).join('')}
        </div>
        <div class="posts-loader">
            <div class="loading-spinner">
                ${(!posts || posts.length === 0) ? `No more posts` : `Loading more posts...`}
            </div>
        </div>
    `;
}

// AddPost: Inserts a new post (prepend for creation, append for fetch)
renders.AddPost = (post, mode = "prepend") => {
    const postsList = document.querySelector('.posts-list');

    if (!postsList) return;

    const postHTML = components.post(post, true);
    const postElement = document.createElement('div');
    postElement.innerHTML = postHTML;
    const actualPost = postElement.children[0];

    if (mode === "append") {
        postsList.appendChild(actualPost); // append when fetching new posts
    } else {
        postsList.insertBefore(actualPost, postsList.firstChild); // prepend when its the creation of a post
    }

    const noPosts = document.querySelector('.posts-list .no-post')
    if (noPosts) {
        noPosts.style.display = 'none';
    }
};

// AddComment: Adds a new comment to its post
renders.AddComment = (comment, mode = "prepend") => {
    const commentSection = document.querySelector(`.comment-section[data-post-id="${comment.post_id}"]`);
    if (!commentSection) return;

    const commentElement = document.createElement('div');
    commentElement.innerHTML = components.comment(comment, true);

    if (mode === "append") {
        commentSection.appendChild(commentElement.children[0]);  // Append to inner
    } else {
        renders.updatePostStats(comment.post_id, "Comment");
        commentSection.insertBefore(commentElement.children[0], commentSection.firstChild);  // Prepend to inner
    }
    const noCommentsMsg = commentSection.querySelector('.no-comments');
    if (noCommentsMsg) {
        noCommentsMsg.remove();
    }
}

// updatePostStats: Increments comment count in UI
renders.updatePostStats = (post_id, Statustype) => {
    switch (Statustype) {
        case "LikeDislike":

            break;
        case "Comment":
            const article = document.querySelector(`.forum-post[data-post-id="${post_id}"]`);
            if (!article) return;

            const commentBtn = article.querySelector(".comments-btn .count");
            if (!commentBtn) return;

            const currentCount = parseInt(commentBtn.textContent, 10) || 0;
            commentBtn.textContent = currentCount + 1;
            break;
    }
}

// Render login page
renders.Login = (userData = {}) => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.login(userData);
}

// Render register page
renders.Register = () => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.register();
}

// Profile: Renders user profile
renders.Profile = (userData) => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.profile(userData);
}

// Error: Shows temporary error popup
renders.Error = (message) => {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = components.errorPopup(message);
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 5000);
    }
}

// Users: Renders online/offline users in chat sidebar
renders.Users = (users, user) => {

    const currentUser = users.find(u => u.id === user.user_id);
if (!currentUser) return;    
    const onlineUsers = users.filter(u => u.id !== currentUser.id && u.isOnline === true);
    const offlineUsers = users.filter(u => u.id !== currentUser.id && u.isOnline === false)    
    const onlineUsersList = document.getElementById('online-users-list');
    const offlineUsersList = document.getElementById('conversations-list')
    if (!onlineUsersList || !offlineUsersList) return
    
    onlineUsersList.innerHTML = onlineUsers.map(u => components.userListItem(u, currentUser)).join('');
    offlineUsersList.innerHTML = offlineUsers.map(u => components.userListItem(u, currentUser)).join('');

    const handleClick = (e) => {
        const item = e.target.closest('.user-list-item') || e.target.closest('.conversation-list-item')
        if (item) {
            const userId = item.getAttribute('data-user-id')
            window.forumApp.openChat(userId)
        }
    }

    onlineUsersList.onclick = handleClick
    offlineUsersList.onclick = handleClick

}

// ChatMessage: Renders a single chat bubble
renders.ChatMessage = (message, isOwn) => {
    message.sender_nickname = isOwn ? 'You' : message.sender_nickname;
    return components.chatMessage(message, isOwn);
};

// StatusPage: Renders 404/403/500 page
renders.StatusPage = (statusCode) => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
        mainContent.innerHTML = components.statusPage(statusCode)

    }
}
