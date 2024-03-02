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
	flushall := len(os.Args) > 1 && os.Args[1] == "flushall"
	if flushall {
		redisFlushAll()
		return
	}
	mypaste.Start()
}

func redisFlushAll() {
	fmt.Println("Running redis flushall")
	redisOpts, _ := redis.ParseURL(mypaste.GetEnvVerbose("REDIS_URL", true))
	redisClient := redis.NewClient(redisOpts)
	result, err := redisClient.FlushAll(context.Background()).Result()
	if err != nil {
		fmt.Println("flushall error:", err)
	}
	fmt.Println(result)
}
