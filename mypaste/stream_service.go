package mypaste

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type StreamService interface {
	Add(ctx context.Context, stream string, event Event) (Event, error)
	Read(ctx context.Context, stream, lastId string) ([]Event, error)
	Delete(ctx context.Context, stream string, ids ...string) (int64, error)
	Reset(ctx context.Context, stream string) error
	AddDevice(ctx context.Context, stream string, device Device) (Device, error)
	AddFirstDevice(ctx context.Context, stream string, device Device) (Device, error)
	GetDevices(ctx context.Context, stream string) ([]Device, error)
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
		Stream: s.eventsKey(stream),
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
		Streams: []string{s.eventsKey(stream), lastId},
		Count:   s.config.ReadCount,
		Block:   s.config.ReadBlock,
	}).Result()
	if err == redis.Nil {
		return s.toEvents(nil), nil
	}
	if err != nil {
		return nil, err
	}
	return s.toEvents(res[0].Messages), nil
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
	return s.client.XDel(ctx, s.eventsKey(stream), ids...).Result()
}

func (s *redisStreamService) Reset(ctx context.Context, stream string) error {
	_, err := s.client.Del(ctx, s.eventsKey(stream)).Result()
	return err
}

func (s *redisStreamService) AddDevice(ctx context.Context, stream string, device Device) (Device, error) {
	_, err := s.client.HSet(ctx, s.devicesKey(stream), device.Id, device.Description).Result()
	return device, err
}

func (s *redisStreamService) AddFirstDevice(ctx context.Context, stream string, device Device) (Device, error) {
	devicesKey := s.devicesKey(stream)
	err := s.client.Watch(ctx, func(tx *redis.Tx) error {
		devices, err := tx.HGetAll(ctx, devicesKey).Result()
		if err != nil && err != redis.Nil {
			return err
		}
		if len(devices) > 0 {
			return fmt.Errorf("device already exists for stream: %v", stream)
		}
		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			_, err := pipe.HSet(ctx, devicesKey, device.Id, device.Description).Result()
			return err
		})
		return err
	}, devicesKey)
	return device, err
}

func (s *redisStreamService) GetDevices(ctx context.Context, stream string) ([]Device, error) {
	result, err := s.client.HGetAll(ctx, s.devicesKey(stream)).Result()
	if err == redis.Nil {
		return make([]Device, 0), err
	}
	if err != nil {
		return nil, err
	}
	devices := make([]Device, 0, len(result))
	for key, value := range result {
		devices = append(devices, Device{Id: key, Description: value})
	}
	return devices, nil
}

func (s *redisStreamService) eventsKey(stream string) string {
	return "mypaste:event:" + stream
}

func (s *redisStreamService) devicesKey(stream string) string {
	return "mypaste:device:" + stream
}
