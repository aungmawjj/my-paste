package main

import (
	"context"
	"fmt"
	"os"

	"github.com/aungmawjj/mypaste/mypaste"
	_ "github.com/joho/godotenv/autoload"
	"github.com/redis/go-redis/v9"
)

func main() {
	flushdb := len(os.Args) > 1 && os.Args[1] == "flushdb"
	if flushdb {
		redisFlushDB()
		return
	}
	mypaste.Start()
}

func redisFlushDB() {
	fmt.Println("Running redis flushdb")
	redisOpts, _ := redis.ParseURL(mypaste.GetEnvVerbose("REDIS_URL", true))
	redisClient := redis.NewClient(redisOpts)
	result, err := redisClient.FlushDB(context.Background()).Result()
	if err != nil {
		fmt.Println("flushdb error:", err)
	}
	fmt.Println(result)
}
