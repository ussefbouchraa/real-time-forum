import { renders } from './renders.js';
import { setups } from './setupEvent.js';

// Throttle utility to limit how often a function can be called.
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
class RealTimeForum {
    constructor() {
        this.isAuthenticated = false;
        this.userData = {};
        this.currentPage = 'home';
        this.ws = new WebSocket("ws://localhost:8080/ws");
        this.isLoggingOut = false;
        this.activeFilters = null; // Track active filters
        this.activeChatUserId = null;
        this.chatOffsets = {}; // Stores message offset for each chat
        this.isLoadingMessages = false; // Flag to prevent multiple loads
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
            }, 5000);
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
                    setTimeout(()=>{
                        window.location.hash = 'home';
                        this.router()
                    },0)
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
                    const msg = data.data;
                    const isOwn = msg.sender_id === this.userData.user_id;
                    const otherUserId = isOwn ? msg.recipient_id : msg.sender_id;

                    // Always update the last message preview in the sidebar
                    this.updateLastMessage(otherUserId, msg.content, msg.created_at);

                    // If the chat is open, display the message.
                    if (otherUserId === this.activeChatUserId) {
                        this.displayChatMessage(msg, isOwn);
                    } else if (!isOwn) { // Otherwise, if it's a message from someone else, show a notification.
                        this.showNotification(otherUserId);
                    }
                } else {
                    renders.Error(data.error);
                }
                break;

            case "chat_history_response":
                if (data.status === "ok") {
                    const messages = data.data || []; // Messages arrive sorted DESC
                    const isInitialLoad = this.chatOffsets[this.activeChatUserId] === 0;

                    if (messages.length === 0) {
                        this.isLoadingMessages = false; // No more messages to load
                        return;
                    }

                    const chatMessagesContainer = document.getElementById('chat-messages');
                    const oldScrollHeight = chatMessagesContainer.scrollHeight;

                    messages.reverse(); // Reverse to prepend in correct chronological order
                    const messagesHTML = messages.map(msg => {
                        const isOwn = msg.sender_id === this.userData.user_id;
                        return renders.ChatMessage(msg, isOwn);
                    }).join('');

                    chatMessagesContainer.insertAdjacentHTML('afterbegin', messagesHTML);
                    this.chatOffsets[this.activeChatUserId] += messages.length;

                    if (isInitialLoad) chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                    else chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - oldScrollHeight;
                    this.isLoadingMessages = false;
                } else {
                    renders.Error(data.error);
                }
                break;
        }
    }

    router() {
        const path = window.location.hash.replace('#', '') || 'home';
        this.currentPage = path;

        // Check session status
        const sessionId = this.sessionID || localStorage.getItem('session_id');
        this.isAuthenticated = !!sessionId;

        renders.Navigation(this.isAuthenticated);
        setups.NavigationEvents();

        // Redirect to login or home depending on authentication if trying to access protected pages
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
                // Attach scroll listener only after the chat container is rendered
                setTimeout(()=>{
                    if (this.isAuthenticated) { this.sendWS(JSON.stringify({ type: "users_list" }));}
                },1000)
                const chatMessagesContainer = document.getElementById('chat-messages');
                if (chatMessagesContainer) chatMessagesContainer.addEventListener('scroll', throttle(this.handleChatScroll.bind(this), 200));

                if (!window.__homeEventsInitialized) {
                    setups.HomeEvents(this);
                    window.__homeEventsInitialized = true;
                }
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

    // Setup event listeners
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
            if (e.target.closest('#send-message-btn')) this.sendMessage();

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
        // Close chat if open
        this.closeChat();

        // Redirect to login
        window.location.hash = 'login';
    }

    // fetch and render the new post on post creation form submit 
    async handleCreatePost(postCreateForm) {
        const content = postCreateForm.querySelector('textarea[name="content"]').value;
        const categories = [...postCreateForm.querySelectorAll('input[name="categories"]:checked')].map(input => input.value);

        const sessionId = this.sessionID || localStorage.getItem('session_id');

        if (!sessionId) {
            renders.Error('No session found. Please log in again.');
            window.location.hash = 'login';
            return;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': sessionId,
                    'request-type': 'create_post'
                },
                body: JSON.stringify({ content, categories })
            });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.hash = 'login';
                    throw new Error('Invalid session, please log in');
                }
                const errorText = await response.text();
                throw new Error(errorText || `Failed to create post: ${response.status}`);
            }
            const data = await response.json();

            renders.AddPost(data.post);
            postCreateForm.reset();
        } catch (err) {
            renders.Error(err.message);
            console.error('Post creation error:', err);
        }
    }
    // fetch and render posts on filter form submit 
    async handleFilterPosts(filterForm) {
        const categories = [...filterForm.querySelectorAll('input[name="category-filter"]:checked')].map(input => input.value);
        const onlyMyPosts = filterForm.querySelector('input[name="myPosts"]')?.checked || false;
        const onlyMyLikedPosts = filterForm.querySelector('input[name="likedPosts"]')?.checked || false;

        // Store active filters
        this.activeFilters = {
            categories,
            onlyMyPosts,
            onlyMyLikedPosts
        };
        try {
            const params = new URLSearchParams();
            if (categories.length) params.append('categories', categories.join(','));
            if (onlyMyPosts) params.append('myPosts', 'true');
            if (onlyMyLikedPosts) params.append('likedPosts', 'true');
            const response = await fetch(`/api/posts?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': localStorage.getItem('session_id'),
                    'request-type': 'filter_posts'
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.hash = 'login';
                    throw new Error('Invalid session, please log in');
                } else if (response.status === 400) {
                    throw new Error('Invalid filter parameters');
                } else {
                    const errorText = await response.text();
                    throw new Error(errorText || `Failed to create post: ${response.status}`);
                }
            }
            const data = await response.json();
            
            if (!data.posts || data.posts.length === 0) {
                document.querySelector(`.loading-spinner`).innerHTML = `No more posts`;
                return
            } else {
                document.querySelector(`.loading-spinner`).style.display = "block";
                document.querySelector(`.posts-loader`).style.display = "block";
            }
            
            renders.PostsList(data.posts);
        } catch (err) {
            renders.Error(err.message);
            console.error('Filter error:', err);
        }
    }
    // fetch and render the new comment on post comment creation form submit 
    async handleCreateComment(post_id, commentForm) {
        const content = commentForm.querySelector('textarea[name="content"]').value;
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': localStorage.getItem('session_id'),
                    'request-type': 'create_comment'
                },
                body: JSON.stringify({ post_id, content })
            })
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.hash = 'login';
                    throw new Error('Invalid session, please log in');
                } else {
                    const errorText = await response.text();
                    throw new Error(errorText || `Failed to create comment: ${response.status}`);
                }
            }
            const data = await response.json();

            renders.AddComment(data.comment);
            commentForm.reset();
        } catch (err) {
            renders.Error(err.message);
            console.error('Error creating comment:', err);
        }
    }

    //fetch on scroll 
    async fetchMorePosts() {
        const postsList = document.querySelector('.posts-list');

        if (!postsList) return;
        const lastPost = postsList.lastElementChild;
        const lastPostId = lastPost ? lastPost.getAttribute('data-post-id') : '';

        try {
            let url = '/api/posts';
            const headers = {
                'Content-Type': 'application/json',
                'Session-ID': localStorage.getItem('session_id'),
                'Last-Post-ID': lastPostId
            };

            // Use filter_posts if filters are active
            if (this.activeFilters) {
                const params = new URLSearchParams();
                if (this.activeFilters.categories.length) {
                    params.append('categories', this.activeFilters.categories.join(','));
                }
                if (this.activeFilters.onlyMyPosts) {
                    params.append('myPosts', 'true');
                }
                if (this.activeFilters.onlyMyLikedPosts) {
                    params.append('likedPosts', 'true');
                }

                url = `/api/posts?${params.toString()}`;
                headers['request-type'] = 'filter_posts';
            } else {
                headers['request-type'] = 'fetch-3-posts';
            }

            const response = await fetch(url, { method: 'GET', headers });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.hash = 'login';
                    throw new Error('Invalid session, please log in');
                }
                const errorText = await response.text();
                throw new Error(errorText || `Failed to fetch post: ${response.status}`);
            }
            const data = await response.json();

            if (!data.posts || data.posts.length === 0 || data.error) {
                document.querySelector(`.loading-spinner`).innerHTML = `No more posts`;
                return
            } else {
                document.querySelector(`.loading-spinner`).style.display = "block";
                document.querySelector(`.posts-loader`).style.display = "block";
            }            

            if (Array.isArray(data.posts)) {
                data.posts.forEach(post => renders.AddPost(post, "append"));
            } else {
                renders.AddPost(data.posts, "append")
            }
        } catch (err) {
            renders.Error(err.message);
            console.error('Post fetch error:', err);
        }
    }

    //fetch on click
    async fetchMoreComments(postId) {
        const parentPost = document.querySelector(`.comment-section[data-post-id="${postId}"]`);
        const commentList = parentPost.querySelectorAll(`.comment`)

        if (!commentList) return;

        const lastComment = commentList[commentList.length - 1]
        const lastCommentId = lastComment.getAttribute('data-comment-id');

        try {
            // Initial posts load
            const response = await fetch('/api/posts', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': localStorage.getItem('session_id'),
                    'request-type': 'fetch-3-comments',
                    'Post-ID': postId,
                    'Last-Comment-ID': lastCommentId
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.hash = 'login';
                    throw new Error('Invalid session, please log in');
                }
                const errorText = await response.text();
                throw new Error(errorText || `Failed to fetch comment: ${response.status}`);
            }
            const data = await response.json();
            if (!data.comments || data.comments.length === 0 || data.error) {
                const commentsFooter = document.querySelector(`.load-more-comments[data-post-id="${postId}"]`);
                commentsFooter.outerHTML = '<p class="no-comments">No more comments.</p>';
                commentsFooter.style.display = commentsFooter.style.display === 'none' ? 'block' : 'none';
                return
            }

            data.comments.forEach(comment => renders.AddComment(comment, "append"));
        } catch (err) {
            renders.Error(err.message);
            console.error('Comment fetch error:', err);
        }
    }

    async handleReaction({ postId, commentId, reactionType }) {

    try {
        const response = await fetch('/api/reactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-ID': localStorage.getItem('session_id')
            },
            body: JSON.stringify({
                post_id: postId || '',
                comment_id: commentId || '',
                reaction_type: reactionType // 1 for like, -1 for dislike
            })
        });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.hash = 'login';
                throw new Error('Invalid session, please log in');
            }
            const errorText = await response.text();
            throw new Error(errorText || `Failed to add reaction: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'ok') {
            const selector = postId 
                ? `.forum-post[data-post-id="${postId}"]`
                : `.comment[data-comment-id="${commentId}"]`;
            const container = document.querySelector(selector);
            if (container) {
                container.querySelector('.like-btn').textContent = `👍 ${data.like_count}`;
                container.querySelector('.dislike-btn').textContent = `👎 ${data.dislike_count}`;
            }
        }
    } catch (err) {
        renders.Error(err.message);
        console.error('Reaction error:', err);
    }
}

    openChat(userId) {

        const user = this.userList.find(u => u.id === userId);
        if (!user) {
            console.error("Cannot open chat: User not found in list.", userId);
            return;
        }
        this.activeChatUserId = userId;
        this.chatOffsets[userId] = 0; // Reset offset when opening a new chat
        this.hideNotification(userId); // Hide notification when chat is opened
        const chatContainer = document.getElementById('active-chat-container');
        chatContainer.style.display = 'block';
        document.getElementById('chat-with-user').textContent = `Chat with ${user.nickname}`;

        // Clear previous messages and prepare for new chat
        document.getElementById('chat-messages').innerHTML = '';
        this.loadMoreMessages();
    }

    loadMoreMessages() {
        if (!this.activeChatUserId || this.isLoadingMessages) return;
        this.isLoadingMessages = true;
        const offset = this.chatOffsets[this.activeChatUserId] || 0;
        this.sendWS(JSON.stringify({
            type: "get_chat_history",
            data: { with_user_id: this.activeChatUserId, limit: 10, offset: offset }
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
    }

    updateLastMessage(userId, content, timestamp) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        if (userItem) {
            const lastMsgEl = userItem.querySelector('.last-message');
            const lastTimeEl = userItem.querySelector('.last-time');
            if (lastMsgEl) {
                lastMsgEl.textContent = content.length > 25 ? content.substring(0, 25) + '...' : content;
            }
            if (lastTimeEl) {
                lastTimeEl.textContent = new Date(timestamp).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            }
        }
    }

    showNotification(userId) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.querySelector('.notification-dot')?.classList.remove('hidden');
        }
    }

    hideNotification(userId) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.querySelector('.notification-dot')?.classList.add('hidden');
        }
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

    handleChatScroll(e) {
        // If we are already loading or not at the top, do nothing.
        if (this.isLoadingMessages || e.target.scrollTop !== 0) {
            return;
        }
        this.loadMoreMessages();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new RealTimeForum();
});
