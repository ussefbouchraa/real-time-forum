package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"real-time-forum/modules/core"

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
	Gender    string `json:"gender"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// cleanup expired sessions
	core.Db.Exec("DELETE FROM sessions WHERE expires_at < ?", time.Now())

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
					"error":  "Invalid data format : session",
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
			response := map[string]interface{}{
				"type":   "session_response",
				"status": "ok",
			}
			response["user"] = map[string]interface{}{
				"userID":   userID,
				"nickname": GetUserNickNameFromSession(data.SessionID),
			}
			conn.WriteJSON(response)
		case "register":
			var data RegisterData
			bytes, _ := json.Marshal(msg.Data)
			err := json.Unmarshal(bytes, &data)
			if err != nil {
				conn.WriteJSON(map[string]interface{}{
					"type":   "register_response",
					"status": "error",
					"error":  "Invalid data format : register",
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
			response["user"] = map[string]interface{}{
				"nickname":  data.Nickname,
				"firstname": data.FirstName,
				"lastname":  data.LastName,
				"email":     data.Email,
				"age":       data.Age,
				"gender":    data.Gender,
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
				response["EmailOrNickname"] = loginData.EmailOrNickname
			} else {
				sessionID, err := CreateSession(user.UserID)
				if err != nil {
					response["status"] = "error"
					response["error"] = "Cannot create session"
					response["EmailOrNickname"] = loginData.EmailOrNickname
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
