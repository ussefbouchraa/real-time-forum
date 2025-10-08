package chat

import (
    "real-time-forum/modules/core"
)

// UserStatus holds user info and online status.
type UserStatus struct {
    UserID   string `json:"user_id"`
    Nickname string `json:"nickname"`
    Online   bool   `json:"online"`
}

// GetAllUsersWithStatus returns all users with their online status.
func GetAllUsersWithStatus(hub *Hub) () {
    rows, err := core.Db.Query("SELECT user_id, nickname FROM users")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []UserStatus
    for rows.Next() {
        var userID, nickname string
        if err := rows.Scan(&userID, &nickname); err != nil {
            return nil, err
        }
        users = append(users, UserStatus{
            UserID:   userID,
            Nickname: nickname,
            Online:   hub.IsUserOnline(userID),
        })
    }
    return users, nil
}