import { renders } from './renders.js';
import { setups } from './setupEvent.js';

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

        renders.Navigation(this.isAuthenticated, this.userData);
        setups.NavigationEvents
        // Redirect to login  or home depend authenticated if trying to access protected pages
        const protectedPages = ['home', 'profile'];
        const authPages = ['login', 'register'];

        if (!this.isAuthenticated && protectedPages.includes(path)) {
            window.location.hash = 'login'; return;
        }
        if (this.isAuthenticated && authPages.includes(path)) {
            window.location.hash = 'home'; return;
        }

        switch (path) {
            case 'home':
                renders.Home(this.isAuthenticated, this.userData)
                setups.HomeEvents()
                break;
            case 'login':
                renders.Login('', '')
                setups.AuthEvents('login', this);
                break;
            case 'register':
                renders.Register('', '')
                setups.AuthEvents('register', this);

                break;
            case 'profile':
                renders.Profile(this.userData);
                break;
            case 'logout':
                // handleLogout();
                break;
            default:
                renders.Error("NOT FOUND")
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
            //   Setup sidebar toggle
            if (e.target.closest('.chat-toggle-btn')) this.toggleSideBar();
            // Close chat button
            if (e.target.closest('.close-btn')) this.closeChat();
            // Send message button
            if (e.target.closest('#send-message')) this.sendMessage();

        });
    }



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

    // Handle logout

    handleLogout() {
        this.isAuthenticated = false;
        this.userData = {};
        localStorage.removeItem('forumAuth');

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


    //about Chat

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

