package mypaste

import (
	"context"
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
	svc := newTestStreamService(t, readBlock)

	ctx, cancel := context.WithTimeout(context.Background(), 2*readBlock)
	defer cancel()

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(ctx)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", "email"}))

	gotResp := make(chan struct{})
	go func() {
		defer close(gotResp)
		start := time.Now()
		err := ReadEventsHandler(svc)(c)
		assert.GreaterOrEqual(t, time.Since(start), readBlock, "should block for at least read block")
		require.Error(t, err)
	}()

	select {
	case <-ctx.Done():
		assert.FailNow(t, "should get response after timeout")
	case <-gotResp:
	}
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
