// Simple forum app
document.addEventListener('DOMContentLoaded', function() {
    // Show home page by default
    showPage('home');
    
    // Handle navigation
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-page]')) {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            showPage(page);
        }
    });
    
    // Handle form submissions
    document.addEventListener('submit', function(e) {
        if (e.target.matches('#loginForm')) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (email && password) {
                alert('Login successful! (This is just a demo)');
                showPage('home');
            } else {
                showPage('login', 'Please enter email and password');
            }
        }
        
        if (e.target.matches('#registerForm')) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (username && email && password) {
                alert('Registration successful! (This is just a demo)');
                showPage('home');
            } else {
                showPage('register', 'Please fill all fields');
            }
        }
    });
});

// Show a specific page
function showPage(page, error = '') {
    const app = document.getElementById('app');
    
    if (Components[page]) {
        app.innerHTML = Components[page](error);
    } else {
        app.innerHTML = Components.error(404, 'Page not found');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}