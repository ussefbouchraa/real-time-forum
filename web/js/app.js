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
        this.userList = [];
        this.init();
    }

    init() {
        this.setupWS();
        this.setupEventListeners();
        this.router();
    }

    setupWS() {
        this.ws.addEventListener("open", () => {
            const session = localStorage.getItem('session_id');
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
                    localStorage.setItem("session_id", data.data.user.session_id);
                    this.userData = data.data.user;
                    this.isAuthenticated = true;
                    window.location.hash = 'home';
                } else {
                    localStorage.removeItem("session_id");

                    this.sessionID = null;
                    renders.Error(data.error)
                }
                break;
            case "users_list":
                if (data.status === "ok") {
                    this.userList = data.data;
                    renders.Users(this.userList, this.userData);
                } else { renders.Error(data.error) }
                break;

            case "private_message":
                if (data.status === "ok") {
                    // Only display if the message is for the active chat or from the active chat user
                    if (data.data.sender_id === this.activeChatUserId || data.data.recipient_id === this.userData.user_id) {
                        this.displayChatMessage(data.data, false);
                    }
                } else {
                    renders.Error(data.error);
                }
                break;

            case "chat_history_response":
                if (data.status === "ok") {
                    const messages = data.data || [];
                    const chatMessagesContainer = document.getElementById('chat-messages');
                    chatMessagesContainer.innerHTML = ''; // Clear old messages
                    messages.forEach(msg => {
                        const isOwn = msg.sender_id === this.userData.user_id;
                        this.displayChatMessage(msg, isOwn);
                    });
                } else {
                    renders.Error(data.error);
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

        if (this.isAuthenticated) { this.sendWS(JSON.stringify({ type: "users_list" }));}

        switch (path) {
            case 'home':
                renders.Home(this.isAuthenticated, this.userData)
                setups.HomeEvents(this);
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

                // renders.StatusPage()
                renders.Error("NOT FOUND")
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
            if (e.target.id === 'send-message-btn') this.sendMessage();
        });


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
        window.location.hash = 'login';
    }

    // --- Chat window Functions ---

    openChat(userId) {

        const user = this.userList.find(u => u.id === userId);
        if (!user) {
            console.error("Cannot open chat: User not found in list.", userId);
            return;
        }
        this.activeChatUserId = userId;
        const chatContainer = document.getElementById('active-chat-container');
        chatContainer.style.display = 'block';
        document.getElementById('chat-with-user').textContent = `Chat with ${user.nickname}`;

        // Clear previous messages and prepare for new chat
        document.getElementById('chat-messages').innerHTML = '';
        
        // Request message history from the server
        this.sendWS(JSON.stringify({
            type: "get_chat_history",
            data: { with_user_id: userId }
        }));
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const messageText = input.value.trim();
        if (messageText && this.activeChatUserId) {
            const payload = {
                type: "private_message",
                data: {
                    recipient_id: this.activeChatUserId,
                    content: messageText,
                }
            };
            this.sendWS(JSON.stringify(payload));
            this.sendWS(JSON.stringify({
                    type: "get_chat_history",
                    data: { with_user_id: this.activeChatUserId }
                }));
            // Optimistically display the message on our own screen
            const messageData = {
                sender_id: this.userData.user_id,
                sender_nickname: 'You', // Display 'You' for own messages
                content: messageText,
                created_at: new Date().toISOString() // Use created_at for consistency
            };
            
            this.displayChatMessage(messageData, true);

            input.value = '';
        }
    }

    displayChatMessage(message, isOwn) {
        // Append message to chat UI
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (chatMessagesContainer) {
            const messageEl = document.createElement('div');
            messageEl.innerHTML = renders.ChatMessage(message, isOwn);
            chatMessagesContainer.appendChild(messageEl.firstElementChild);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Auto-scroll to the latest message
        }
        
    document.querySelector('.last-message').textContent = message.content  
    document.querySelector('.last-time').textContent = new Date(message.created_at).toLocaleTimeString()
}

    closeChat() {
        this.activeChatUserId = null;
        const chatContainer = document.getElementById('active-chat-container');
        if (chatContainer) chatContainer.style.display = 'none';
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('message-input').value = '';
    }

    toggleSideBar() {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar) sidebar.classList.toggle('hide');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new RealTimeForum();
});
