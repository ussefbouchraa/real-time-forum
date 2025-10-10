
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
renders.Users = (users) => {

    const onlineUsersList = document.getElementById('online-users-list');
    if (!onlineUsersList) return;
    onlineUsersList.innerHTML = users.map(user => { user.isOnline = true; return components.userListItem(user) }).join('');

    const offlineUsersList = document.getElementById('conversations-list')
    if (!offlineUsersList) return;
    offlineUsersList.innerHTML = users.map(user => { user.isOnline = false; return components.userListItem(user) }).join('');

    // Setup click event for user items to open chat

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

// Render Status Page
renders.StatusPage = () => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
        mainContent.innerHTML = components.statusPage()

    }
}