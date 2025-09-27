package auth

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

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

func decodeMessage[T any](raw json.RawMessage) (T, error) {
	var data T
	err := json.Unmarshal(raw, &data)
	return data, err
}

type WSResponse struct {
	Type   string      `json:"type"`
	Status string      `json:"status"`
	Error  string      `json:"error,omitempty"`
	Data   interface{} `json:"user,omitempty"`
}

func writeResponse(conn *websocket.Conn, msgType string, status string, data interface{}, errMsg string) {
	err := conn.WriteJSON(WSResponse{
		Type:   msgType,
		Status: status,
		Data:   data,
		Error:  errMsg,
	})
	if err != nil {
		fmt.Println("WriteJSON failed:", err)
	}
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	for {
		var msg ClientWSMessage

		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		switch msg.Type {
		case "user_have_session":
			session, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "session_response", "error", "", "Invalid data format : session")
				continue
			}
			sessionData, err := GetUserFromSessionID(session.User.SessionID)
			if err != nil {
				writeResponse(conn, "session_response", "error", "", err.Error())
				continue
			}

			var response UserPayload
			response.User.SessionID = sessionData.User.SessionID
			response.User.UserID = sessionData.User.UserID
			response.User.Nickname = sessionData.User.Nickname
			response.User.FirstName = sessionData.User.FirstName
			response.User.LastName = sessionData.User.LastName
			response.User.Email = sessionData.User.Email
			response.User.Age = sessionData.User.Age
			response.User.Gender = sessionData.User.Gender
			writeResponse(conn, "session_response", "ok", response, "")

		case "register":
			registerData, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "register_response", "error", nil, "Invalid data format : register")
				continue
			}

			err = RegisterUser(registerData)
			var response UserPayload
			status := "ok"
			errMsg := ""
			if err != nil {
				status = "error"
				errMsg = err.Error()
			}

			writeResponse(conn, "register_response", status, response, errMsg)
		case "login":

			loginData, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "login_response", "error", nil, "Invalid data format")
				continue
			}

			user, err := LoginUser(loginData.User.EmailOrNickname, loginData.User.Password)
			status := "ok"
			errMsg := ""
			var response UserPayload

			if err != nil {
				response.User.EmailOrNickname = user.User.EmailOrNickname
				status = "error"
				errMsg = err.Error()
			} else {
				sessionID, err := CreateSession(user.User.UserID)
				if err != nil {
					status = "error"
					errMsg = "Cannot create session"
					response.User.EmailOrNickname = user.User.EmailOrNickname
				} else {
					response.User.SessionID = sessionID
					response.User.UserID = user.User.UserID
					response.User.Nickname = user.User.Nickname
					response.User.FirstName = user.User.FirstName
					response.User.LastName = user.User.LastName
					response.User.Email = user.User.Email
					response.User.Age = user.User.Age
					response.User.Gender = user.User.Gender

				}
			}
			writeResponse(conn, "login_response", status, response, errMsg)

		}
	}
}
