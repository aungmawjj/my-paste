package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"google.golang.org/api/idtoken"
)

type loginTemplateData struct {
	GoogleClientId   string
	LoginCallbackUri string
}

type TokenClaims struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

var tokenCookieName string = "my_paste_token"

func NewAuthMiddleware(signingKey string) echo.MiddlewareFunc {
	config := echojwt.Config{
		TokenLookup: "cookie:" + tokenCookieName,
		NewClaimsFunc: func(c echo.Context) jwt.Claims {
			return new(TokenClaims)
		},
		SigningKey: []byte(signingKey),
	}
	return echojwt.WithConfig(config)
}

func GetTokenClaims(c echo.Context) *TokenClaims {
	token := c.Get("user").(*jwt.Token)
	return token.Claims.(*TokenClaims)
}

func MakeLoginPageHandler(gClientId, callbackUri string) echo.HandlerFunc {
	return func(c echo.Context) error {
		return c.Render(http.StatusOK, "login", loginTemplateData{gClientId, callbackUri})
	}
}

func MakeLoginCallbackHandler(gClientId, signingKey string) echo.HandlerFunc {
	return func(c echo.Context) error {
		payload, err := validateGoogleSignIn(c, gClientId)
		if err != nil {
			return redirectToLoginError(c, err)
		}
		cookie, err := newTokenCookie(payload, signingKey)
		if err != nil {
			return redirectToLoginError(c, err)
		}
		c.SetCookie(cookie)
		return c.Redirect(http.StatusFound, "/")
	}
}

type LoginCallbackRequestBody struct {
	Credential string `form:"credential"`
	CsrfToken  string `form:"g_csrf_token"`
}

func validateGoogleSignIn(c echo.Context, gClientId string) (*idtoken.Payload, error) {
	body := new(LoginCallbackRequestBody)
	if err := c.Bind(body); err != nil {
		return nil, err
	}
	csrfTokenCookie, err := c.Cookie("g_csrf_token")
	if err != nil {
		return nil, err
	}
	if body.CsrfToken != csrfTokenCookie.Value {
		return nil, fmt.Errorf("invalid csrf token, body: %v, cookie: %v", body.CsrfToken, csrfTokenCookie.Value)
	}
	return idtoken.Validate(c.Request().Context(), body.Credential, gClientId)
}

func newTokenCookie(payload *idtoken.Payload, signingKey string) (*http.Cookie, error) {
	claims := &TokenClaims{
		payload.Claims["name"].(string),
		payload.Claims["email"].(string),
		jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour))},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(signingKey))
	if err != nil {
		return nil, fmt.Errorf("Failed to sign token, %w", err)
	}
	return &http.Cookie{
		Name:     tokenCookieName,
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	}, nil
}

func redirectToLoginError(c echo.Context, err error) error {
	c.Logger().Errorf("Login error: %v", err)
	return c.Redirect(http.StatusTemporaryRedirect, "/login-error")
}
