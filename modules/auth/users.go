package auth

import (
	"real-time-forum/modules/core"
)

type User struct {
    ID       int    `json:"id"`
    Nickname string `json:"nickname"`
    IsOnline bool   `json:"isOnline"`
}

var i = 0
func GetAllUsers() ([]User, error) {
    rows, err := core.Db.Query("SELECT nickname FROM users ORDER BY nickname ASC")
    if err != nil {
		return nil, err
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan( &u.Nickname); err != nil {
            return nil, err
        }
        i++ ; u.ID = i;
        u.IsOnline = false
        users = append(users, u)
    }
    return users, nil
}