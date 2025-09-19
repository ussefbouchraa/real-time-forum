import { renderNavigation, renderHome, renderLogin, renderRegister, renderProfile, renderError } from './render.js';
import { components } from "./components.js"

class RealTimeForum {
    constructor() {
        this.isAuthenticated = false;
        this.userData = {};
        this.currentPage = 'home';
        this.ws = new WebSocket("ws://localhost:8080/ws");
        this.activeChatUserId = null;
        this.chatMessages = {};
        this.sessionID = null;
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.router();
    }

    // Check if user is authenticated (from localStorage)
    checkAuthStatus() {
        this.sessionID = localStorage.getItem('sessionID');
        if (this.sessionID) {
            try {
                const data = JSON.parse(this.sessionID);
                this.isAuthenticated = true;
                this.userData = data.user;
                this.ws.onopen = () => {

                    this.ws.send(JSON.stringify({
                        type: "user_have_session",
                        data: {
                            user: {
                                sessionID: this.sessionID
                            }
                        }
                    }));
                    this.BackToFrontPayload();
                }
            } catch (e) {
                console.error('Error parsing auth data:', e);
                localStorage.removeItem('sessionID');
            }
        } else {
            this.BackToFrontPayload();
        }
    }


    // Handle incoming WebSocket messages
    BackToFrontPayload() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {

                case "register_response":
                    if (data.status === "ok") {
                        document.getElementById("main-content").innerHTML = components.login();
                    } else {
                        document.querySelector('#register-form .error-container').innerHTML = components.errorPopup(data.user.error);
                    }
                    break;
                case "session_response":
                case "login_response":
                    
                    if (data.status === "ok") {
                            localStorage.setItem("sessionID", data.user.user.session_id);
                        //inject navbar
                        document.getElementById("navbar-container").innerHTML = components.navbar(true, data.user.user.nickname)
                        // inject home layout
                        document.getElementById("main-content").innerHTML = components.home({
                            isAuthenticated: true,
                            userData: { nickname: data.user.user.nickname },
                            posts: []
                        });
                        this.setupHomeEvents()
                    } else {
                        document.querySelector('#login-form .error-container').innerHTML = components.errorPopup(data.error);
                    }
                    break;
                case "new_post":
                    break;
            }
        }
    }

    // Router function to handle navigation
    router() {
        const path = window.location.hash.replace('#', '') || 'home';
        this.currentPage = path;

        renderNavigation(this.isAuthenticated, this.userData, this.setupNavigationEvents);

        // Redirect to login if not authenticated and trying to access protected pages
        const protectedPages = ['home', 'profile'];
        if (!this.isAuthenticated && protectedPages.includes(path)) {
            window.location.hash = 'login';
            return;
        }

        // Redirect to home if authenticated and trying to access auth pages
        const authPages = ['login', 'register'];
        if (this.isAuthenticated && authPages.includes(path)) {
            window.location.hash = 'home';
            return;
        }

        switch (path) {
            case 'home':
                renderHome(this.isAuthenticated, this.userData, this.setupHomeEvents);
                break;
            case 'login':
                renderLogin('', '', this.setupAuthEvents.bind(this));
                break;
            case 'register':
                renderRegister('', '', this.setupAuthEvents.bind(this));
                break;
            case 'profile':
                renderProfile(this.userData);
                break;
            case 'logout':
                // handleLogout();
                break;
            default:
                renderError("NOT FOUND")
            // renderHome();
        }
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

        //   Setup sidebar toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chat-toggle-btn')) this.toggleSideBar();
        });

        // Close chat button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-btn')) this.closeChat();
        });

        // Send message button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#send-message')) this.sendMessage();
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
                // this.handleCreatePost(e.target);  
            });
        }

        // Handle filtering
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // this.handleFilterPosts(e.target);
            });
        }

        // Handle post reactions
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
                const commentId = e.target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
                const type = e.target.getAttribute('data-type');

                if (postId) {
                    // this.handlePostReaction(postId, type);
                } else if (commentId) {
                    // this.handleCommentReaction(commentId, type);
                }
            });
        });

        // Toggle comments visibility
        document.querySelectorAll('.toggle-comments').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postElement = e.target.closest('.forum-post');
                const commentSection = postElement.querySelector('.comment-section');
                commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';

            });
        });

        // Handle comment submission
        document.querySelectorAll('.create-comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const postId = e.target.getAttribute('data-post-id');
                // this.handleCreateComment(postId, e.target);
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
                    this.handleLogin();
                } else if (formType === 'register') {
                    this.handleRegister();
                }
            });
        }
    }

    // Handle logout
    handleLogout() {
        this.isAuthenticated = false;
        this.userData = {};
        localStorage.removeItem('sessionID');

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Close chat if open
        this.closeChat();

        // Redirect to login
        window.location.hash = 'login';
    }

    // Handle registration
    handleRegister() {
        const ageVal = parseInt(document.getElementById("age").value) || 0;

        const userData = {
            type: "register",
            data: {
                user: {
                    first_name: document.getElementById("first_name").value,
                    last_name: document.getElementById("last_name").value,
                    nickname: document.getElementById("nickname").value,
                    age: ageVal,
                    gender: document.getElementById("gender").value,
                    email: document.getElementById("email").value,
                    password: document.getElementById("password").value
                }
            }
        };

        this.ws.send(JSON.stringify(userData));
    }

    // Handle login
    handleLogin() {
        const emailOrNickname = document.getElementById('email_or_nickname').value;
        const password = document.getElementById('password').value;

        this.ws.send(JSON.stringify({
            type: "login",
            data: {
                user: {
                    email_or_nickname: emailOrNickname,
                    password: password
                }
            }
        }));
    }

    // Setup private messages events
    setupPrivateMessagesEvents() {
        // User list items click event
        document.querySelectorAll('.user-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const userId = item.getAttribute('data-user-id');
                this.openChat(userId);
            });
        });
    }




    // Open chat with a user
    openChat(userId) {
        this.activeChatUserId = userId;

        // Get user info from the list (in a real app, you'd fetch this from server)
        const userItems = document.querySelectorAll('.user-list-item');
        let userInfo = null;

        userItems.forEach(item => {
            if (item.getAttribute('data-user-id') === userId) {
                const userNameElement = item.querySelector('.user-name');
                if (userNameElement) {
                    userInfo = { id: userId, name: userNameElement.textContent };
                }
            }
        });

        if (userInfo) {
            // Show chat container
            const chatContainer = document.getElementById('active-chat-container');
            chatContainer.style.display = 'block';

            // Update chat header
            document.getElementById('chat-with-user').textContent = `Chat with ${userInfo.name}`;

            // Load messages (in a real app, you'd fetch from server)
            // this.loadChatMessages(userId);
        }
    }

    // Close active chat
    closeChat() {
        this.activeChatUserId = null;
        const chatContainer = document.getElementById('active-chat-container');
        chatContainer.style.display = 'none';
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('message-input').value = '';
    }

    toggleSideBar() {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar) sidebar.classList.toggle('hide')
    }




}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new RealTimeForum();
});

