package auth

import (
	"real-time-forum/modules/core"
)

type User struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	LastMsg  string `json:"lastMsg"`
	IsOnline bool   `json:"isOnline"`
}

// GetUsers fetches all users and fills LastMsg
func GetUsers() ( []User, error) {
	users, err := GetOnlyUsers()
	if err != nil {
		return nil, err
	}
	for i := range users {
		last := GetLastMessage(users[i].ID)
		users[i].LastMsg = last          
	}
	return users, err
}


// GetLastMessage returns the latest message content for a user
func GetLastMessage(userID string) string {
	var lastMsg string

	query := `
		SELECT content
		FROM private_messages
		WHERE sender_id = ? OR recipient_id = ?
		ORDER BY created_at DESC
		LIMIT 1;
	`
	err := core.Db.QueryRow(query, userID, userID).Scan(&lastMsg)
	if err != nil {
		return ""
	}
	return lastMsg
}

// GetOnlyUsers fetches all users from the database
func GetOnlyUsers() ([]User, error) {
	rows, err := core.Db.Query(`
		SELECT u.user_id, u.nickname
		FROM users u
		LEFT JOIN private_messages m 
		ON u.user_id = m.sender_id OR u.user_id = m.recipient_id
		GROUP BY u.user_id
		ORDER BY MAX(m.created_at) DESC, u.nickname ASC
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

