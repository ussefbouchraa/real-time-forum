package chat

import (
	"real-time-forum/modules/core"
)

// User: Public user representation for chat UI (includes last message preview)
type User struct {
	ID           string `json:"id"`
	Nickname     string `json:"nickname"`
	LastMsg      string `json:"lastMsg"`
	Created_at   string `json:"created_at"`
	IsOnline     bool   `json:"isOnline"`
	SenderID     string `json:"sender_id"`
	RecipientID string `json:"recipient_id"`
}

// GetUsers: Returns all users with last message preview and online status
func GetUsers() ([]User, error) {
	users, err := GetOnlyUsers()
	if err != nil {
		return nil, err
	}

	// Enrich each user with last message data
	for i := range users {
		last, timeStamp, sender_id, recipient_id := GetLastMessage(users[i].ID)
		users[i].LastMsg = last
		users[i].Created_at = timeStamp
		users[i].SenderID = sender_id
		users[i].RecipientID = recipient_id
	}
	return users, err
}

// GetLastMessage: Fetches most recent message involving user (for preview)
func GetLastMessage(userID string) (string, string, string, string) {
	var lastMsg, created_at, sender_id, recipient_id string

	query := `
		SELECT content, created_at, sender_id, recipient_id
		FROM private_messages
		WHERE sender_id = ? OR recipient_id = ?
		ORDER BY created_at DESC
		LIMIT 1;
	`
	err := core.Db.QueryRow(query, userID, userID).Scan(&lastMsg, &created_at, &sender_id, &recipient_id)
	if err != nil {
		return "", "", "", ""
	}
	return lastMsg, created_at, sender_id, recipient_id
}

// GetOnlyUsers: Core query - fetches all users sorted by nickname
func GetOnlyUsers() ([]User, error) {
	rows, err := core.Db.Query(`
		SELECT user_id, nickname
		FROM users
		ORDER BY nickname ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Nickname); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, nil
}
