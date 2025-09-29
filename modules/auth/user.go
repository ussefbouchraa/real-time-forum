package auth

import "encoding/json"

type ClientWSMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type UserPayload struct {
	User struct {
		EmailOrNickname string `json:"email_or_nickname,omitempty"`
		SessionID       string `json:"session_id,omitempty"`
		UserID          string `json:"user_id,omitempty"`
		Nickname        string `json:"nickname,omitempty"`
		FirstName       string `json:"first_name,omitempty"`
		LastName        string `json:"last_name,omitempty"`
		Email           string `json:"email,omitempty"`
		Age             int    `json:"age,omitempty"`
		Gender          string `json:"gender,omitempty"`
		Password        string `json:"password,omitempty"`
	} `json:"user"`
}

type WSResponse struct {
	Type   string      `json:"type"`
	Status string      `json:"status"`
	Error  string      `json:"error,omitempty"`
	Data   interface{} `json:"user,omitempty"`
}

