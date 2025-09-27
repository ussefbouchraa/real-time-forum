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
        this.chatWS = null; // Chat WebSocket
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
        });

        this.ws.addEventListener("close", () => {
            if (this.isLoggingOut) {
                this.isLoggingOut = false;
                return;
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
                    window.location.hash = 'login';
                    renders.Error(data.error)
                }
                break;
            case "new_post":
                break;
        }
    }

    router() {
        const path = window.location.hash.replace('#', '') || 'home';
        this.currentPage = path;

        renders.Navigation(this.isAuthenticated);
        setups.NavigationEvents();

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

    setupEventListeners() {
        window.addEventListener('hashchange', () => {
            this.router();
        });

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

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('error-close')) {
                e.target.closest('.error-popout').style.display = 'none';
            }
            if (e.target.closest('.chat-toggle-btn')) this.toggleSideBar();
            if (e.target.closest('.close-btn')) this.closeChat();
            if (e.target.closest('#send-message')) this.sendMessage();
        });


        /////////////////////////////////////////////////////////////////////////////here
        
        // // Demo for  Render online users in the sidebar
        // const onlineUsers = [
        //     { id: "1", nickname: "Alice", isOnline: true },
        //     { id: "2", nickname: "Bob", isOnline: true }
        //     // ...get this list from your backend or mock for now
        // ];

        // const onlineUsersList = document.getElementById('online-users-list');
        // if (onlineUsersList) {
        //     onlineUsersList.innerHTML = onlineUsers.map(user => components.userListItem(user)).join('');
        // }

        // // Add click event to user list items to open chat
        // onlineUsersList.addEventListener('click', (e) => {
        //     const item = e.target.closest('.user-list-item');
        //     if (item) {
        //         const userId = item.getAttribute('data-user-id');
        //         this.openChat(userId);
        //     }
        // });
    }

    sendWS(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(payload);
        } else {
            this.ws = new WebSocket("ws://localhost:8080/ws");
            this.setupWS();
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
        this.sendWS(registerPayload);
    }

    handleLogout() {
        this.isAuthenticated = false;
        this.isLoggingOut = true;
        this.userData = {};
        localStorage.removeItem('session_id');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.closeChat();
        window.location.hash = 'login';
    }

    // --- Chat Functions ---

    openChat(userId) {
        this.activeChatUserId = userId;

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
            const chatContainer = document.getElementById('active-chat-container');
            chatContainer.style.display = 'block';
            document.getElementById('chat-with-user').textContent = `Chat with ${userInfo.name}`;
        }

        // Create chat WebSocket
        this.chatWS = new WebSocket("ws://localhost:8080/ws/chat");

        // Listen for chat messages
        this.chatWS.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "chat_message" && data.status === "ok") {
                console.log("New chat message:", data.message);
                this.displayChatMessage(data.message); 
            } else if (data.status === "error") {
                renders.Error(data.error);
            }
        });

        // Optionally handle chat WebSocket closure
        this.chatWS.addEventListener("close", () => {
            console.warn("Chat connection closed.");
        });
    }

    sendChatMessage(toUserId, messageText) {
        if (this.chatWS && this.chatWS.readyState === WebSocket.OPEN) {
            this.chatWS.send(JSON.stringify({
                from: this.userData.nickname,
                to: toUserId,
                message: messageText
            }));
        }
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const messageText = input.value.trim();
        if (messageText && this.activeChatUserId) {
            this.sendChatMessage(this.activeChatUserId, messageText);
            input.value = '';
        }
    }

    displayChatMessage(message) {
        // Append message to chat UI
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (chatMessagesContainer) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message';
            msgDiv.textContent = `${message.from}: ${message.message}`;
            chatMessagesContainer.appendChild(msgDiv);
        }
    }

    closeChat() {
        this.activeChatUserId = null;
        const chatContainer = document.getElementById('active-chat-container');
        if (chatContainer) chatContainer.style.display = 'none';
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('message-input').value = '';
        if (this.chatWS) {
            this.chatWS.close();
            this.chatWS = null;
        }
    }

    toggleSideBar() {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar) sidebar.classList.toggle('hide');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new RealTimeForum();
});

