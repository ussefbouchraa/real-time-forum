package chat

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ChatMessage struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Message string `json:"message"`
}

type ChatWSResponse struct {
    Type    string      `json:"type"`
    Status  string      `json:"status"`
    Message ChatMessage `json:"message,omitempty"`
    Error   string      `json:"error,omitempty"`
}


func ChatWebSocketHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
        return
    }
    defer conn.Close()

    for {
        _, msgBytes, err := conn.ReadMessage()
        if err != nil {
            break
        }

        var chatMsg ChatMessage
        // Unmarshal the raw bytes directly into ChatMessage
        if err := json.Unmarshal(msgBytes, &chatMsg); err != nil {
            conn.WriteJSON(ChatWSResponse{
                Type:   "chat_message",
                Status: "error",
                Error:  "Invalid chat message format",
            })
            continue
        }

        // Echo the message back to the sender
        conn.WriteJSON(ChatWSResponse{
            Type:    "chat_message",
            Status:  "ok",
            Message: chatMsg,
        })
    }
}
