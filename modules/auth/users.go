package auth

import (
	"real-time-forum/modules/core"
)

type User struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	IsOnline bool   `json:"isOnline"`
}

func GetAllUsers() ([]User, error) {
	rows, err := core.Db.Query("SELECT user_id, nickname FROM users ORDER BY nickname ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Nickname); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}
