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
	eventKindKey      = "kind"
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
		Values: map[string]interface{}{
			eventPayloadKey:   event.Payload,
			eventTimestampKey: event.Timestamp,
			eventKindKey:      event.Kind,
		},
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
		var timestamp int64
		if tstr, ok := m.Values[eventTimestampKey].(string); ok {
			timestamp, _ = strconv.ParseInt(tstr, 10, 64)
		}
		payload, _ := m.Values[eventPayloadKey].(string)
		kind, _ := m.Values[eventKindKey].(string)
		events = append(events, Event{
			Id:        m.ID,
			Payload:   payload,
			Timestamp: timestamp,
			Kind:      kind,
		})
	}
	return events
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
