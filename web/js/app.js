import { renders } from './renders.js';
import { setups } from './setupEvent.js';
import { throttle } from './utils.js'; // Import throttle from a new utility file

// RealTimeForum: Core SPA controller managing auth, routing, WS, posts, comments, and chat
class RealTimeForum {
    // constructor: Initializes state, WebSocket, and app lifecycle
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
        this.chatScrollHandler = throttle(this.handleChatScroll, 200);
        this.typing = null;
        this.typingTimeouts = {};
        this.init(); // Initialize the application
    }

    // init: Bootstraps WebSocket, event listeners, and router
    init() {
        this.setupWS();
        this.setupEventListeners();
        this.router();
    }

    // setupWS: Configures WebSocket lifecycle events and session validation
    setupWS() {
        // On open: Validate existing session
        this.ws.addEventListener("open", () => {
            const session = localStorage.getItem('session_id');
            if (session) {
                const payload = JSON.stringify({
                    type: "session_check",
                    data: { user: { session_id: session } }
                });
                this.sendWS(payload);
            }
        });

        // On message: Route incoming payloads from server
        this.ws.addEventListener("message", (event) => {
            this.BackToFrontPayload(event)
        });

        // On close: Auto-reconnect unless logout
        this.ws.addEventListener("close", (event) => {
            if (this.isLoggingOut) {
                this.isLoggingOut = false;
                return;
            }
            console.warn("WebSocket closed with code:", event.code, "reason:", event.reason);
            setTimeout(() => {
                console.log("Attempting to reconnect...");
                this.reconnectWS();
            }, 1000);
        });

        // On error: Show UI error and log
        this.ws.addEventListener("error", (err) => {
            console.error('WebSocket error:', err);
            renders.Error('Connection to server lost. Please try again.');
        });
    }

    // reconnectWS: Re-establishes WebSocket with full event binding
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

    // BackToFrontPayload: Central dispatcher for all WebSocket messages
    BackToFrontPayload(event) {
        const data = JSON.parse(event.data);
        switch (data.type) {

            // register_result: Handle registration success/failure
            case "register_result":
                if (data.status === "ok") {
                    window.location.hash = 'login';
                    this.userData = data.data.user.email;
                } else {
                    renders.Error(data.error)
                }
                break;

            // session_check_result / login_result: Handle auth state
            case "session_check_result":
            case "login_result":
                if (data.status === "ok") {
                    this.userData = {};
                    localStorage.setItem("session_id", data.data.user.session_id);
                    this.sessionID = data.data.user.session_id;
                    this.userData = data.data.user;
                    this.isAuthenticated = true;
                    this.router()
                } else {
                    localStorage.removeItem("session_id");
                    this.sessionID = null;
                    window.location.hash = 'login';
                    renders.Error(data.error)
                }
                break;

            // users_list: Update online/offline users in sidebar
            case "users_list":
                if (data.status === "ok") {

                    this.userList = data.data;
                    renders.Users(this.userList, this.userData);
                } else { renders.Error(data.error) }
                break;

            // private_message: Handle incoming chat messages
            case "private_message":
                if (data.status === "ok") {
                    const msg = data.data;
                    const isOwn = msg.sender_id === this.userData.user_id;
                    const otherUserId = isOwn ? msg.recipient_id : msg.sender_id;
                    // Always update the last message preview in the sidebar
                    this.updateLastMessage(otherUserId, msg.content, msg.created_at);

                    // If the chat is open, display the message.
                    if (otherUserId === this.activeChatUserId) {
                        this.chatOffsets[this.activeChatUserId]++
                        this.displayChatMessage(msg, isOwn);
                    } else if (!isOwn) { // Otherwise, if it's a message from someone else, show a notification, if clicked it will be fetched on click (openChat())
                        this.showNotification(otherUserId);
                    }
                } else {
                    renders.Error(data.error);
                }
                break;

            // chat_history_result: Render paginated chat history
            case "chat_history_result":
                if (data.status === "ok") {
                    const messages = data.data || []
                    const isInitialLoad = this.chatOffsets[this.activeChatUserId] === 0;
                    if (messages.length === 0) {
                        this.isLoadingMessages = false; // No more messages to load
                        return;
                    }

                    const chatMessagesContainer = document.getElementById('chat-messages');
                    const oldScrollHeight = chatMessagesContainer.scrollHeight;

                    messages.reverse(); // Reverse to prepend in correct order
                    const messagesHTML = messages.map(msg => {
                        const isOwn = msg.sender_id === this.userData.user_id;
                        return renders.ChatMessage(msg, isOwn);
                    }).join('');

                    chatMessagesContainer.insertAdjacentHTML('afterbegin', messagesHTML);
                    this.chatOffsets[this.activeChatUserId] += messages.length;

                    // Maintain scroll position on prepend
                    if (isInitialLoad) {
                        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                    } else {
                        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - oldScrollHeight;
                    }
                    this.isLoadingMessages = false;
                } else {
                    renders.Error(data.error);
                }
                break;
            case "typing_result":
                const typingData = data.data;
                const typerId = typingData.whoIsTyping

                if (typerId !== this.activeChatUserId) return;

                if (typingData.istyping) {

                    // If indicator already exists, do nothing
                    if (document.querySelector('.typing-container')) return;

                    const chatMessagesContainer = document.getElementById('chat-messages');
                    const typingUser = this.userList.find(u => u.id === typingData.whoIsTyping);
                    const typingUserName = typingUser ? typingUser.nickname : '...';


                    const container = document.createElement('div');
                    container.className = 'typing-container';

                    const userTyping = document.createElement('span');
                    userTyping.className = 'typing-text';
                    userTyping.textContent = `${typingUserName} is typing`;

                    const typingIndicator = document.createElement('div');
                    typingIndicator.className = 'typing';

                    container.append(userTyping, typingIndicator);
                    chatMessagesContainer.appendChild(container);

                    const isAtBottom = chatMessagesContainer.scrollHeight - chatMessagesContainer.clientHeight - chatMessagesContainer.scrollTop < 80;
                    if (isAtBottom) chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

                    if (this.typingTimeouts[typerId]) {
                        clearTimeout(this.typingTimeouts[typerId]);
                    }
                    // Set a timeout to auto-remove if no new typing signal comes
                    this.typingTimeouts[typerId] = setTimeout(() => {
                        const typingIndicator = document.querySelector('.typing-container');
                        if (typingIndicator) typingIndicator.remove();
                        delete this.typingTimeouts[typerId];
                    }, 5000);

                } else {
                    const typingIndicator = document.querySelector('.typing-container');
                    if (typingIndicator) typingIndicator.remove();
                    if (this.typingTimeouts[typerId]) {
                        clearTimeout(this.typingTimeouts[typerId]);
                        delete this.typingTimeouts[typerId];
                    }
                }
                break;
        }
    }

    // router: Handles hash-based SPA navigation with auth guards
    async router() {
        const path = window.location.hash.replace('#', '');
        this.currentPage = path;

        renders.Navigation(this.isAuthenticated);
        setups.NavigationEvents();

        // Auth guard: Redirect based on session and page type
        const protectedPages = ['home', 'profile'];
        const authPages = ['login', 'register'];

        if (!localStorage.getItem('session_id') && protectedPages.includes(path) || path === '') {
            window.location.hash = 'login'; return;
        }

        if (localStorage.getItem('session_id') && authPages.includes(path)) {
            window.location.hash = 'home'; return;
        }

        switch (path) {
            // home: Load posts and initialize home events once
            case 'home':
                await renders.Home(this.isAuthenticated, this.userData)
                if (this.isAuthenticated) {
                    this.sendWS(JSON.stringify(
                        { type: "users_list" }
                    ));
                }

                if (!window.__homeEventsInitialized) {
                    setups.HomeEvents(this);
                    window.__homeEventsInitialized = true;
                }
                break;

            // login: Render login form
            case 'login':
                renders.Login(this.userData)
                setups.AuthEvents('login', this);
                break;

            // register: Render registration form
            case 'register':
                renders.Register()
                setups.AuthEvents('register', this);
                break;

            // profile: Show user profile
            case 'profile':
                renders.Profile(this.userData);
                break;

            // logout: Trigger logout flow
            case 'logout':
                this.handleLogout();
                break;

            // default: 404 fallback
            default:
                renders.StatusPage(404)
                break;
        }
    }

    // setupEventListeners: Global DOM and storage event bindings
    setupEventListeners() {
        // hashchange: Re-route on URL hash change
        window.addEventListener('hashchange', () => {
            this.router();
        });

        // storage: Sync session across tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'session_id' && event.newValue) {
                const sessionPayload = JSON.stringify({
                    type: "session_check",
                    data: { user: { session_id: event.newValue } }
                });
                this.sendWS(sessionPayload);
            }
            if (event.key === 'session_id' && (!event.newValue || event.newValue !== this.sessionID && this.sessionID != null)) {                
                this.handleLogout();
            }
        });

        // Global click: Error close, sidebar toggle, chat controls
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

        document.addEventListener('input', (e) => {
            const input = e.target.closest('#message-input');
            if (!input || !this.activeChatUserId) return;

            this.handleTyping()

            clearTimeout(this.typing)

            this.typing = setTimeout(() => {
                this.cancelTyping()
            }, 1500)
        });

        document.addEventListener('keyup', (e) => {
            const input = e.target.closest('#message-input');
            if (!input || !this.activeChatUserId) return;

            if (e.key === 'Enter') {
                this.cancelTyping();
                return;
            }
        });

    }

    // sendWS: Robust WebSocket send with auto-reconnect
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

    // handleLogin: Submit login credentials via WebSocket
    handleLogin() {
        const emailOrNickname = document.getElementById('email_or_nickname').value;
        const password = document.getElementById('password').value;
        const loginPayload = JSON.stringify({
            type: "login",
            data: { user: { email_or_nickname: emailOrNickname, password: password } }
        });
        this.sendWS(loginPayload);
    }

    // handleRegister: Submit registration data via WebSocket
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

    // handleLogout: Clear session, close WS, redirect to login
    handleLogout() {
        this.isAuthenticated = false;
        this.isLoggingOut = true;
        this.userData = {};
        this.sessionID = null;
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

    // handleCreatePost: Submit new post via REST, prepend to list
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
                    throw new Error('Invalid session');
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to create post: ${response.status}`);
            }
            const data = await response.json();

            renders.AddPost(data.post);
            postCreateForm.reset();
        } catch (err) {
            renders.Error(err.message);
            console.error('Post creation error:', err);
        }
    }

    // fetchMorePosts: Infinite scroll – load next batch of posts
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
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to create post: ${response.status}`);
            }
            const data = await response.json();

            renders.PostsList(data.posts);
        } catch (err) {
            renders.Error(err.message);
            console.error('Filter error:', err);
        }
    }

    // handleCreateComment: Submit new comment and prepend to post
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
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to create comment: ${response.status}`);
            }
            const data = await response.json();

            renders.AddComment(data.comment);
            commentForm.reset();
        } catch (err) {
            renders.Error(err.message);
            console.error('Error creating comment:', err);
        }
    }

    // fetchMorePosts: Infinite scroll – load next batch of posts
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
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to fetch post: ${response.status}`);
            }
            const data = await response.json();

            if (!data.posts || data.posts.length === 0 || Object.keys(data).includes('error')) {
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

    // fetchMoreComments: Load more comments on button click
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
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to fetch comment: ${response.status}`);
            }
            const data = await response.json();

            if (!data.comments || data.comments.length === 0 || Object.keys(data).includes('error')) {
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

    // handleReaction: Submit like/dislike and update UI counts
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
                } else if (response.status === 404 || response.status === 403 || response.status === 405) {
                    renders.StatusPage(response.status)
                    return
                }
                const errorText = await response.text();
                throw new Error(errorText.replace(/["{}]/g, '').replace(/^error:\s*/i, '') || `Failed to add reaction: ${response.status}`);
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

    // openChat: Initialize chat with user, load history
    openChat(userId) {

        const user = this.userList.find(u => u.id === userId);
        if (!user) {
            console.error("Cannot open chat: User not found in list.", userId);
            return;
        }

        this.activeChatUserId = userId;
        this.chatOffsets[userId] = 0; // Reset offset 
        this.hideNotification(userId); // Hide notification when chat is opened
        const chatContainer = document.getElementById('active-chat-container');
        chatContainer.style.display = 'block';
        document.getElementById('chat-with-user').textContent = `Chat with ${user.nickname}`;

        // Create a new throttled handler for this chat session
        this.chatScrollHandler = throttle((e) => {
            if (e.target.scrollTop <= 100) {
                this.loadMoreMessages();
            }
        }, 200);

        const chatMessagesContainer = document.getElementById('chat-messages');
        chatMessagesContainer.innerHTML = '';
        chatMessagesContainer.addEventListener('scroll', this.chatScrollHandler);
        this.loadMoreMessages();
    }

    // loadMoreMessages: Request older messages via WebSocket
    loadMoreMessages() {
        if (!this.activeChatUserId || this.isLoadingMessages) return;
        this.isLoadingMessages = true;
        const offset = this.chatOffsets[this.activeChatUserId] || 0;
        this.sendWS(JSON.stringify({
            type: "get_chat_history",
            data: { with_user_id: this.activeChatUserId, limit: 10, offset: offset }
        }));
    }

    // sendMessage: Send private message via WebSocket
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

    // displayChatMessage: Append incoming/outgoing message to active chat 
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

    // updateLastMessage: Update sidebar preview and timestamp
    updateLastMessage(userId, content, timestamp) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        if (userItem) {
            const lastMsgEl = userItem.querySelector('.last-message');
            const lastTimeEl = userItem.querySelector('.last-time');
            if (lastMsgEl) {
                lastMsgEl.textContent = content.length > 25 ? content.substring(0, 25) + '...' : content;
            }
            if (lastTimeEl) {
                lastTimeEl.textContent = new Date(parseInt(timestamp)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
            const userList = userItem?.parentElement; // get the parent list
            if (userList) { userList.prepend(userItem); }
        }
    }

    // showNotification: Display unread dot and move to top
    showNotification(userId) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        const userList = userItem?.parentElement; // get the parent list

        if (userItem) { userItem.querySelector('.notification-dot')?.classList.remove('hidden') }
        if (userList) { userList.prepend(userItem); }
    }

    // hideNotification: Remove unread indicator
    hideNotification(userId) {
        const userItem = document.querySelector(`.user-list-item[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.querySelector('.notification-dot')?.classList.add('hidden');
        }
    }

    // closeChat: Hide chat, clean up scroll handler
    closeChat() {
        clearTimeout(this.typing);

        if (this.activeChatUserId) {
            this.cancelTyping();
            if (this.typingTimeouts[this.activeChatUserId]) {
                clearTimeout(this.typingTimeouts[this.activeChatUserId]);
                delete this.typingTimeouts[this.activeChatUserId];
            }
        }

        this.activeChatUserId = null;
        const chatContainer = document.getElementById('active-chat-container');
        if (chatContainer) chatContainer.style.display = 'none';

        const chatMessagesContainer = document.getElementById('chat-messages');
        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = '';
            chatMessagesContainer.removeEventListener('scroll', this.chatScrollHandler);
        }
    }

    // toggleSideBar: Show/hide chat sidebar and bind Enter key
    toggleSideBar() {
        const textarea = document.getElementById("message-input");
        const sendBtn = document.getElementById("send-message-btn");

        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar) sidebar.classList.toggle('hide');

    }

    handleChatScroll(e) {
        const chatMessagesContainer = e.target;
        if (chatMessagesContainer.scrollTop <= 100) {
            this.loadMoreMessages();
        }
    }

    handleTyping() {
        this.sendWS(JSON.stringify({
            type: 'typing',
            data: {
                isTyping: true,
                whoIsTyping: this.userData.user_id,
                whoIsReceiving: this.activeChatUserId
            }
        }));
    }

    cancelTyping() {
        this.sendWS(JSON.stringify({
            type: 'typing',
            data: {
                isTyping: false,
                whoIsTyping: this.userData.user_id,
                whoIsReceiving: this.activeChatUserId
            }
        }));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.forumApp = new RealTimeForum();
});
