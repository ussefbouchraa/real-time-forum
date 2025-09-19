import { components } from './components.js';

// Render navigation
export function renderNavigation(isAuthenticated, userData, setupNavigationEvents) {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = components.navbar(isAuthenticated, userData);
        setupNavigationEvents();
    }
}

// Render home page
export function renderHome(isAuthenticated, userData, setupHomeEvents) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.loading();

    try {
        mainContent.innerHTML = components.home({
            isAuthenticated,
            userData,
            form_error: ''
        });

        setupHomeEvents();
    } catch (error) {
        mainContent.innerHTML = components.renderError('Failed to load posts');
        console.error('Error loading posts:', error);
    }
}

// Render login page
export function renderLogin(error = '', email = '', setupAuthEvents) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.login(error, email);
    setupAuthEvents('login');
}

// Render register page
export function renderRegister(error = '', formData = {}, setupAuthEvents) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.register(error, formData);
    setupAuthEvents('register');
}

// Render profile page
export function renderProfile(userData) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = components.profile(userData);
}

    // render error message
export function renderError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = components.errorPopup(message);
            setTimeout(() => {
                errorContainer.innerHTML = '';
            }, 5000);
        }
    }