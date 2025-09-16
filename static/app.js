class ForumSPA {
    constructor() {
        this.isAuthenticated = false;
        this.username = '';
        this.currentPage = 'home';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.router();
    }

    // Router function to handle navigation
    router() {
        const path = window.location.hash.replace('#', '') || 'home';
        this.currentPage = path;
        
        this.renderNavigation();
        
        switch(path) {
            case 'home':
                this.renderHome();
                break;
            case 'login':
                this.renderLogin();
                break;
            case 'signup':
                this.renderSignup();
                break;
            case 'logout':
                this.handleLogout();
                break;
            default:
                this.renderHome();
        }
    }

    // Render navigation
    renderNavigation() {
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
            navbarContainer.innerHTML = components.navbar(this.isAuthenticated, this.username);
            this.setupNavigationEvents();
        }
    }

    // Render home page
    async renderHome() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = components.loading();
        
        try {
            // In a real app, you would fetch posts from your API
            const posts = await this.fetchPosts();
            mainContent.innerHTML = components.home({
                isAuthenticated: this.isAuthenticated,
                username: this.username,
                posts: posts,
                form_error: ''
            });
            
            this.setupHomeEvents();
        } catch (error) {
            mainContent.innerHTML = components.errorPopup('Failed to load posts');
            console.error('Error loading posts:', error);
        }
    }

    // Render login page
    renderLogin(error = '', email = '') {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = components.login(error, email);
        this.setupAuthEvents('login');
    }

    // Render signup page
    renderSignup(error = '', username = '', email = '') {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = components.signup(error, username, email);
        this.setupAuthEvents('signup');
    }

    // Setup event listeners
    setupEventListeners() {
        // Handle hash changes for SPA routing
        window.addEventListener('hashchange', () => {
            this.router();
        });
        
        // Close error popups when clicked
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('error-close')) {
                e.target.closest('.error-popout').style.display = 'none';
            }
        });
    }

    // Setup navigation events
    setupNavigationEvents() {
        // Handle navigation links
        document.querySelectorAll('a[data-link]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const path = e.target.getAttribute('href').replace('#', '');
                window.location.hash = path;
            });
        });
    }

    // Setup home page events
    setupHomeEvents() {
        // Toggle between filter and create sections
        document.querySelectorAll('.toggle-buttons label').forEach(label => {
            label.addEventListener('click', (e) => {
                const target = e.target.getAttribute('for');
                if (target === 'show-filter') {
                    document.querySelector('.filter-section').style.display = 'block';
                    document.querySelector('.create-section').style.display = 'none';
                } else if (target === 'show-create') {
                    document.querySelector('.filter-section').style.display = 'none';
                    document.querySelector('.create-section').style.display = 'block';
                }
            });
        });
        
        // Handle post creation
        const createForm = document.getElementById('create-post-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreatePost(e.target);
            });
        }
        
        // Handle filtering
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFilterPosts(e.target);
            });
        }
        
        // Handle post reactions
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
                const commentId = e.target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
                const type = e.target.getAttribute('data-type');
                
                if (postId) {
                    this.handlePostReaction(postId, type);
                } else if (commentId) {
                    this.handleCommentReaction(commentId, type);
                }
            });
        });
        
        // Handle comment submission
        document.querySelectorAll('.create-comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const postId = e.target.getAttribute('data-post-id');
                this.handleCreateComment(postId, e.target);
            });
        });
    }

    // Setup authentication events
    setupAuthEvents(formType) {
        const form = document.getElementById(`${formType}-form`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (formType === 'login') {
                    this.handleLogin(e.target);
                } else if (formType === 'signup') {
                    this.handleSignup(e.target);
                }
            });
        }
    }

    // API methods (simplified for example)
    async fetchPosts() {
        // In a real app, this would be an API call
        return [
            {
                ID: 1,
                Author: { UserName: 'JohnDoe' },
                CreatedAt: new Date(),
                Content: 'This is a sample post content.',
                Categories: [{ Name: 'Technology' }],
                LikeCount: 5,
                DislikeCount: 2,
                Comments: [
                    {
                        ID: 1,
                        Author: { UserName: 'JaneSmith' },
                        CreatedAt: new Date(),
                        Content: 'Great post!',
                        LikeCount: 2,
                        DislikeCount: 0
                    }
                ]
            }
        ];
    }

    // Handle login
    async handleLogin(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        
        try {
            // In a real app, this would be an API call
            // const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            // const data = await response.json();
            
            // Simulate API response
            if (email && password) {
                this.isAuthenticated = true;
                this.username = email.split('@')[0];
                window.location.hash = 'home';
            } else {
                this.renderLogin('Invalid credentials', email);
            }
        } catch (error) {
            this.renderLogin('Login failed', email);
        }
    }

    // Handle signup
    async handleSignup(form) {
        const formData = new FormData(form);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        
        try {
            // In a real app, this would be an API call
            // const response = await fetch('/api/signup', { method: 'POST', body: JSON.stringify({ username, email, password }) });
            // const data = await response.json();
            
            // Simulate API response
            if (username && email && password) {
                this.isAuthenticated = true;
                this.username = username;
                window.location.hash = 'home';
            } else {
                this.renderSignup('Please fill all fields', username, email);
            }
        } catch (error) {
            this.renderSignup('Signup failed', username, email);
        }
    }

    // Handle logout
    handleLogout() {
        this.isAuthenticated = false;
        this.username = '';
        window.location.hash = 'home';
    }

    // Handle post creation
    async handleCreatePost(form) {
        const formData = new FormData(form);
        const content = formData.get('content');
        const categories = formData.getAll('categories');
        
        try {
            // In a real app, this would be an API call
            // await fetch('/api/posts', { method: 'POST', body: JSON.stringify({ content, categories }) });
            
            // For now, just reload the posts
            this.renderHome();
            form.reset();
        } catch (error) {
            this.showError('Failed to create post');
        }
    }

    // Handle post filtering
    async handleFilterPosts(form) {
        const formData = new FormData(form);
        const categoryFilters = formData.getAll('category-filter');
        const myPosts = formData.get('myPosts') === 'on';
        const likedPosts = formData.get('likedPosts') === 'on';
        
        try {
            // In a real app, this would be an API call with filters
            // const response = await fetch(`/api/posts?categories=${categoryFilters.join(',')}&myPosts=${myPosts}&likedPosts=${likedPosts}`);
            // const posts = await response.json();
            
            // For now, just reload all posts
            this.renderHome();
        } catch (error) {
            this.showError('Failed to filter posts');
        }
    }

    // Handle post reactions
    async handlePostReaction(postId, type) {
        try {
            // In a real app, this would be an API call
            // await fetch('/api/post/reaction', { 
            //     method: 'POST', 
            //     body: JSON.stringify({ postId, type }) 
            // });
            
            // For now, just reload the posts
            this.renderHome();
        } catch (error) {
            this.showError('Failed to update reaction');
        }
    }

    // Handle comment reactions
    async handleCommentReaction(commentId, type) {
        try {
            // In a real app, this would be an API call
            // await fetch('/api/comment/reaction', { 
            //     method: 'POST', 
            //     body: JSON.stringify({ commentId, type }) 
            // });
            
            // For now, just reload the posts
            this.renderHome();
        } catch (error) {
            this.showError('Failed to update reaction');
        }
    }

    // Handle comment creation
    async handleCreateComment(postId, form) {
        const formData = new FormData(form);
        const content = formData.get('content');
        
        try {
            // In a real app, this would be an API call
            // await fetch('/api/comments', { 
            //     method: 'POST', 
            //     body: JSON.stringify({ postId, content }) 
            // });
            
            // For now, just reload the posts
            this.renderHome();
            form.reset();
        } catch (error) {
            this.showError('Failed to create comment');
        }
    }

    // Show error message
    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = components.errorPopup(message);
            setTimeout(() => {
                errorContainer.innerHTML = '';
            }, 5000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new ForumSPA();
});