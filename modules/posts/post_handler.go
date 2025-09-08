package posts

import (
	"net/http"
)

func PostsHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement posts logic
	w.Write([]byte("Posts Page"))
}
