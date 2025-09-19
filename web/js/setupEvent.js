export const setups = {}


    // Setup navigation events
    setups.NavigationEvents = () =>  {
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
    setups.HomeEvents = () => {
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
                this.handleCreatePost(e.target);  
            });
        }

        // Handle filtering
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // this.handleFilterPosts(e.target);
            });
        }

        // Handle post reactions
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
                const commentId = e.target.closest('[data-comment-id]')?.getAttribute('data-comment-id');
                const type = e.target.getAttribute('data-type');

                if (postId) {
                    // this.handlePostReaction(postId, type);
                } else if (commentId) {
                    // this.handleCommentReaction(commentId, type);
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
                // this.handleCreateComment(postId, e.target);
            });
        });
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

    // Setup private messages events
    setups.PrivateMessagesEvents = () => {
        // User list items click event
        document.querySelectorAll('.user-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const userId = item.getAttribute('data-user-id');
                // this.openChat(userId);
            });
        });
    }

