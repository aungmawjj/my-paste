package mypaste

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type StreamService interface {
	Add(ctx context.Context, stream string, event Event) (Event, error)
	Read(ctx context.Context, stream, lastId string) ([]Event, error)
	Delete(ctx context.Context, stream string, ids ...string) (int64, error)
	Reset(ctx context.Context, stream string) (int64, error)
	// GetDevices(ctx context.Context, stream string) ([]Device, error)
}

type RedisStreamConfig struct {
	MaxLen    int64
	ReadCount int64
	ReadBlock time.Duration
}

type redisStreamService struct {
	client *redis.Client
	config RedisStreamConfig
}

var _ StreamService = (*redisStreamService)(nil)

func NewRedisStreamService(client *redis.Client, config RedisStreamConfig) StreamService {
	return &redisStreamService{
		client: client,
		config: config,
	}
}

func (s *redisStreamService) Add(ctx context.Context, stream string, event Event) (Event, error) {
	event.Timestamp = time.Now().Unix()
	id, err := s.client.XAdd(ctx, &redis.XAddArgs{
		Stream: s.streamId(stream),
		Values: s.eventValues(event),
		MaxLen: s.config.MaxLen,
		Approx: true,
	}).Result()
	if err != nil {
		return event, err
	}
	event.Id = id
	return event, nil
}

func (s *redisStreamService) Read(ctx context.Context, stream, lastId string) ([]Event, error) {
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

func (s *redisStreamService) toEvents(messages []redis.XMessage) []Event {
	events := make([]Event, 0, len(messages))
	for _, m := range messages {
		events = append(events, s.toEvent(m))
	}
	return events
}

func (s *redisStreamService) eventValues(event Event) map[string]interface{} {
	jsonValue, _ := json.Marshal(event)
	return map[string]interface{}{
		"Json": string(jsonValue),
	}
}

func (s *redisStreamService) toEvent(message redis.XMessage) Event {
	var event Event
	if jsonValue, ok := message.Values["Json"].(string); ok {
		json.Unmarshal([]byte(jsonValue), &event)
	}
	event.Id = message.ID
	return event
}

func (s *redisStreamService) Delete(ctx context.Context, stream string, ids ...string) (int64, error) {
	return s.client.XDel(ctx, s.streamId(stream), ids...).Result()
}

func (s *redisStreamService) Reset(ctx context.Context, stream string) (int64, error) {
	return s.client.Del(ctx, s.streamId(stream)).Result()
}

func (s *redisStreamService) streamId(stream string) string {
	return "mypaste:event:" + stream
}
