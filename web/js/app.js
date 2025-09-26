import { renders } from './renders.js';
import { setups } from './setupEvent.js';

class RealTimeForum {
    constructor() {
        this.isAuthenticated = false;
        this.userData = {};
        this.currentPage = 'home';
        this.ws = new WebSocket("ws://localhost:8080/ws");
        this.isLoggingOut = false;
        this.activeChatUserId = null;
        this.chatMessages = {};
        this.sessionID = null;
        this.init();
    }

    init() {
        this.setupWS();
        this.setupEventListeners();
        this.router();
    }

    setupWS() {
        this.ws.addEventListener("open", () => {
            const session = this.sessionID != null ? this.sessionID : localStorage.getItem('session_id');
            if (session) {

                this.ws.send(JSON.stringify({
                    type: "user_have_session",
                    data: { user: { session_id: session } }
                }));
            }
        });

        this.ws.addEventListener("message", (event) => {
            this.BackToFrontPayload(event)
        })

        this.ws.addEventListener("close", () => {
            if (this.isLoggingOut) {
                this.isLoggingOut = false; // reset for next login
                return; // Do NOT reconnect after logout
            }
            console.warn("WebSocket closed, trying to reconnect...");
            setTimeout(() => {
                this.reconnectWS();
            }, 50000);
        });

        this.ws.addEventListener("error", (err) => {
            console.error('WebSocket error:', err);
            renders.Error('Connection to server lost. Please try again.');
        });

    }



    reconnectWS() {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.close();
        }

        this.ws = new WebSocket("ws://localhost:8080/ws");
        this.setupWS();
    }

    // Handle incoming WebSocket messages
    BackToFrontPayload(event) {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case "register_response":
                if (data.status === "ok") {
                    window.location.hash = 'home';
                } else {
                    renders.Error(data.error)
                }
                break;
            case "session_response":
            case "login_response":

                if (data.status === "ok") {
                    localStorage.setItem("session_id", data.user.user.session_id);
                    this.userData = data.user.user;
                    this.isAuthenticated = true;
                    window.location.hash = 'home';
                } else {
                    localStorage.removeItem("session_id");
                    this.isAuthenticated = false;
                    this.sessionID = null;
                    renders.Error(data.error)
                }
                break;
            case "new_post":
                break;
        }
    }
    // Router function to handle navigation
    router() {
        // const path = window.location.pathname.replace('/', '') || 'home';
        //  this.currentPage = path;
        const path = window.location.hash.replace('#', '') || 'home';
        this.currentPage = path;

        renders.Navigation(this.isAuthenticated);
        setups.NavigationEvents()

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
                renders.Login()
                setups.AuthEvents('login', this);
                break;
            case 'register':
                renders.Register()
                setups.AuthEvents('register', this);

                break;
            case 'profile':
                renders.Profile(this.userData);
                break;
            case 'logout':
                this.handleLogout();
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

        // storage listener
        window.addEventListener('storage', (event) => {
            if (event.key === 'session_id' && event.newValue) {
                const sessionPayload = JSON.stringify({
                    type: "user_have_session",
                    data: { user: { session_id: event.newValue } }
                });

                this.sendWS(sessionPayload);
            } else if (event.key === 'session_id' && !event.newValue) {
                this.handleLogout();
            }
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

    sendWS(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(payload);
        } else {

            // create new WS if needed
            this.ws = new WebSocket("ws://localhost:8080/ws");

            // setup all events on the new ws
            this.setupWS();

            // queue the payload for send after open
            this.ws.addEventListener('open', () => {
                this.ws.send(payload);
            }, { once: true });
        }
    }

    handleLogin() {
        const emailOrNickname = document.getElementById('email_or_nickname').value;
        const password = document.getElementById('password').value;
        const loginPayload = JSON.stringify({
            type: "login",
            data: { user: { email_or_nickname: emailOrNickname, password: password } }
        });

        this.sendWS(loginPayload);
    }

    // Handle registration
    handleRegister() {
        const ageVal = parseInt(document.getElementById("age").value) || 0;
        const registerPayload = JSON.stringify({
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
        });

        this.sendWS(registerPayload)
    }

    // Handle logout

    handleLogout() {
        this.isAuthenticated = false;
        this.isLoggingOut = true;
        this.userData = {};
        localStorage.removeItem('session_id');

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
        if (chatContainer) chatContainer.style.display = 'none';
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

