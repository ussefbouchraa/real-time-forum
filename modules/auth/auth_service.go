package auth

import "fmt"

func RegisterUser(data RegisterData) error {
	if err := AllFieldAreRequiredCheck(data); err != nil {
		return err
	}

	if err := LengthCheck(data); err != nil {
		return err
	}
	if err := IsNicknameOrEmailTaken(data); err != nil {
		return err
	}
	// ...
	return nil
}

func IsNicknameOrEmailTaken(data RegisterData) error {
	// DB query check
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
	if len(data.Nickname) < 3 || len(data.Nickname) > 30 {
		return fmt.Errorf("nickname must be 3-30 characters")
	}

	if len(data.Password) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}
	return nil
}
