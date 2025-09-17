import { components } from "./components.js"

const socket = new WebSocket("ws://localhost:8080/ws");
const sessionID = localStorage.getItem("sessionID");

// check if the user have a cookie first
if (sessionID != null) {
    socket.onopen = () => {
    socket.send(JSON.stringify({
        type: "user_have_session",
            data : {
                sessionID: sessionID
            }
        }));
    }
}else {
    document.getElementById("navbar-container").innerHTML = components.navbar()
    attachNavListeners()
    document.getElementById("main-content").innerHTML = components.home({
                    isAuthenticated: false,
                });
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        
        case "register_response":
            if (data.status === "ok") {
                document.getElementById("main-content").innerHTML = components.login();
            }else {
                document.querySelector('#register-form .error-container').innerHTML = components.errorPopup(data.error);
            }
            break;
        case "session_response":
        case "login_response":
            
            if (data.status === "ok") {
                if (localStorage.getItem("sessionID") !== data.sessionID) {
                    localStorage.setItem("sessionID", data.sessionID);
                }
                //inject navbar
                document.getElementById("navbar-container").innerHTML = components.navbar(true,data.user.nickname)
                // inject home layout
                document.getElementById("main-content").innerHTML = components.home({
                    isAuthenticated: true,
                    userData: { nickname: data.user.nickname },
                    posts: []
                });
                setupHomeEvents()
            }else {
                document.querySelector('#login-form .error-container').innerHTML = components.errorPopup(data.error);
            }
            break;
        case "new_post":
        // DOM update here
            break;
    }
}

function attachNavListeners() {
    const loginLink = document.querySelector('a[href="#login"]');
    const registerLink = document.querySelector('a[href="#register"]');

    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById("main-content").innerHTML = components.login();
            attachLoginListener(); // attach login form submit listener
        });
    }

    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById("main-content").innerHTML = components.register();
            attachRegisterListener(); // attach register form submit listener
        });
    }
}

function attachLoginListener(){
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const emailOrNickname = document.getElementById('email_or_nickname').value;
        const password = document.getElementById('password').value;
    
        socket.send(JSON.stringify({
            type: "login",
            data: { email_or_nickname: emailOrNickname, password }
        }));
    });
}

function attachRegisterListener(){
    document.getElementById("register-form").addEventListener("submit", (e) => {
        e.preventDefault();

        const ageVal = parseInt(document.getElementById("age").value) || 0;
        const userData = {
            type: "register",
            data: {
                first_name: document.getElementById("first_name").value,
                last_name: document.getElementById("last_name").value,
                nickname: document.getElementById("nickname").value,
                age: ageVal,
                gender: document.getElementById("gender").value,
                email: document.getElementById("email").value,
                password: document.getElementById("password").value
            }
        };
    
        socket.send(JSON.stringify(userData));
    });
}


// Setup home page events
    function setupHomeEvents() {
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
    }

// // Render home page
//     function renderHome() {
//         const mainContent = document.getElementById('main-content');
//         mainContent.innerHTML = components.loading();
        
//         try {
//             // In a real app, you would fetch posts from your API
//             const posts = await this.fetchPosts();
//             mainContent.innerHTML = components.home({
//                 isAuthenticated: this.isAuthenticated,
//                 userData: this.userData,
//                 posts: posts,
//                 form_error: ''
//             });
            
//             this.setupHomeEvents();
//         } catch (error) {
//             mainContent.innerHTML = components.errorPopup('Failed to load posts');
//             console.error('Error loading posts:', error);
//         }
//     }



// class RealTimeForum {
//     constructor() {
//         this.isAuthenticated = false;
//         this.userData = {};
//         this.currentPage = 'home';
//         this.ws = null;
//         this.activeChatUserId = null;
//         this.chatMessages = {};
//         this.init();
//     }

//     init() {
//         this.checkAuthStatus();
//         this.setupEventListeners();
//         this.router();
//     }

//     // Check if user is authenticated (from localStorage)
//     checkAuthStatus() {
//         const authData = localStorage.getItem('forumAuth');
//         if (authData) {
//             try {
//                 const data = JSON.parse(authData);
//                 this.isAuthenticated = true;
//                 this.userData = data.user;
//                 this.connectWebSocket();
//             } catch (e) {
//                 console.error('Error parsing auth data:', e);
//                 localStorage.removeItem('forumAuth');
//             }
//         }
//     }

//     // Connect to WebSocket server
//     connectWebSocket() {
//         if (!this.isAuthenticated) return;
        
//         // In a real app, you would connect to your WebSocket server
//         // this.ws = new WebSocket('ws://your-forum-websocket-server');
        
//         // Simulate WebSocket connection
//         console.log('WebSocket connection established');
        
//         // Simulate receiving online users list
//         setTimeout(() => {
//             this.handleOnlineUsers([
//                 { id: 2, nickname: 'jane_doe', firstname: 'Jane', lastname: 'Doe', isOnline: true },
//                 { id: 3, nickname: 'john_smith', firstname: 'John', lastname: 'Smith', isOnline: true },
//                 { id: 4, nickname: 'sara_jones', firstname: 'Sara', lastname: 'Jones', isOnline: false }
//             ]);
//         }, 1000);
//     }

//     // Router function to handle navigation
//     router() {
//         const path = window.location.hash.replace('#', '') || 'home';
//         this.currentPage = path;
        
//         this.renderNavigation();
        
//         // Redirect to login if not authenticated and trying to access protected pages
//         const protectedPages = ['home', 'profile'];
//         if (!this.isAuthenticated && protectedPages.includes(path)) {
//             window.location.hash = 'login';
//             return;
//         }
        
//         // Redirect to home if authenticated and trying to access auth pages
//         const authPages = ['login', 'register'];
//         if (this.isAuthenticated && authPages.includes(path)) {
//             window.location.hash = 'home';
//             return;
//         }
        
//         switch(path) {
//             case 'home':
//                 this.renderHome();
//                 break;
//             case 'login':
//                 this.renderLogin();
//                 break;
//             case 'register':
//                 this.renderRegister();
//                 break;
//             case 'profile':
//                 this.renderProfile();
//                 break;
//             case 'logout':
//                 this.handleLogout();
//                 break;
//             default:
//                 this.renderHome();
//         }
//     }

//     // Render navigation
//     renderNavigation() {
//         const navbarContainer = document.getElementById('navbar-container');
//         if (navbarContainer) {
//             navbarContainer.innerHTML = components.navbar(this.isAuthenticated, this.userData);
//             this.setupNavigationEvents();
//         }
        
//         // Show/hide private messages sidebar based on authentication
//         const messagesSidebar = document.getElementById('private-messages-sidebar');
//         if (messagesSidebar) {
//             messagesSidebar.style.display = this.isAuthenticated ? 'block' : 'none';
//         }
//     }



//     // Render login page
//     renderLogin(error = '', email = '') {
//         const mainContent = document.getElementById('main-content');
//         mainContent.innerHTML = components.login(error, email);
//         this.setupAuthEvents('login');
//     }

//     // Render register page
//     renderRegister(error = '', formData = {}) {
//         const mainContent = document.getElementById('main-content');
//         mainContent.innerHTML = components.register(error, formData);
//         this.setupAuthEvents('register');
//     }

//     // Render profile page
//     renderProfile() {
//         const mainContent = document.getElementById('main-content');
//         mainContent.innerHTML = components.profile(this.userData);
//     }

//     // Setup event listeners
//     setupEventListeners() {
//         // Handle hash changes for SPA routing
//         window.addEventListener('hashchange', () => {
//             this.router();
//         });
        
//         // Close error popups when clicked
//         document.addEventListener('click', (e) => {
//             if (e.target.classList.contains('error-close')) {
//                 e.target.closest('.error-popout').style.display = 'none';
//             }
//         });
        
//         // Private messages sidebar toggle
//         const toggleMessagesBtn = document.getElementById('toggle-messages');
//         if (toggleMessagesBtn) {
//             toggleMessagesBtn.addEventListener('click', () => {
//                 const sidebar = document.getElementById('private-messages-sidebar');
//                 sidebar.classList.toggle('collapsed');
//                 toggleMessagesBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
//             });
//         }
        
//         // Close chat button
//         const closeChatBtn = document.getElementById('close-chat');
//         if (closeChatBtn) {
//             closeChatBtn.addEventListener('click', () => {
//                 this.closeChat();
//             });
//         }
        
//         // Setup chat toggle button
//     const chatToggleBtn = document.getElementById('chat-toggle-btn');
//     if (chatToggleBtn) {
//         chatToggleBtn.addEventListener('click', () => {
//             this.toggleChat();
//         });
//     }
//         // Send message button
//         const sendMessageBtn = document.getElementById('send-message');
//         if (sendMessageBtn) {
//             sendMessageBtn.addEventListener('click', () => {
//                 this.sendMessage();
//             });
//         }
        
//         // Send message on Enter key (but allow Shift+Enter for new line)
//         const messageInput = document.getElementById('message-input');
//         if (messageInput) {
//             messageInput.addEventListener('keypress', (e) => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                     e.preventDefault();
//                     this.sendMessage();
//                 }
//             });
//         }
//     }

//     // Setup navigation events
//     setupNavigationEvents() {
//         // Handle navigation links
//         document.querySelectorAll('a[data-link]').forEach(link => {
//             link.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const path = e.target.getAttribute('href').replace('#', '');
//                 window.location.hash = path;
//             });
//         });
//     }
        
//         // Handle post creation
//         const createForm = document.getElementById('create-post-form');
//         if (createForm) {
//             createForm.addEventListener('submit', (e) => {
//                 e.preventDefault();
//                 this.handleCreatePost(e.target);
//             });
//         }
        
//         // Handle filtering
//         const filterForm = document.getElementById('filter-form');
//         if (filterForm) {
//             filterForm.addEventListener('submit', (e) => {
//                 e.preventDefault();
//                 this.handleFilterPosts(e.target);
//             });
//         }
        
//         // Handle post reactions
//         document.querySelectorAll('.reaction-btn').forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
//                 const commentId = e.target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
//                 const type = e.target.getAttribute('data-type');
                
//                 if (postId) {
//                     this.handlePostReaction(postId, type);
//                 } else if (commentId) {
//                     this.handleCommentReaction(commentId, type);
//                 }
//             });
//         });
        
//         // Toggle comments visibility
//         document.querySelectorAll('.toggle-comments').forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 const postElement = e.target.closest('.forum-post');
//                 const commentSection = postElement.querySelector('.comment-section');
//                 commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
//             });
//         });
        
//         // Handle comment submission
//         document.querySelectorAll('.create-comment-form').forEach(form => {
//             form.addEventListener('submit', (e) => {
//                 e.preventDefault();
//                 const postId = e.target.getAttribute('data-post-id');
//                 this.handleCreateComment(postId, e.target);
//             });
//         });
//     }

//     // Setup authentication events
//     setupAuthEvents(formType) {
//         const form = document.getElementById(`${formType}-form`);
//         if (form) {
//             form.addEventListener('submit', (e) => {
//                 e.preventDefault();
//                 if (formType === 'login') {
//                     this.handleLogin(e.target);
//                 } else if (formType === 'register') {
//                     this.handleRegister(e.target);
//                 }
//             });
//         }
//     }

//     // Setup private messages events
//     setupPrivateMessagesEvents() {
//         // User list items click event
//         document.querySelectorAll('.user-list-item').forEach(item => {
//             item.addEventListener('click', (e) => {
//                 const userId = item.getAttribute('data-user-id');
//                 this.openChat(userId);
//             });
//         });
//     }

//     // API methods (simplified for example)
//     async fetchPosts() {
//         // In a real app, this would be an API call
//         return [
//             {
//                 ID: 1,
//                 Author: { UserName: 'JohnDoe' },
//                 CreatedAt: new Date(),
//                 Content: 'This is a sample post about technology. What do you think about the latest advancements in AI?',
//                 Categories: [{ Name: 'Technology' }, { Name: 'Science' }],
//                 LikeCount: 5,
//                 DislikeCount: 2,
//                 Comments: [
//                     {
//                         ID: 1,
//                         Author: { UserName: 'JaneSmith' },
//                         CreatedAt: new Date(),
//                         Content: 'Great post! I think AI will revolutionize many industries.',
//                         LikeCount: 2,
//                         DislikeCount: 0
//                     },
//                     {
//                         ID: 2,
//                         Author: { UserName: 'TechGuru' },
//                         CreatedAt: new Date(Date.now() - 3600000),
//                         Content: 'I agree, but we need to be careful about ethical implications.',
//                         LikeCount: 3,
//                         DislikeCount: 1
//                     }
//                 ]
//             },
//             {
//                 ID: 2,
//                 Author: { UserName: 'GameLover' },
//                 CreatedAt: new Date(Date.now() - 86400000),
//                 Content: 'Just finished the latest RPG game. The storyline was amazing! Anyone else played it?',
//                 Categories: [{ Name: 'Gaming' }],
//                 LikeCount: 8,
//                 DislikeCount: 1,
//                 Comments: []
//             }
//         ];
//     }

//     // Handle login
//     async handleLogin(form) {
//         const formData = new FormData(form);
//         const identifier = formData.get('identifier');
//         const password = formData.get('password');
        
//         try {
//             // In a real app, this would be an API call
//             // const response = await fetch('/api/login', { 
//             //     method: 'POST', 
//             //     headers: { 'Content-Type': 'application/json' },
//             //     body: JSON.stringify({ identifier, password }) 
//             // });
//             // const data = await response.json();
            
//             // Simulate API response
//             if (identifier && password) {
//                 // Simulate successful login
//                 this.isAuthenticated = true;
//                 this.userData = {
//                     id: 1,
//                     nickname: 'john_doe',
//                     email: 'john@example.com',
//                     firstname: 'John',
//                     lastname: 'Doe',
//                     age: 28,
//                     gender: 'male',
//                     createdAt: new Date()
//                 };
                
//                 // Store auth data in localStorage
//                 localStorage.setItem('forumAuth', JSON.stringify({
//                     user: this.userData,
//                     token: 'simulated-jwt-token'
//                 }));
                
//                 // Connect to WebSocket
//                 this.connectWebSocket();
                
//                 // Redirect to home
//                 window.location.hash = 'home';
//             } else {
//                 this.renderLogin('Invalid credentials', identifier);
//             }
//         } catch (error) {
//             this.renderLogin('Login failed', identifier);
//         }
//     }

//     // Handle register
//     async handleRegister(form) {
//         const formData = new FormData(form);
//         const userData = {
//             nickname: formData.get('nickname'),
//             email: formData.get('email'),
//             password: formData.get('password'),
//             firstname: formData.get('firstname'),
//             lastname: formData.get('lastname'),
//             age: formData.get('age'),
//             gender: formData.get('gender')
//         };
        
//         try {
//             // In a real app, this would be an API call
//             // const response = await fetch('/api/register', { 
//             //     method: 'POST', 
//             //     headers: { 'Content-Type': 'application/json' },
//             //     body: JSON.stringify(userData) 
//             // });
//             // const data = await response.json();
            
//             // Simulate API response
//             if (userData.nickname && userData.email && userData.password) {
//                 // Simulate successful registration
//                 this.isAuthenticated = true;
//                 this.userData = {
//                     id: 1,
//                     ...userData,
//                     createdAt: new Date()
//                 };
                
//                 // Store auth data in localStorage
//                 localStorage.setItem('forumAuth', JSON.stringify({
//                     user: this.userData,
//                     token: 'simulated-jwt-token'
//                 }));
                
//                 // Connect to WebSocket
//                 this.connectWebSocket();
                
//                 // Redirect to home
//                 window.location.hash = 'home';
//             } else {
//                 this.renderRegister('Please fill all required fields', userData);
//             }
//         } catch (error) {
//             this.renderRegister('Registration failed', userData);
//         }
//     }

//     // Handle logout
//     handleLogout() {
//         this.isAuthenticated = false;
//         this.userData = {};
//         localStorage.removeItem('forumAuth');
        
//         // Close WebSocket connection
//         if (this.ws) {
//             this.ws.close();
//             this.ws = null;
//         }
        
//         // Close chat if open
//         this.closeChat();
        
//         // Redirect to login
//         window.location.hash = 'login';
//     }

//     // Handle post creation
//     async handleCreatePost(form) {
//         const formData = new FormData(form);
//         const content = formData.get('content');
//         const categories = formData.getAll('categories');
        
//         try {
//             // In a real app, this would be an API call
//             // await fetch('/api/posts', { 
//             //     method: 'POST', 
//             //     headers: { 
//             //         'Content-Type': 'application/json',
//             //         'Authorization': `Bearer ${JSON.parse(localStorage.getItem('forumAuth')).token}`
//             //     },
//             //     body: JSON.stringify({ content, categories }) 
//             // });
            
//             // For now, just reload the posts
//             this.renderHome();
//             form.reset();
//         } catch (error) {
//             this.showError('Failed to create post');
//         }
//     }

//     // Handle post filtering
//     async handleFilterPosts(form) {
//         const formData = new FormData(form);
//         const categoryFilters = formData.getAll('category-filter');
//         const myPosts = formData.get('myPosts') === 'on';
//         const likedPosts = formData.get('likedPosts') === 'on';
        
//         try {
//             // In a real app, this would be an API call with filters
//             // const response = await fetch(`/api/posts?categories=${categoryFilters.join(',')}&myPosts=${myPosts}&likedPosts=${likedPosts}`);
//             // const posts = await response.json();
            
//             // For now, just reload all posts
//             this.renderHome();
//         } catch (error) {
//             this.showError('Failed to filter posts');
//         }
//     }

//     // Handle post reactions
//     async handlePostReaction(postId, type) {
//         try {
//             // In a real app, this would be an API call
//             // await fetch('/api/post/reaction', { 
//             //     method: 'POST', 
//             //     headers: { 
//             //         'Content-Type': 'application/json',
//             //         'Authorization': `Bearer ${JSON.parse(localStorage.getItem('forumAuth')).token}`
//             //     },
//             //     body: JSON.stringify({ postId, type }) 
//             // });
            
//             // For now, just reload the posts
//             this.renderHome();
//         } catch (error) {
//             this.showError('Failed to update reaction');
//         }
//     }

//     // Handle comment reactions
//     async handleCommentReaction(commentId, type) {
//         try {
//             // In a real app, this would be an API call
//             // await fetch('/api/comment/reaction', { 
//             //     method: 'POST', 
//             //     headers: { 
//             //         'Content-Type': 'application/json',
//             //         'Authorization': `Bearer ${JSON.parse(localStorage.getItem('forumAuth')).token}`
//             //     },
//             //     body: JSON.stringify({ commentId, type }) 
//             // });
            
//             // For now, just reload the posts
//             this.renderHome();
//         } catch (error) {
//             this.showError('Failed to update reaction');
//         }
//     }

//     // Handle comment creation
//     async handleCreateComment(postId, form) {
//         const formData = new FormData(form);
//         const content = formData.get('content');
        
//         try {
//             // In a real app, this would be an API call
//             // await fetch('/api/comments', { 
//             //     method: 'POST', 
//             //     headers: { 
//             //         'Content-Type': 'application/json',
//             //         'Authorization': `Bearer ${JSON.parse(localStorage.getItem('forumAuth')).token}`
//             //     },
//             //     body: JSON.stringify({ postId, content }) 
//             // });
            
//             // For now, just reload the posts
//             this.renderHome();
//             form.reset();
//         } catch (error) {
//             this.showError('Failed to create comment');
//         }
//     }

//     // Handle online users list from WebSocket
//     handleOnlineUsers(users) {
//         const onlineUsersList = document.getElementById('online-users-list');
//         const conversationsList = document.getElementById('conversations-list');
        
//         if (onlineUsersList) {
//             // Filter out current user and show online users
//             const onlineUsers = users.filter(user => user.isOnline && user.id !== this.userData.id);
//             onlineUsersList.innerHTML = onlineUsers.map(user => 
//                 components.userListItem(user)
//             ).join('');
//         }
        
//         if (conversationsList) {
//             // Show all users with conversation history
//             conversationsList.innerHTML = users.filter(user => user.id !== this.userData.id)
//                 .map(user => components.userListItem(user, 0, null))
//                 .join('');
//         }
        
//         // Setup events for user list items
//         this.setupPrivateMessagesEvents();
//     }

//     // Open chat with a user
//     openChat(userId) {
//         this.activeChatUserId = userId;
        
//         // Get user info from the list (in a real app, you'd fetch this from server)
//         const userItems = document.querySelectorAll('.user-list-item');
//         let userInfo = null;
        
//         userItems.forEach(item => {
//             if (item.getAttribute('data-user-id') === userId) {
//                 const userNameElement = item.querySelector('.user-name');
//                 if (userNameElement) {
//                     userInfo = { id: userId, name: userNameElement.textContent };
//                 }
//             }
//         });
        
//         if (userInfo) {
//             // Show chat container
//             const chatContainer = document.getElementById('active-chat-container');
//             chatContainer.style.display = 'block';
            
//             // Update chat header
//             document.getElementById('chat-with-user').textContent = `Chat with ${userInfo.name}`;
            
//             // Load messages (in a real app, you'd fetch from server)
//             this.loadChatMessages(userId);
//         }
//     }

//     // Close active chat
//     closeChat() {
//         this.activeChatUserId = null;
//         const chatContainer = document.getElementById('active-chat-container');
//         chatContainer.style.display = 'none';
//         document.getElementById('chat-messages').innerHTML = '';
//         document.getElementById('message-input').value = '';
//     }

//     // Load chat messages for a user
//     loadChatMessages(userId) {
//         // In a real app, you'd fetch messages from server
//         // For now, simulate some messages
//         const messages = this.chatMessages[userId] || [
//             {
//                 id: 1,
//                 senderId: userId,
//                 senderName: 'Jane Doe',
//                 content: 'Hi there! How are you?',
//                 timestamp: new Date(Date.now() - 3600000)
//             },
//             {
//                 id: 2,
//                 senderId: this.userData.id,
//                 senderName: 'You',
//                 content: "I'm good, thanks! How about you?",
//                 timestamp: new Date(Date.now() - 3500000)
//             },
//             {
//                 id: 3,
//                 senderId: userId,
//                 senderName: 'Jane Doe',
//                 content: "I'm doing great! Just working on this forum project.",
//                 timestamp: new Date(Date.now() - 3400000)
//             }
//         ];
        
//         // Store messages
//         this.chatMessages[userId] = messages;
        
//         // Display messages
//         const chatMessagesContainer = document.getElementById('chat-messages');
//         chatMessagesContainer.innerHTML = messages.map(message => 
//             components.chatMessage(message, message.senderId === this.userData.id)
//         ).join('');
        
//         // Scroll to bottom
//         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
//     }

//     // Send a message
//     sendMessage() {
//         if (!this.activeChatUserId) return;
        
//         const messageInput = document.getElementById('message-input');
//         const content = messageInput.value.trim();
        
//         if (!content) return;
        
//         // Create message object
//         const message = {
//             id: Date.now(),
//             senderId: this.userData.id,
//             senderName: 'You',
//             content: content,
//             timestamp: new Date(),
//             recipientId: this.activeChatUserId
//         };
        
//         // In a real app, you'd send this via WebSocket to the server
//         // this.ws.send(JSON.stringify({
//         //     type: 'private_message',
//         //     data: message
//         // }));
        
//         // For now, just add to local messages
//         if (!this.chatMessages[this.activeChatUserId]) {
//             this.chatMessages[this.activeChatUserId] = [];
//         }
//         this.chatMessages[this.activeChatUserId].push(message);
        
//         // Update UI
//         const chatMessagesContainer = document.getElementById('chat-messages');
//         chatMessagesContainer.innerHTML += components.chatMessage(message, true);
        
//         // Clear input and scroll to bottom
//         messageInput.value = '';
//         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        
//         // Simulate response after a delay
//         setTimeout(() => {
//             this.simulateResponse();
//         }, 1000 + Math.random() * 2000);
//     }

//     // Simulate a response from the other user
//     simulateResponse() {
//         if (!this.activeChatUserId) return;
        
//         const responses = [
//             "That's interesting!",
//             "I see what you mean.",
//             "Thanks for sharing!",
//             "I'll think about that.",
//             "Can you tell me more?",
//             "That makes sense.",
//             "I agree with you.",
//             "Let's discuss this further."
//         ];
        
//         const response = responses[Math.floor(Math.random() * responses.length)];
        
//         const message = {
//             id: Date.now(),
//             senderId: this.activeChatUserId,
//             senderName: 'Jane Doe', // In a real app, you'd get the actual name
//             content: response,
//             timestamp: new Date()
//         };
        
//         // Add to messages
//         this.chatMessages[this.activeChatUserId].push(message);
        
//         // Update UI
//         const chatMessagesContainer = document.getElementById('chat-messages');
//         chatMessagesContainer.innerHTML += components.chatMessage(message, false);
//         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
//     }

//     // Show error message
//     showError(message) {
//         const errorContainer = document.getElementById('error-container');
//         if (errorContainer) {
//             errorContainer.innerHTML = components.errorPopup(message);
//             setTimeout(() => {
//                 errorContainer.innerHTML = '';
//             }, 5000);
//         }
//     }
    
// }

// // Initialize the application when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     window.forumApp = new RealTimeForum();
// });

