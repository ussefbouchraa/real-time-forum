package posts

import (
	"fmt"
	"strings"
)

func validateNewPost(newPost NewPost) error {
	if newPost.Content == "" {
		return fmt.Errorf("Post content cannot be empty")
	}
	if len(newPost.Content) > 700 {
		return fmt.Errorf("Post content exceeds maximum length of 700 characters")
	}
	if strings.TrimSpace(newPost.Content) == "" {
		return fmt.Errorf("Post content cannot be just whitespace")
	}
	return nil
}
