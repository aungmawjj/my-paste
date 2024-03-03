package mypaste

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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
		event := addEventWithJustPayloadT(t, svc, "email", "hello")
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
		event := addEventWithJustPayloadT(t, svc, "email", "hello")
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
		e1 := addEventWithJustPayloadT(t, svc, "email1", "hello 1")
		e2 := addEventWithJustPayloadT(t, svc, "email2", "hello 2")
		ee1 := readEventsT(t, svc, "email1", "")
		ee2 := readEventsT(t, svc, "email2", "")
		assert.Equal(t, 1, len(ee1))
		assert.Equal(t, 1, len(ee2))
		assert.Equal(t, e1, ee1[0])
		assert.Equal(t, e2, ee2[0])
	})

	t.Run("delete", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		e1 := addEventWithJustPayloadT(t, svc, "email", "hello1")
		e2 := addEventWithJustPayloadT(t, svc, "email", "hello2")
		e3 := addEventWithJustPayloadT(t, svc, "email", "hello3")
		deleteEventsT(t, svc, "email", e1.Id, e3.Id)
		events := readEventsT(t, svc, "email", "")
		assert.Equal(t, 1, len(events))
		assert.Equal(t, e2, events[0])
	})

	t.Run("reset", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		addEventWithJustPayloadT(t, svc, "email", "hello1")
		addEventWithJustPayloadT(t, svc, "email", "hello2")
		resetEventsT(t, svc, "email")
		events := readEventsT(t, svc, "email", "")
		assert.Equal(t, 0, len(events))
	})

	t.Run("no device", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		devices := getDevicesT(t, svc, "email")
		assert.Equal(t, 0, len(devices))
	})

	t.Run("add device", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		d1 := Device{Id: "d1", Description: "device 1"}
		d2 := Device{Id: "d2", Description: "device 2"}
		p1, _ := json.Marshal(d1)
		p2, _ := json.Marshal(d2)
		addEventT(t, svc, "email", Event{Kind: "DeviceAdded", Payload: string(p1)})
		addEventT(t, svc, "email", Event{Kind: "DeviceAdded", Payload: string(p1)}) // should overwrite duplicate
		addEventT(t, svc, "email", Event{Kind: "DeviceAdded", Payload: string(p2)})
		devices := getDevicesT(t, svc, "email")
		assert.Equal(t, 2, len(devices))
		assert.Contains(t, devices, d1)
		assert.Contains(t, devices, d2)
	})

	t.Run("first device", func(t *testing.T) {
		svc := newTestStreamService(t, 1*time.Millisecond)
		d1 := Device{Id: "d1", Description: "device 1"}
		p1, _ := json.Marshal(d1)
		addEventT(t, svc, "email", Event{Kind: "FirstDevice", Payload: string(p1)})
		devices := getDevicesT(t, svc, "email")
		assert.Equal(t, 1, len(devices))
		assert.Contains(t, devices, d1)

		d2 := Device{Id: "d2", Description: "device 2"}
		p2, _ := json.Marshal(d2)
		addEventAssertFailT(t, svc, "email", Event{Kind: "FirstDevice", Payload: string(p2)})
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

func addEventWithJustPayloadT(t *testing.T, svc StreamService, email string, payload string) Event {
	return addEventT(t, svc, email, Event{Payload: payload})
}

func addEventT(t *testing.T, svc StreamService, email string, event Event) Event {
	body, _ := json.Marshal(event)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Add("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := AddEventHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
	err = json.NewDecoder(rec.Body).Decode(&event)
	require.NoError(t, err)
	return event
}

func addEventAssertFailT(t *testing.T, svc StreamService, email string, event Event) {
	body, _ := json.Marshal(event)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Add("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := AddEventHandler(svc)(c)

	require.NoError(t, err)
	require.GreaterOrEqual(t, rec.Result().StatusCode, 400)
}

func readEventsT(t *testing.T, svc StreamService, email string, lastId string) []Event {
	query := url.Values{"lastId": {lastId}}
	req := httptest.NewRequest(http.MethodGet, "/?"+query.Encode(), nil)
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

func deleteEventsT(t *testing.T, svc StreamService, email string, ids ...string) {
	query := url.Values{"id": ids}
	req := httptest.NewRequest(http.MethodDelete, "/?"+query.Encode(), nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := DeleteEventsHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
}

func resetEventsT(t *testing.T, svc StreamService, email string) {
	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := ResetStreamHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
}

func getDevicesT(t *testing.T, svc StreamService, email string) []Device {
	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", email}))

	err := GetDevicesHandler(svc)(c)

	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rec.Result().StatusCode)
	var devices []Device
	err = json.NewDecoder(rec.Body).Decode(&devices)
	require.NoError(t, err)
	return devices
}
