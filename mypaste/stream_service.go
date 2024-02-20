package mypaste

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type StreamService interface {
	Add(ctx context.Context, stream string, event Event) (Event, error)
	Read(ctx context.Context, stream, lastId string) ([]Event, error)
	Delete(ctx context.Context, stream string, ids ...string) (int64, error)
	Reset(ctx context.Context, stream string) (int64, error)
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

func (s *redisStream) Add(ctx context.Context, stream string, event Event) (Event, error) {
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
		events = append(events, s.toEvent(m))
	}
	return events
}

func (s *redisStream) eventValues(event Event) map[string]interface{} {
	return map[string]interface{}{
		"Payload":     event.Payload,
		"Kind":        event.Kind,
		"Timestamp":   strconv.FormatInt(event.Timestamp, 10),
		"IsSensitive": strconv.FormatBool(event.IsSensitive),
	}
}

func (s *redisStream) toEvent(message redis.XMessage) Event {
	var event Event
	event.Id = message.ID
	event.Payload, _ = message.Values["Payload"].(string)
	event.Kind, _ = message.Values["Kind"].(string)
	if tmp, ok := message.Values["Timestamp"].(string); ok {
		event.Timestamp, _ = strconv.ParseInt(tmp, 10, 64)
	}
	if tmp, ok := message.Values["IsSensitive"].(string); ok {
		event.IsSensitive, _ = strconv.ParseBool(tmp)
	}
	return event
}

func (s *redisStream) Delete(ctx context.Context, stream string, ids ...string) (int64, error) {
	return s.client.XDel(ctx, s.streamId(stream), ids...).Result()
}

func (s *redisStream) Reset(ctx context.Context, stream string) (int64, error) {
	return s.client.Del(ctx, s.streamId(stream)).Result()
}

func (s *redisStream) streamId(stream string) string {
	return "mypaste:event:" + stream
}
