
import { components } from './components.js';

export const renders = {}

// Render navigation
renders.Navigation = (isAuthenticated) => {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = components.navbar(isAuthenticated);
    }
}

// Render home page
renders.Home = (isAuthenticated, userData = {}) => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.loading();
    try {
        mainContent.innerHTML = components.home(isAuthenticated, userData)

    } catch (error) {
        mainContent.innerHTML = components.renderError('Failed to load posts');
        console.error('Error loading posts:', error);
    }
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

// render error message
renders.Error = (message) => {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = components.errorPopup(message);
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 5000);
    }
}
// Render users in the sidebar
renders.Users = (users, user) => {
    // Filter out the current user so they don't see themselves in the list

    const onlineUsers = users.filter(u => u.id !== user.user_id);
    const offlineUsers = users.filter(u => u.id !== user.user_id)

    const onlineUsersList = document.getElementById('online-users-list');
    if (!onlineUsersList) return;
    onlineUsersList.innerHTML = onlineUsers.map(user => components.userListItem(user, null, true)).join('');
    const offlineUsersList = document.getElementById('conversations-list')
    if (!offlineUsersList) return;
    offlineUsersList.innerHTML = offlineUsers.map(user => components.userListItem(user, null, false)).join('');


    const handleClick = (e) => {
        const item = e.target.closest('.user-list-item') || e.target.closest('.conversation-list-item')
        if (item) {
            const userId = item.getAttribute('data-user-id')
            window.forumApp.openChat(userId)
        }
    }

    onlineUsersList.onclick = handleClick
    offlineUsersList.onclick = handleClick
}

// Render a single chat message
renders.ChatMessage = (message, isOwn) => {
    const senderName = isOwn ? 'You' : message.sender_nickname;
    const timestamp = new Date(message.created_at).toLocaleTimeString();
    return components.chatMessage({ ...message, senderName, timestamp }, isOwn);
};

// Render Status Page
renders.StatusPage = () => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
        mainContent.innerHTML = components.statusPage()

    }
}
