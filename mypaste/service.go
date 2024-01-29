package mypaste

import (
	"embed"
	"encoding/hex"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/crypto/sha3"
)

func StartService() {
	gClientId := os.Getenv("GOOGLE_CLIENT_ID")
	jwtSignKey := os.Getenv("JWT_SIGN_KEY")
	webappBundleDir := os.Getenv("WEBAPP_BUNDLE_DIR")
	loginCallbackUri := os.Getenv("LOGIN_CALLBACK_URI")
	serveAddr := os.Getenv("SERVE_ADDR")
	enableAutoTLS := os.Getenv("ENABLE_AUTO_TLS")
	tlsCacheDir := os.Getenv("TLS_CACHE_DIR")
	tlsDomain := os.Getenv("TLS_DOMAIN")

	loginCallbackEndpoint := parseLoginCallbackEndpoint(loginCallbackUri)

	log.Println("gClientId:                   ", gClientId)
	log.Println("jwtSignKey (hash):           ", hash(jwtSignKey)[:10])
	log.Println("webappBundleDir:             ", webappBundleDir)
	log.Println("loginCallbackUri:            ", loginCallbackUri)
	log.Println("loginCallbackEndpoint:       ", loginCallbackEndpoint)
	log.Println("serveAddr:                   ", serveAddr)
	log.Println("enableAutoTLS:               ", enableAutoTLS)
	log.Println("tlsCacheDir:                 ", tlsCacheDir)
	log.Println("tlsDomain:                   ", tlsDomain)

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.Logger())
	e.Use(echomw.Gzip())
	e.Use(NewWebappServerMiddleware(webappBundleDir))
	e.Renderer = NewRenderer()
	e.HideBanner = true

	authmw := NewAuthMiddleware(jwtSignKey)

	e.GET("/login", MakeLoginPageHandler(gClientId, loginCallbackUri))
	e.POST(loginCallbackEndpoint, MakeLoginCallbackHandler(NewIdTokenValidator(gClientId), jwtSignKey))

	e.POST("/api/auth/authenticate", MakeAuthenticateHandler(jwtSignKey), authmw)
	e.POST("/api/auth/logout", MakeLogoutHandler(), authmw)

	e.Any("/api/*", ApiNotFoundHandler, authmw)

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
		panic(fmt.Errorf("Failed to parse login callback uri, %v,\n%w", loginCallbackUri, err))
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

// to generate mock
type EchoContext interface {
	echo.Context
}

type EchoLogger interface {
	echo.Logger
}
