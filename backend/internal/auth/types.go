package auth

type Claims struct {
	FirebaseUID string
	Email       string
	DisplayName string
}

type AppUser struct {
	ID          string
	FirebaseUID string
	Email       string
	DisplayName string
}

type Context struct {
	Claims Claims
	User   AppUser
}
