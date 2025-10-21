export const setups = {}


// Setup navigation events
setups.NavigationEvents = () => {
    // Handle navigation links
    document.querySelectorAll('a[data-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = e.target.getAttribute('href').replace('#', '');
            window.location.hash = path;
        });
    });
}

// Setup home page events
setups.HomeEvents = (app) => {
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

    // Handle post creation
    const createForm = document.getElementById('create-post-form');
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // app.handleCreatePost(e.target); // TODO: Uncomment when handleCreatePost is implemented
        });
    }

    // Handle filtering
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // app.handleFilterPosts(e.target); // TODO: Uncomment when implemented
        });
    }

    // Handle post reactions
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
            const commentId = e.target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
            const type = e.target.getAttribute('data-type');

            if (postId) {
                // app.handlePostReaction(postId, type); // TODO: Uncomment when implemented
            } else if (commentId) {
                // app.handleCommentReaction(commentId, type); // TODO: Uncomment when implemented
            }
        });
    });

    // Toggle comments visibility
    document.querySelectorAll('.toggle-comments').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postElement = e.target.closest('.forum-post');
            const commentSection = postElement.querySelector('.comment-section');
            commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';

        });
    });

    // Handle comment submission
    document.querySelectorAll('.create-comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const postId = e.target.getAttribute('data-post-id');
            // app.handleCreateComment(postId, e.target); // TODO: Uncomment when implemented
        });
    });

    const chatMessagesContainer = document.getElementById('chat-messages');

    if (chatMessagesContainer) {
        function throttle(func, limit) {
            let inThrottle;
            return function () {
                if (!inThrottle) {
                    func.apply(this, arguments);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
        chatMessagesContainer.addEventListener('scroll', throttle(app.handleChatScroll.bind(app), 180));
    }

}

// Setup authentication events
setups.AuthEvents = (formType, app) => {
    const form = document.getElementById(`${formType}-form`);
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (formType === 'login') {
                app.handleLogin();
            } else if (formType === 'register') {
                app.handleRegister();
            }
        });
    }
}