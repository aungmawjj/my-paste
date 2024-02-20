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

type config struct {
	GoogleClientId   string
	JwtSignKey       string
	WebappBundleDir  string
	LoginCallbackUri string
	ServeAddr        string
	EnableAutoTLS    string
	TlsCacheDir      string
	TlsDomain        string
	RedisUrl         string
	ReqBodyLimit     string
}

func Start() {

	cfg := loadConfig()
	loginCallbackEndpoint := parseLoginCallbackEndpoint(cfg.LoginCallbackUri)

	redisOpts, err := redis.ParseURL(cfg.RedisUrl)
	if err != nil {
		panic(fmt.Errorf("failed to parse redis url, %v, %w", cfg.RedisUrl, err))
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
	e.Use(NewWebappServerMiddleware(cfg.WebappBundleDir))
	e.Renderer = NewRenderer()
	e.HideBanner = true

	e.GET("/login", LoginPageHandler(cfg.GoogleClientId, cfg.LoginCallbackUri))
	e.POST(loginCallbackEndpoint, LoginCallbackHandler(NewIdTokenValidator(cfg.GoogleClientId), cfg.JwtSignKey))

	authmw := NewAuthMiddleware(cfg.JwtSignKey)
	api := e.Group("/api", authmw)

	{
		g := api.Group("/auth")
		g.POST("/authenticate", AuthenticateHandler(cfg.JwtSignKey))
		g.POST("/logout", LogoutHandler())
	}

	{
		g := api.Group("/event")
		g.POST("", AddEventHandler(streamService))
		g.GET("", ReadEventsHandler(streamService))
		g.DELETE("", DeleteEventsHandler(streamService))
		g.DELETE("/reset", ResetEventsHandler(streamService))
	}

	api.Any("/*", ApiNotFoundHandler)
	e.Use(echomw.BodyLimit(cfg.ReqBodyLimit))

	if cfg.EnableAutoTLS != "1" {
		e.Logger.Fatal(e.Start(cfg.ServeAddr))
		return
	}
	e.AutoTLSManager.Cache = autocert.DirCache(cfg.TlsCacheDir)
	e.AutoTLSManager.HostPolicy = autocert.HostWhitelist(cfg.TlsDomain)
	e.Pre(echomw.HTTPSRedirect())
	e.Logger.Fatal(e.StartAutoTLS(cfg.ServeAddr))
}

func loadConfig() config {
	return config{
		GoogleClientId:   getEnvVerbose("GOOGLE_CLIENT_ID", false),
		JwtSignKey:       getEnvVerbose("JWT_SIGN_KEY", true),
		WebappBundleDir:  getEnvVerbose("WEBAPP_BUNDLE_DIR", false),
		LoginCallbackUri: getEnvVerbose("LOGIN_CALLBACK_URI", false),
		ServeAddr:        getEnvVerbose("SERVE_ADDR", false),
		EnableAutoTLS:    getEnvVerbose("ENABLE_AUTO_TLS", false),
		TlsCacheDir:      getEnvVerbose("TLS_CACHE_DIR", false),
		TlsDomain:        getEnvVerbose("TLS_DOMAIN", false),
		RedisUrl:         getEnvVerbose("REDIS_URL", false),
		ReqBodyLimit:     getEnvVerbose("REQ_BODY_LIMIT", false),
	}
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
	c.Logger().Error("Api Not Found, " + c.Request().URL.Path)
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
