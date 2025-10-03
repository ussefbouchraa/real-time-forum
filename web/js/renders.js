
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
            'request-type' : 'initial-fetch'
        }
    });
    if (!response.ok) throw new Error('Failed to fetch posts');

    const data = await response.json();
    userData.posts = data.posts;
    mainContent.innerHTML = components.home(isAuthenticated, userData);
    document.querySelector('.posts-loader').style.display = 'none';

    } catch (error) {
        mainContent.innerHTML = components.errorPopup('Failed to load posts');
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
}

// Add a single new post to the list
renders.AddPost = (post) => {
    const postsContainer = document.querySelector('.posts-container');
    if (!postsContainer) return;

    const postElement = document.createElement('div');
    postElement.innerHTML = components.post(post, true);
    postElement.querySelector('.comment-section').style.display = 'none';

    postsContainer.insertBefore(postElement.children[0], postsContainer.firstChild);
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

// Setup infinite scroll
function setupInfiniteScroll() {
    let page = 1;
    let loading = false;
    let hasMore = true;

    const loadMorePosts = async () => {
        if (loading || !hasMore) return;
        loading = true;

        try {
            const response = await fetch(`/api/posts?page=${page + 1}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': localStorage.getItem('session_id')
                }
            });

            if (!response.ok) throw new Error('Failed to fetch more posts');

            const data = await response.json();
            if (data.posts.length === 0) {
                hasMore = false;
                return;
            }

            const postsContainer = document.querySelector('.posts-container');
            data.posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.innerHTML = components.post(post, true);
                postsContainer.appendChild(postElement.firstChild);
            });

            page++;
        } catch (error) {
            console.error('Error loading more posts:', error);
            renders.Error('Failed to load more posts');
        } finally {
            loading = false;
        }
    };

    // Throttle scroll handler
    let ticking = false;
    const scrollHandler = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.scrollY + window.innerHeight;
                const threshold = document.documentElement.scrollHeight - 500;

                if (scrolled >= threshold) {
                    loadMorePosts();
                }
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', scrollHandler);
}