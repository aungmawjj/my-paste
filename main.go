package main

import (
	"github.com/aungmawjj/my-paste/mypaste"
	_ "github.com/joho/godotenv/autoload"
)

func main() {
	mypaste.StartService()
}
