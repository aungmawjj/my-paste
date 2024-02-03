package mypaste

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

const eventPayloadKey = "payload"

type StreamService interface {
	Add(ctx context.Context, stream, payload string) (string, error)
	Read(ctx context.Context, stream, lastId string) ([]Event, error)
}

type RedisStreamConfig struct {
	MaxLen    int64
	ReadCount int64
	ReadBlock time.Duration
}

type redisStream struct {
	client *redis.Client
	config RedisStreamConfig
}

var _ StreamService = (*redisStream)(nil)

func NewRedisStreamService(client *redis.Client, config RedisStreamConfig) StreamService {
	return &redisStream{
		client: client,
		config: config,
	}
}

func (s *redisStream) Add(ctx context.Context, stream, payload string) (string, error) {
	return s.client.XAdd(ctx, &redis.XAddArgs{
		Stream: s.streamId(stream),
		Values: []string{eventPayloadKey, payload},
		MaxLen: s.config.MaxLen,
		Approx: true,
	}).Result()
}

func (s *redisStream) Read(ctx context.Context, stream, lastId string) ([]Event, error) {
	if lastId == "" {
		lastId = "0"
	}
	res, err := s.client.XRead(ctx, &redis.XReadArgs{
		Streams: []string{s.streamId(stream), lastId},
		Count:   s.config.ReadCount,
		Block:   s.config.ReadBlock,
	}).Result()
	if err != nil {
		return nil, err
	}
	return s.toEvents(res[0].Messages), nil
}

func (s *redisStream) toEvents(messages []redis.XMessage) []Event {
	events := make([]Event, 0, len(messages))
	for _, m := range messages {
		events = append(events, Event{
			Id:      m.ID,
			Payload: m.Values[eventPayloadKey].(string),
		})
	}
	return events
}

func (s *redisStream) streamId(stream string) string {
	return "mypaste:event:" + stream
}
