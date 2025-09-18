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
		FirstName       string `json:"firstname,omitempty"`
		LastName        string `json:"lastname,omitempty"`
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
	Data   interface{} `json:"data,omitempty"`
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
			type SessionData struct {
				SessionID string `json:"sessionID"`
			}

			parsedSession, err := decodeMessage[SessionData](msg.Data)
			if err != nil {
				writeResponse(conn, "session_response", "error", "", "Invalid data format : session")
				continue
			}
			Nickname, err := GetNickFromSession(parsedSession.SessionID)
			if err != nil {
				writeResponse(conn, "session_response", "error", "", err.Error())
				continue
			}

			// valid session → send success
			var response UserPayload
			response.User.Nickname = Nickname
			writeResponse(conn, "session_response", "ok", response, "")

		case "register":
			parsedSession, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "register_response", "error", nil, "Invalid data format : register")
				continue
			}

			err = RegisterUser(parsedSession)
			var response UserPayload
			status := "ok"
			errMsg := ""
			if err != nil {
				status = "error"
				errMsg = err.Error()
			}
			response.User.Nickname = parsedSession.User.Nickname
			response.User.FirstName = parsedSession.User.FirstName
			response.User.LastName = parsedSession.User.LastName
			response.User.Email = parsedSession.User.Email
			response.User.Age = parsedSession.User.Age
			response.User.Gender = parsedSession.User.Gender

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
				response.User.EmailOrNickname = loginData.User.EmailOrNickname
				status = "error"
				errMsg = err.Error()
			} else {
				sessionID, err := CreateSession(user.User.UserID)
				if err != nil {
					status = "error"
					errMsg = "Cannot create session"
					response.User.EmailOrNickname = loginData.User.EmailOrNickname
				} else {
					response.User.SessionID = sessionID
					response.User.Nickname = loginData.User.Nickname
				}
			}

			writeResponse(conn, "login_response", status, response, errMsg)
		}
	}
}
