package mypaste

import (
	"embed"
	"encoding/hex"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/crypto/sha3"
)

func Start() {
	gClientId := getEnvVerbose("GOOGLE_CLIENT_ID", false)
	jwtSignKey := getEnvVerbose("JWT_SIGN_KEY", true)
	webappBundleDir := getEnvVerbose("WEBAPP_BUNDLE_DIR", false)
	loginCallbackUri := getEnvVerbose("LOGIN_CALLBACK_URI", false)
	serveAddr := getEnvVerbose("SERVE_ADDR", false)
	enableAutoTLS := getEnvVerbose("ENABLE_AUTO_TLS", false)
	tlsCacheDir := getEnvVerbose("TLS_CACHE_DIR", false)
	tlsDomain := getEnvVerbose("TLS_DOMAIN", false)
	redisUrl := getEnvVerbose("REDIS_URL", false)

	loginCallbackEndpoint := parseLoginCallbackEndpoint(loginCallbackUri)

	redisOpts, err := redis.ParseURL(redisUrl)
	if err != nil {
		panic(fmt.Errorf("failed to parse redis url, %v, %w", redisUrl, err))
	}
	redisClient := redis.NewClient(redisOpts)
	streamService := NewRedisStreamService(redisClient, RedisStreamConfig{
		MaxLen:    100,
		ReadCount: 100,
		ReadBlock: 5 * time.Minute,
	})

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.Logger())
	e.Use(echomw.Gzip())
	e.Use(NewWebappServerMiddleware(webappBundleDir))
	e.Renderer = NewRenderer()
	e.HideBanner = true

	e.GET("/login", MakeLoginPageHandler(gClientId, loginCallbackUri))
	e.POST(loginCallbackEndpoint, MakeLoginCallbackHandler(NewIdTokenValidator(gClientId), jwtSignKey))

	authmw := NewAuthMiddleware(jwtSignKey)
	api := e.Group("/api", authmw)

	api.POST("/auth/authenticate", MakeAuthenticateHandler(jwtSignKey))
	api.POST("/auth/logout", MakeLogoutHandler())

	api.POST("/event", MakeAddEventHandler(streamService))
	api.GET("/event", MakeReadEventsHandler(streamService))

	api.Any("/*", ApiNotFoundHandler)

	if enableAutoTLS != "1" {
		e.Logger.Fatal(e.Start(serveAddr))
		return
	}
	e.AutoTLSManager.Cache = autocert.DirCache(tlsCacheDir)
	e.AutoTLSManager.HostPolicy = autocert.HostWhitelist(tlsDomain)
	e.Pre(echomw.HTTPSRedirect())
	e.Logger.Fatal(e.StartAutoTLS(serveAddr))
}

func parseLoginCallbackEndpoint(loginCallbackUri string) string {
	u, err := url.ParseRequestURI(loginCallbackUri)
	if err != nil {
		panic(fmt.Errorf("failed to parse login callback uri, %v,\n%w", loginCallbackUri, err))
	}
	return u.Path
}

func hash(data string) string {
	return "0x" + hex.EncodeToString(sha3.New256().Sum([]byte(data)))
}

func NewWebappServerMiddleware(bundleDir string) echo.MiddlewareFunc {
	return echomw.StaticWithConfig(echomw.StaticConfig{
		Root:   bundleDir,
		Index:  "index.html",
		Browse: false,
		HTML5:  true,
	})
}

func ApiNotFoundHandler(c echo.Context) error {
	return c.NoContent(http.StatusNotFound)
}

func RootHandler(c echo.Context) error {
	return c.String(http.StatusOK, "Hello, Welcome!")
}

func getEnvVerbose(name string, sensitive bool) string {
	value := os.Getenv(name)
	printValue := value
	if sensitive {
		printValue = hash(printValue)[:10] + " (hash)"
	}
	fmt.Printf("%s  :  %s\n", name, printValue)
	return value
}

//go:embed templates/*
var templateFS embed.FS

type Renderer struct {
	template *template.Template
}

func NewRenderer() *Renderer {
	return &Renderer{
		template.Must(template.ParseFS(templateFS, "templates/*.html")),
	}
}

func (t *Renderer) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.template.ExecuteTemplate(w, name+".html", data)
}
