
import { components } from './components.js';

export const renders = {}

// Render navigation
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
        // Initial posts load
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
            console.log(errorText);
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

// Render post list (used for filtering and updates)
renders.PostsList = (posts) => {
    const postsContainer = document.querySelector('.posts-container');
    if (!postsContainer) return;

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<p>No posts found matching your criteria.</p>';
        return;
    }

    postsContainer.innerHTML = `
        <h2 class="posts-title">Posts</h2>
        ${posts.map(post => components.post(post, true)).join('')}
    `;
    document.querySelector('comment-section').style.display = "none";
}

// Add a single new post to the list
renders.AddPost = (post, mode = "prepend") => {
    const postsList = document.querySelector('.posts-list');  // Change to inner list
    if (!postsList) return;

    const postHTML = components.post(post, true);
    const postElement = document.createElement('div');
    postElement.innerHTML = postHTML;
    const actualPost = postElement.children[0];
    actualPost.querySelector('.comment-section').style.display = 'none';

    if (mode === "append") {
        postsList.appendChild(actualPost);  // Append to inner
    } else {
        postsList.insertBefore(actualPost, postsList.firstChild);  // Prepend to inner
    }
};

// add a single new comment to a post
renders.AddComment = (comment ,mode = "prepend") => {
    const commentSection = document.querySelector(`.comment-section[data-post-id="${comment.post_id}"]`);
    if (!commentSection) return;

    const commentElement = document.createElement('div');
    commentElement.innerHTML = components.comment(comment, true);
    renders.updatePostStats(comment.post_id, "Comment");

    if (mode === "append") {
        commentSection.appendChild(commentElement.children[0]);  // Append to inner
    } else {
        commentSection.insertBefore(commentElement.children[0], commentSection.firstChild);  // Prepend to inner
    }
    const noCommentsMsg = commentSection.querySelector('.no-comments');
    if (noCommentsMsg) {
        noCommentsMsg.remove();
    }
}

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
renders.Login = () => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.login();
}

// Render register page
renders.Register = () => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.register();
}

// Render profile page
renders.Profile = (userData) => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.profile(userData);
}

// Render error message
renders.Error = (message) => {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = components.errorPopup(message);
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 5000);
    }
}

