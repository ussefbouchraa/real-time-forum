package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"real-time-forum/modules/chat"

	"github.com/gorilla/websocket"
)

// ClientWSMessage: Incoming message wrapper - all client messages must have type + raw data
type ClientWSMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// UserPayload: Structured user data for auth-related WS messages (register, login, session)
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

type TypingInProgressPayload struct {
	IsTyping       bool   `json:"istyping,omitempty"`
	WhoIsTyping    string `json:"whoIsTyping,omitempty"`
	WhoIsReceiving string `json:"whoIsReceiving,omitempty"`
}

// WSResponse: Standardized response format sent back to clients
type WSResponse struct {
	Type   string      `json:"type"`
	Status string      `json:"status"`
	Error  string      `json:"error,omitempty"`
	Data   interface{} `json:"data,omitempty"`
}

// clients: Map[userID] -> list of active WebSocket connections (supports multiple tabs)
var (
	clients = make(map[string][]*websocket.Conn)
	mutex   = &sync.RWMutex{}
)

// upgrader: Configures WebSocket handshake - allows all origins in dev
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Restrict in production
	},
}

// decodeMessage: Generic helper to unmarshal raw JSON into typed struct
func decodeMessage[T any](raw json.RawMessage) (T, error) {
	var data T
	err := json.Unmarshal(raw, &data)
	return data, err
}

// writeResponse: Sends structured JSON response over WebSocket
func writeResponse(conn *websocket.Conn, msgType string, status string, data interface{}, errMsg string) {
	response := WSResponse{
		Type:   msgType,
		Status: status,
		Data:   data,
		Error:  errMsg,
	}
	err := conn.WriteJSON(response)
	if err != nil {
		fmt.Printf("[WS] WriteJSON FAILED: %v (conn closed? %v)\n", err, conn == nil)
	}
}

// WebSocketHandler: Main entry - upgrades HTTP to WS and handles full client lifecycle
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// Enforce GET method
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	var currentUserID string

	// Cleanup: Remove connection from clients map on disconnect
	defer func() {
		mutex.Lock()
		if currentUserID != "" {
			conns := clients[currentUserID]
			for i, c := range conns {
				if c == conn {
					clients[currentUserID] = append(conns[:i], conns[i+1:]...)
					break
				}
			}

			if len(clients[currentUserID]) == 0 {
				delete(clients, currentUserID)
			}
		}
		mutex.Unlock()
		broadcastUsersList()
	}()

	// Main message loop - reads and dispatches client messages
	for {
		var msg ClientWSMessage

		err := conn.ReadJSON(&msg)
		if err != nil {
			break // Client disconnected or error
		}
		switch msg.Type {
		case "session_check":
			// Validate session token and restore user context
			session, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "session_check_result", "error", "", "Invalid session data format")
				continue
			}
			sessionData, err := GetUserFromSessionID(session.User.SessionID)
			if err != nil {
				writeResponse(conn, "session_check_result", "error", nil, "Session invalid or expired. Please log in again")
				continue
			}

			// Rebuild user payload and register connection
			var response UserPayload
			response.User.SessionID = sessionData.User.SessionID
			response.User.UserID = sessionData.User.UserID
			response.User.Nickname = sessionData.User.Nickname
			response.User.FirstName = sessionData.User.FirstName
			response.User.LastName = sessionData.User.LastName
			response.User.Email = sessionData.User.Email
			response.User.Age = sessionData.User.Age
			response.User.Gender = sessionData.User.Gender
			currentUserID = sessionData.User.UserID
			mutex.Lock()
			clients[currentUserID] = append(clients[currentUserID], conn)
			mutex.Unlock()
			broadcastUsersList()

			writeResponse(conn, "session_check_result", "ok", response, "")

		case "register":
			// Handle new user registration
			registerData, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "register_result", "error", nil, "Invalid register data format")
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

			response.User.Email = registerData.User.Email
			writeResponse(conn, "register_result", status, response, errMsg)
		case "login":
			// Authenticate user and create session
			loginData, err := decodeMessage[UserPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "login_result", "error", nil, "Invalid login data format")
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
					// Success: send full user + session
					response.User.SessionID = sessionID
					response.User.UserID = user.User.UserID
					response.User.Nickname = user.User.Nickname
					response.User.FirstName = user.User.FirstName
					response.User.LastName = user.User.LastName
					response.User.Email = user.User.Email
					response.User.Age = user.User.Age
					response.User.Gender = user.User.Gender

					currentUserID = user.User.UserID
					mutex.Lock()
					clients[currentUserID] = append(clients[currentUserID], conn)
					mutex.Unlock()
					broadcastUsersList()
				}
			}
			writeResponse(conn, "login_result", status, response, errMsg)
		case "private_message":
			// Route private message through chat module
			if currentUserID == "" {
				writeResponse(conn, "private_message", "error", nil, "You must be logged in to send messages")
				continue
			}

			preparedMsg, err := chat.ProcessPrivateMessage(currentUserID, msg.Data)
			if err != nil {
				writeResponse(conn, "private_message", "error", nil, fmt.Sprintf("Message could not be sent: %v", err))
				continue
			}

			// Deliver to recipient
			mutex.RLock()
			if recipientConns, ok := clients[preparedMsg.RecipientID]; ok {
				for _, c := range recipientConns {
					writeResponse(c, "private_message", "ok", preparedMsg, "")
				}
			}
			mutex.RUnlock()

			// Echo to sender (all tabs)
			mutex.RLock()
			if senderConns, ok := clients[currentUserID]; ok {
				for _, c := range senderConns {
					writeResponse(c, "private_message", "ok", preparedMsg, "")
				}
			}
			mutex.RUnlock()
		case "get_chat_history":
			// Fetch paginated chat history between two users
			if currentUserID == "" {
				writeResponse(conn, "chat_history_result", "error", nil, "You must be logged in to view chat history")
				continue
			}
			var payload struct {
				WithUserID string `json:"with_user_id"`
				Limit      int    `json:"limit"`
				Offset     int    `json:"offset"`
			}
			if err := json.Unmarshal(msg.Data, &payload); err != nil {
				writeResponse(conn, "chat_history_result", "error", nil, "Failed to fetch chat history: invalid request")
				continue
			}
			if payload.Limit == 0 {
				payload.Limit = 10
			} // Default to 10
			history, err := chat.GetChatHistory(currentUserID, payload.WithUserID, payload.Limit, payload.Offset)
			if err != nil {
				writeResponse(conn, "chat_history_result", "error", nil, "Unable to retrieve chat history. Please try again")
				continue
			}
			writeResponse(conn, "chat_history_result", "ok", history, "")
		case "users_list":
			if currentUserID == "" {
				continue
			}
			sendUsersList(conn, currentUserID)
		case "typing":
			var S TypingInProgressPayload
			S, err := decodeMessage[TypingInProgressPayload](msg.Data)
			if err != nil {
				writeResponse(conn, "typing_result", "error", nil, "Invalid typingInProgress data")
				continue
			}
			// Deliver to recipient
			mutex.RLock()
			if recipientConns, ok := clients[S.WhoIsReceiving]; ok {
				for _, c := range recipientConns {
					writeResponse(c, "typing_result", "ok", nil, "")
				}
			}
			mutex.RUnlock()
		}
	}
}

func sendUsersList(conn *websocket.Conn, userID string) {
	users, _ := chat.GetUsers(userID)
	mutex.RLock()
	for i := range users {
		if _, ok := clients[users[i].ID]; ok {
			users[i].IsOnline = true
		}
	}
	mutex.RUnlock()
	writeResponse(conn, "users_list", "ok", users, "")
}

func broadcastUsersList() {
	mutex.RLock()
	defer mutex.RUnlock()
	for userID, conns := range clients {
		users, _ := chat.GetUsers(userID)
		for i := range users {
			if _, ok := clients[users[i].ID]; ok {
				users[i].IsOnline = true
			}
		}
		for _, conn := range conns {
			writeResponse(conn, "users_list", "ok", users, "")
		}
	}
}
