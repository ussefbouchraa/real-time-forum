package auth

import (
	"encoding/json"
	"net/http"
	"time"

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
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type RegisterData struct {
	UserID    string `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Nickname  string `json:"nickname"`
	Age       int    `json:"age"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// cleanup expired sessions
	Db.Exec("DELETE FROM sessions WHERE expires_at < ?", time.Now())

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
			var data struct {
				SessionID string `json:"sessionID"`
			}
			bytes, _ := json.Marshal(msg.Data)
			err := json.Unmarshal(bytes, &data)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type":   "session_response",
					"status": "error",
					"error":  "Invalid data format",
				})
				continue
			}

			userID, err := GetUserIDFromSession(data.SessionID)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type":   "session_response",
					"status": "error",
					"error":  err.Error(),
				})
				continue
			}

			// valid session → send success
			conn.WriteJSON(map[string]interface{}{
				"type":     "session_response",
				"status":   "ok",
				"userID":   userID,
				"nickname": GetUserNickNameFromSession(data.SessionID),
			})
		case "register":
			var data RegisterData
			bytes, _ := json.Marshal(msg.Data)
			err := json.Unmarshal(bytes, &data)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type":   "register_response",
					"status": "error",
					"error":  "Invalid data format",
				})
				continue
			}

			err = RegisterUser(data)
			status := "ok"
			if err != nil {
				status = "error"
			}

			response := map[string]interface{}{
				"type":   "register_response",
				"status": status,
			}
			if err != nil {
				response["error"] = err.Error()
			}
			conn.WriteJSON(response)

		case "login":
			var loginData struct {
				EmailOrNickname string `json:"email_or_nickname"`
				Password        string `json:"password"`
			}

			bytes, _ := json.Marshal(msg.Data)
			err := json.Unmarshal(bytes, &loginData)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type":   "login_response",
					"status": "error",
					"error":  "Invalid data format",
				})
				continue
			}

			user, err := LoginUser(loginData.EmailOrNickname, loginData.Password)
			status := "ok"
			response := map[string]interface{}{
				"type":   "login_response",
				"status": status,
			}
			if err != nil {
				status = "error"
				response["status"] = status
				response["error"] = err.Error()
			} else {
				sessionID, err := CreateSession(user.UserID)
				if err != nil {
					response["status"] = "error"
					response["error"] = "Cannot create session"
				} else {
					response["sessionID"] = sessionID
					response["user"] = map[string]interface{}{
						"user_id":  user.UserID,
						"nickname": user.Nickname,
					}
				}
			}

			conn.WriteJSON(response)
		}
	}
}
