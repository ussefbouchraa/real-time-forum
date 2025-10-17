package chat

import (
	"encoding/json"
	"fmt"
	"time"

	"real-time-forum/modules/core"

	"github.com/google/uuid"
)

// PrivateMessagePayload defines the structure for sending and receiving private messages.
type PrivateMessagePayload struct {
	RecipientID    string `json:"recipient_id"`
	Content        string `json:"content"`
	SenderID       string `json:"sender_id,omitempty"`
	SenderNickname string `json:"sender_nickname,omitempty"`
	CreatedAt      string `json:"created_at,omitempty"`
}

// ProcessPrivateMessage decodes, savmessage.timestamp)es, and prepares a private message for delivery.
func ProcessPrivateMessage(senderID string, rawPayload json.RawMessage) (*PrivateMessagePayload, error) {
	var pm PrivateMessagePayload
	if err := json.Unmarshal(rawPayload, &pm); err != nil {
		fmt.Printf("Error decoding private message: %v\n", err)
		return nil, err
	}

	// Fetch sender's nickname
	senderNickname, err := GetNicknameByUserID(senderID)
	if err != nil {
		fmt.Printf("Could not get nickname for sender %s: %v\n", senderID, err)
		senderNickname = "Unknown"
	}

	pm.SenderID = senderID
	pm.SenderNickname = senderNickname
	pm.CreatedAt = time.Now().Format(time.RFC3339)

	
	// Save the message to the database
	messageID := uuid.New().String()
	_, err = core.Db.Exec(
		"INSERT INTO private_messages (message_id, sender_id, recipient_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
		messageID, pm.SenderID, pm.RecipientID, pm.Content, pm.CreatedAt,
	)
	if err != nil {
		fmt.Printf("Error saving private message to DB: %v\n", err)
		return nil, err
	}
	return &pm, nil
}

// GetNicknameByUserID retrieves a user's nickname from their user ID.
func GetNicknameByUserID(userID string) (string, error) {
	var nickname string
	err := core.Db.QueryRow("SELECT nickname FROM users WHERE user_id = ?", userID).Scan(&nickname)
	if err != nil {
		return "", err
	}
	return nickname, nil
}

// GetChatHistory retrieves the message history between two users.
func GetChatHistory(user1ID, user2ID string) ([]PrivateMessagePayload, error) {
	query := `
        SELECT m.sender_id, u.nickname, m.content, m.created_at
        FROM private_messages m
        JOIN users u ON u.user_id = m.sender_id
        WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
        ORDER BY m.created_at ASC
    `
	rows, err := core.Db.Query(query, user1ID, user2ID, user2ID, user1ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []PrivateMessagePayload
	for rows.Next() {
		var msg PrivateMessagePayload
		if err := rows.Scan(&msg.SenderID, &msg.SenderNickname, &msg.Content, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}
