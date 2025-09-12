package auth

import (
	"encoding/json"
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
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type RegisterData struct {
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
		}
	}
}
