package chat

// import (
//     "encoding/json"
//     "sync"
//     "github.com/gorilla/websocket"
// )

// type Hub struct {
//     Clients map[string]*websocket.Conn // userID → connection
//     Mu      sync.Mutex
// }

// var hub = Hub{Clients: make(map[string]*websocket.Conn)}

// // when new user connects
// func AddUser(userID string, conn *websocket.Conn) {
//     hub.Mu.Lock()
//     hub.Clients[userID] = conn
//     hub.Mu.Unlock()
//     BroadcastOnlineUsers()
// }

// // when user disconnects
// func RemoveUser(userID string) {
//     hub.Mu.Lock()
//     delete(hub.Clients, userID)
//     hub.Mu.Unlock()
//     BroadcastOnlineUsers()
// }

// // send updated user list to everyone
// func BroadcastOnlineUsers() {
//     hub.Mu.Lock()
//     defer hub.Mu.Unlock()

//     var users []string
//     for id := range hub.Clients {
//         users = append(users, id)
//     }

//     msg, _ := json.Marshal(map[string]interface{}{
//         "type": "users_list",
//         "data": users,
//     })

//     for _, conn := range hub.Clients {
//         conn.WriteMessage(websocket.TextMessage, msg)
//     }
// }
