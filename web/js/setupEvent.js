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

    // handle spa form submissions
    // Handle post creation form submission
    document.addEventListener("submit", (e) => {
        if (e.target && e.target.id === "create-post-form") {
            e.preventDefault();
            app.handleCreatePost(e.target);
            // Handle filter form submission
        } else if (e.target && e.target.id === "filter-form") {
            e.preventDefault();
            app.handleFilterPosts(e.target);
            // Handle comment submission for all posts
        } else if (e.target && e.target.classList.contains("create-comment-form")) {
            e.preventDefault();
            const postId = e.target.getAttribute("data-post-id");
            app.handleCreateComment(postId, e.target);
        }
    });
    let isFetchingComments = false;
    document.addEventListener("click", (e) => {
        // Toggle comments visibility

        if (e.target && e.target.closest(".toggle-comments")) {

            const postElement = e.target.closest('.forum-post');
            const commentSection = postElement.querySelector('.comment-section');
            const commentsFoter = postElement.querySelector('.comments-footer');

            if (commentSection) {
                commentSection.style.display = commentSection.style.display === 'block' ? 'none' : 'block';
                if (postElement.querySelectorAll('.comment-section .comment').length === 0) {
                    return;
                }
                commentsFoter.style.display = commentsFoter.style.display === 'block' ? 'none' : 'block';
            }
        } else if (e.target && e.target.closest(".load-more-comments")) {
            // fetch more posts on scroll
            const postId = e.target.closest('[data-post-id]')?.getAttribute('data-post-id');
            if (isFetchingComments) return;
            isFetchingComments = true;

            (async () => {
                await app.fetchMoreComments(postId);
                setTimeout(() => {
                    isFetchingComments = false;
                }, 1000)
            })();
        }
        
        // Handle reaction buttons
        const reactionBtn = e.target.closest('.reaction-btn');
        if (reactionBtn) {
            const postId = reactionBtn.getAttribute('data-post-id') || '';
            const commentId = reactionBtn.getAttribute('data-comment-id') || '';
            const reactionType = parseInt(reactionBtn.getAttribute('data-type'), 10);
            if ((postId || commentId) && !postId !== !commentId && !isNaN(reactionType)) {
                app.handleReaction({ postId, commentId, reactionType });
            } else {
                console.error('Invalid reaction data:', { postId, commentId, reactionType });
                renders.Error('Invalid reaction. Please try again.');
            }
        }
    });

    // setting toggle buttons :
    // Toggle between filter and create sections
    document.querySelectorAll('.toggle-buttons label').forEach(label => {
        label.addEventListener('click', (e) => {
            const target = e.target.getAttribute('for');
            if (target === 'show-create') {
                console.log("ASD");
                document.querySelector('.create-section').style.display = 'block';
                document.querySelector('.filter-section').style.display = 'none';
            }
            if (target === 'show-filter') {
                document.querySelector('.filter-section').style.display = 'block';
                document.querySelector('.create-section').style.display = 'none';
            } 
        });
    });
    // fetch more posts on scroll
    let isFetchingPosts = false;
    window.addEventListener('scroll', () => {
        if (isFetchingPosts) return;

        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 80;
        if (nearBottom) {

            isFetchingPosts = true;

            (async () => {
                const postLoader = document.querySelector(`.posts-loader`)
                const loadingSpinner = document.querySelector(`.loading-spinner`)
                if (postLoader) postLoader.style.display = "block";
                if (loadingSpinner) loadingSpinner.style.display = "block";

                await app.fetchMorePosts();
                setTimeout(() => {
                    isFetchingPosts = false;
                }, 2000)
            })();
        }
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


