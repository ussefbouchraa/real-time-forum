package auth

import (
	"fmt"
	"strings"
	"unicode"

	"real-time-forum/modules/core"
)

var Db = core.Db

func RegisterUser(data RegisterData) error {
	data.FirstName = strings.TrimSpace(data.FirstName)
	data.LastName = strings.TrimSpace(data.LastName)
	data.Nickname = strings.TrimSpace(data.Nickname)

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
