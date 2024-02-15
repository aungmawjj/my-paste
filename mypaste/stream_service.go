package mypaste

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	eventPayloadKey   = "payload"
	eventTimestampKey = "timestamp"
)

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
		Values: map[string]interface{}{
			eventPayloadKey:   payload,
			eventTimestampKey: time.Now().Unix(),
		},
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
	if err == nil {
		return s.toEvents(res[0].Messages), nil
	}
	if strings.Contains(strings.ToLower(err.Error()), "redis: nil") {
		return s.toEvents(nil), nil
	}
	return nil, err
}

func (s *redisStream) toEvents(messages []redis.XMessage) []Event {
	events := make([]Event, 0, len(messages))
	for _, m := range messages {
		var timestamp int64
		if tstr, ok := m.Values[eventTimestampKey].(string); ok {
			timestamp, _ = strconv.ParseInt(tstr, 10, 64)
		}
		payload, _ := m.Values[eventPayloadKey].(string)
		events = append(events, Event{
			Id:        m.ID,
			Payload:   payload,
			Timestamp: timestamp,
		})
	}
	return events
}

func (s *redisStream) streamId(stream string) string {
	return "mypaste:event:" + stream
}
