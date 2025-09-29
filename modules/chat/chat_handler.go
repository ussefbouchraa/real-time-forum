package chat

import (
	"net/http"
)

func ChatWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement websocket logic
	w.Write([]byte("WebSocket Endpoint"))
}
