package chat

import (
	"real-time-forum/modules/core"
)

// User: Public user representation for chat UI (includes last message preview)
type User struct {
	ID          string `json:"id"`
	Nickname    string `json:"nickname"`
	LastMsg     string `json:"lastMsg"`
	Created_at  string `json:"created_at"`
	IsOnline    bool   `json:"isOnline"`
	SenderID    string `json:"sender_id"`
	RecipientID string `json:"recipient_id"`
}

// GetUsers fetches all users with last message for currentUserID
func GetUsers(currentUserID string) ([]User, error) {
	users, err := GetOnlyUsers()
	if err != nil {
		return nil, err
	}

	// Enrich each user with last message data
	for i := range users {
		if users[i].ID == currentUserID {
			continue // Skip current user
		}
		last, timeStamp, sender_id, recipient_id := GetLastMessage(currentUserID, users[i].ID)
		users[i].LastMsg = last
		users[i].Created_at = timeStamp
		users[i].SenderID = sender_id
		users[i].RecipientID = recipient_id
	}
	return users, err
}

// GetLastMessage returns the last message between two users
func GetLastMessage(currentUserID, targetUserID string) (string, string, string, string) {
	query := `
		SELECT content, created_at, sender_id, recipient_id
		FROM private_messages
		WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
		ORDER BY created_at DESC LIMIT 1
	`
	var lastMsg, created_at, sender_id, recipient_id string
	err := core.Db.QueryRow(query, currentUserID, targetUserID, targetUserID, currentUserID).Scan(
		&lastMsg, &created_at, &sender_id, &recipient_id)
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
