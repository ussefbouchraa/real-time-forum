
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
renders.Register = (error = '', formData = {}) => {
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