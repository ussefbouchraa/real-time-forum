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

var Db = core.Db

func RegisterUser(data RegisterData) error {
	data.FirstName = strings.TrimSpace(data.FirstName)
	data.LastName = strings.TrimSpace(data.LastName)
	data.Nickname = strings.TrimSpace(data.Nickname)
	if len(strings.TrimSpace(data.Password)) != len(data.Password) {
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

	if err := IsValidEmail(data.Email); err != nil {
		return err
	}

	// hash password
	hashedPwd, err := HashPassword(data.Password)
	if err != nil {
		return err
	}

	// generate uuid
	userID := uuid.New().String()
	data.UserID = userID

	_, err = Db.Exec(`INSERT INTO users (user_id, first_name, last_name, nickname, age, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, data.FirstName, data.LastName, data.Nickname, data.Age, data.Email, hashedPwd)
	if err != nil {
		return err
	}
	return nil
}

func ValidateNamesAndNickname(data RegisterData) error {
	cmp := 0

	for _, r := range data.FirstName {
		if !unicode.IsLetter(r) {
			return fmt.Errorf("first name can only contain letters")
		} else if unicode.IsSpace(r) {
			return fmt.Errorf("middle spaces are not allowed in the first name")
		}
	}

	for _, r := range data.LastName {
		if !unicode.IsLetter(r) {
			return fmt.Errorf("last name can only contain letters")
		} else if unicode.IsSpace(r) {
			return fmt.Errorf("middle spaces are not allowed in the last name")
		}
	}

	for _, r := range data.Nickname {
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

func IsNicknameOrEmailTaken(data RegisterData) error {
	var existing string

	err := Db.QueryRow("SELECT email FROM users WHERE email = ?", data.Email).Scan(&existing)
	if err == nil {
		return fmt.Errorf("email is already taken")
	}
	err = Db.QueryRow("SELECT nickname FROM users WHERE nickname = ?", data.Nickname).Scan(&existing)
	if err == nil {
		return fmt.Errorf("nickname is already taken")
	}

	return nil
}

func BasicChecks(data RegisterData) error {
	if len(data.FirstName) < 2 || len(data.LastName) < 2 {
		return fmt.Errorf("are you sure you entered your name correctly?")
	}

	if data.Age <= 0 || data.Age > 120 {
		return fmt.Errorf("are you sure you entered your age correctly?")
	}
	return nil
}

func AllFieldAreRequiredCheck(data RegisterData) error {
	if data.FirstName == "" {
		return fmt.Errorf("first name is required")
	}
	if data.LastName == "" {
		return fmt.Errorf("last name is required")
	}
	if data.Nickname == "" {
		return fmt.Errorf("nickname is required")
	}
	if data.Email == "" {
		return fmt.Errorf("email is required")
	}
	if data.Password == "" {
		return fmt.Errorf("password is required")
	}
	return nil
}

func LengthCheck(data RegisterData) error {
	if len(data.Nickname) < 3 || len(data.Nickname) > 20 {
		return fmt.Errorf("nickname must be 3-20 characters")
	}

	if len(data.Password) < 6 {
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

func LoginUser(emailOrNickname, password string) (RegisterData, error) {
	var user RegisterData
	var hashedPwd string

	err := Db.QueryRow(
		`SELECT user_id, first_name, last_name, nickname, age, email, password 
		 FROM users 
		 WHERE email = ? OR nickname = ?`,
		emailOrNickname, emailOrNickname,
	).Scan(
		&user.UserID,
		&user.FirstName,
		&user.LastName,
		&user.Nickname,
		&user.Age,
		&user.Email,
		&hashedPwd,
	)
	if err != nil {
		// no need to specifie the error (senstitive data)
		return RegisterData{}, fmt.Errorf("invalid email/nickname or password")
	}

	if !CheckPasswordHash(password, hashedPwd) {
		// no need to specifie the error (senstitive data)
		return RegisterData{}, fmt.Errorf("invalid email/nickname or password")
	}

	return user, nil
}

func CreateSession(userID string) (string, error) {
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)

	_, err := Db.Exec(
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

func GetUserIDFromSession(sessionID string) (string, error) {
	var userID string
	var expiresAt time.Time

	// Query DB for sessionID
	err := Db.QueryRow(
		"SELECT user_id, expires_at FROM sessions WHERE session_id = ?", sessionID).Scan(&userID, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errors.New("session not found")
		}
		return "", err
	}

	// Check if session expired
	if time.Now().After(expiresAt) {
		return "", errors.New("session expired")
	}

	return userID, nil
}

func GetUserNickNameFromSession(sessionID string) string {
	var nickname string
	// no error expected
	Db.QueryRow(
		`SELECT u.nickname 
		 FROM users u
		 JOIN sessions s ON u.user_id = s.user_id
		 WHERE s.session_id = ?`, sessionID).Scan(&nickname)
	return nickname
}
