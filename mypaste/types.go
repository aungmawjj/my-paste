package mypaste

type User struct {
	Name  string
	Email string
}

type Event struct {
	Id          string `json:",omitempty"`
	Payload     string
	Timestamp   int64
	Kind        string
	IsSensitive bool
}

type Device struct {
	Id          string
	Description string
}
