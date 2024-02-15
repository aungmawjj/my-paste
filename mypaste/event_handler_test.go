package mypaste

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadEventHandlerTimeout(t *testing.T) {
	readBlock := 5 * time.Millisecond

	ctx, cancel := context.WithTimeout(context.Background(), 2*readBlock)
	defer cancel()

	eventsCh := make(chan []Event)
	go func() {
		svc := newTestStreamService(t, readBlock)
		start := time.Now()
		events := readEventsT(t, svc, "email", "")
		assert.GreaterOrEqual(t, time.Since(start), readBlock, "should block for at least read block")
		eventsCh <- events
	}()

	select {
	case <-ctx.Done():
		assert.FailNow(t, "should get response after timeout")
	case events := <-eventsCh:
		assert.Empty(t, events)
	}
}

func TestEventHandlers(t *testing.T) {

	t.Run("write then read", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		event := addEventT(t, svc, "email", "hello")
		events := readEventsT(t, svc, "email", "")
		assert.Equal(t, 1, len(events))
		assert.Equal(t, event, events[0])
	})

	t.Run("read then write", func(t *testing.T) {
		readBlock := 10 * time.Millisecond
		svc := newTestStreamService(t, readBlock)
		eventsCh := make(chan []Event)
		go func() {
			eventsCh <- readEventsT(t, svc, "email", "")
		}()
		event := addEventT(t, svc, "email", "hello")
		select {
		case <-time.After(readBlock):
			assert.Fail(t, "should not block after write")
		case events := <-eventsCh:
			assert.Equal(t, 1, len(events))
			assert.Equal(t, event, events[0])
		}
	})

	t.Run("should be isolated for each user", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		e1 := addEventT(t, svc, "email1", "hello 1")
		e2 := addEventT(t, svc, "email2", "hello 2")
		ee1 := readEventsT(t, svc, "email1", "")
		ee2 := readEventsT(t, svc, "email2", "")
		assert.Equal(t, 1, len(ee1))
		assert.Equal(t, 1, len(ee2))
		assert.Equal(t, e1, ee1[0])
		assert.Equal(t, e2, ee2[0])
	})

}

func newTestStreamService(t *testing.T, readBlock time.Duration) StreamService {
	mredis := miniredis.RunT(t)
	rclient := redis.NewClient(&redis.Options{Addr: mredis.Addr()})
	cfg := RedisStreamConfig{
		MaxLen:    10,
		ReadCount: 10,
		ReadBlock: readBlock,
	}
	svc := NewRedisStreamService(rclient, cfg)
	return svc
}

func addEventT(t *testing.T, svc StreamService, email string, payload string) Event {
	body, _ := json.Marshal(Event{Payload: payload})
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Add("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := AddEventHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
	var event Event
	err = json.NewDecoder(rec.Body).Decode(&event)
	require.NoError(t, err)
	return event
}

func readEventsT(t *testing.T, svc StreamService, email string, lastId string) []Event {
	req := httptest.NewRequest(http.MethodGet, "/?lastId="+lastId, nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := ReadEventsHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
	var events []Event
	err = json.NewDecoder(rec.Body).Decode(&events)
	require.NoError(t, err)
	return events
}
