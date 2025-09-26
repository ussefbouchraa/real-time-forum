package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"real-time-forum/modules/core"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func RegisterUser(data UserPayload) error {
	data.User.FirstName = strings.TrimSpace(data.User.FirstName)
	data.User.LastName = strings.TrimSpace(data.User.LastName)
	data.User.Nickname = strings.TrimSpace(data.User.Nickname)
	if len(strings.TrimSpace(data.User.Password)) != len(data.User.Password) {
		return fmt.Errorf("your password can't start or end with a blank space")
	}

	if err := AllFieldAreRequiredCheck(data); err != nil {
		return err
	}

	if err := LengthCheck(data); err != nil {
		return err
	}

	if err := IsNicknameOrEmailTaken(data); err != nil {
		return err
	}

	if err := BasicChecks(data); err != nil {
		return err
	}

	if err := ValidateNamesAndNickname(data); err != nil {
		return err
	}

	if err := IsValidEmail(data.User.Email); err != nil {
		return err
	}

	// hash password
	hashedPwd, err := HashPassword(data.User.Password)
	if err != nil {
		return err
	}

	// generate uuid
	userID := uuid.New().String()
	data.User.UserID = userID

	_, err = core.Db.Exec(`INSERT INTO users (user_id, first_name, last_name, nickname, age, gender, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, data.User.FirstName, data.User.LastName, data.User.Nickname, data.User.Age, data.User.Gender, data.User.Email, hashedPwd)
	if err != nil {
		return err
	}
	return nil
}

func ValidateNamesAndNickname(data UserPayload) error {
	cmp := 0

	for _, r := range data.User.FirstName {
		if !unicode.IsLetter(r) {
			return fmt.Errorf("first name can only contain letters")
		} else if unicode.IsSpace(r) {
			return fmt.Errorf("middle spaces are not allowed in the first name")
		}
	}

	for _, r := range data.User.LastName {
		if !unicode.IsLetter(r) {
			return fmt.Errorf("last name can only contain letters")
		} else if unicode.IsSpace(r) {
			return fmt.Errorf("middle spaces are not allowed in the last name")
		}
	}

	for _, r := range data.User.Nickname {
		if unicode.IsSpace(r) {
			return fmt.Errorf("your nickname must not contain middle spaces")
		}
		if unicode.IsLetter(r) {
			cmp++
		}
	}
	if cmp < 4 {
		return fmt.Errorf("your nickname must have at least 4 letters")
	}
	return nil
}

func IsNicknameOrEmailTaken(data UserPayload) error {
	var existing string

	err := core.Db.QueryRow("SELECT email FROM users WHERE email = ?", data.User.Email).Scan(&existing)
	if err == nil {
		return fmt.Errorf("email is already taken")
	}
	err = core.Db.QueryRow("SELECT nickname FROM users WHERE nickname = ?", data.User.Nickname).Scan(&existing)
	if err == nil {
		return fmt.Errorf("nickname is already taken")
	}

	return nil
}

func BasicChecks(data UserPayload) error {
	if len(data.User.FirstName) < 2 || len(data.User.LastName) < 2 {
		return fmt.Errorf("are you sure you entered your name correctly?")
	}

	if data.User.Age <= 0 || data.User.Age > 120 {
		return fmt.Errorf("are you sure you entered your age correctly?")
	}
	return nil
}

func AllFieldAreRequiredCheck(data UserPayload) error {
	if data.User.FirstName == "" {
		return fmt.Errorf("first name is required")
	}
	if data.User.LastName == "" {
		return fmt.Errorf("last name is required")
	}
	if data.User.Nickname == "" {
		return fmt.Errorf("nickname is required")
	}
	if data.User.Email == "" {
		return fmt.Errorf("email is required")
	}
	if data.User.Password == "" {
		return fmt.Errorf("password is required")
	}
	return nil
}

func LengthCheck(data UserPayload) error {
	if len(data.User.Nickname) < 3 || len(data.User.Nickname) > 20 {
		return fmt.Errorf("nickname must be 3-20 characters")
	}

	if len(data.User.Password) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}
	return nil
}

func IsValidEmail(email string) error {
	regex := `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
	re := regexp.MustCompile(regex)

	if !re.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

func HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

func LoginUser(emailOrNickname, password string) (UserPayload, error) {
	var user UserPayload
	var hashedPwd string

	err := core.Db.QueryRow(
		`SELECT user_id, first_name, last_name, nickname, age, gender, email, password 
		 FROM users 
		 WHERE email = ? OR nickname = ?`,
		emailOrNickname, emailOrNickname,
	).Scan(
		&user.User.UserID,
		&user.User.FirstName,
		&user.User.LastName,
		&user.User.Nickname,
		&user.User.Age,
		&user.User.Gender,
		&user.User.Email,
		&hashedPwd,
	)
	if err != nil {
		// no need to specifie the error (senstitive data)
		return UserPayload{}, fmt.Errorf("invalid email/nickname or password")
	}

	if !CheckPasswordHash(password, hashedPwd) {
		// no need to specifie the error (senstitive data)
		return UserPayload{}, fmt.Errorf("invalid email/nickname or password")
	}

	return user, nil
}

func CreateSession(userID string) (string, error) {
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)

	// Delete any existing sessions for this user
	_, err := core.Db.Exec("DELETE FROM sessions WHERE user_id = ?", userID)
	if err != nil {
		return "", fmt.Errorf("failed to clear existing sessions: %v", err)
	}

	// Insert new session
	_, err = core.Db.Exec(
		"INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, userID, expiresAt,
	)
	if err != nil {
		return "", err
	}

	return sessionID, nil
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GetUserFromSessionID(sessionID string) (UserPayload, error) {
	var user UserPayload
	var expiresAt time.Time

	query := `
        SELECT u.user_id, u.nickname, u.first_name, u.last_name, 
               u.email, u.age, u.gender, s.expires_at
        FROM sessions s
        JOIN users u ON u.user_id = s.user_id
        WHERE s.session_id = ?
    `

	err := core.Db.QueryRow(query, sessionID).
		Scan(&user.User.UserID, &user.User.Nickname, &user.User.FirstName,
			&user.User.LastName, &user.User.Email, &user.User.Age,
			&user.User.Gender, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return UserPayload{}, errors.New("session not found")
		}
		return UserPayload{}, err
	}

	if time.Now().After(expiresAt) {
		_, deleteErr := core.Db.Exec("DELETE FROM sessions WHERE session_id = ?", sessionID)
		if deleteErr != nil {
			fmt.Printf("Warning: Failed to delete expired session %s: %v\n", sessionID, deleteErr)
		}
		return UserPayload{}, errors.New("session expired")
	}

	user.User.SessionID = sessionID
	return user, nil
}

// func getUserData(SessionID string ) {

// var Data UserPayload

// 	err := core.Db.QueryRow(
// 		`SELECT user_id, first_name, last_name, nickname, age, gender, email, password
// 		 FROM users
// 		 WHERE email = ? OR nickname = ?`,
// 		emailOrNickname, emailOrNickname,
// 	).Scan(
// 		&Data.User.UserID,
// 		&Data.User.FirstName,
// 		&Data.User.LastName,
// 		&Data.User.Nickname,
// 		&Data.User.Age,
// 		&Data.User.Gender,
// 		&Data.User.Email,
// 		&hashedPwd,
// 	)
// 	if err != nil {
// 		return UserPayload{}, err.error()
// 	}

// 	return Data, nil
// }
