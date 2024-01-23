package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"google.golang.org/api/idtoken"
)

type TokenClaims struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

var tokenCookieName string = "my_paste_token"
var csrfCookieName string = "g_csrf_token"

type IdTokenValidator interface {
	Validate(ctx context.Context, idToken string) (*idtoken.Payload, error)
}

func NewIdTokenValidator(gClientId string) IdTokenValidator {
	return &idTokenValidator{gClientId}
}

type idTokenValidator struct {
	gClientId string
}

func (v *idTokenValidator) Validate(ctx context.Context, idToken string) (*idtoken.Payload, error) {
	return idtoken.Validate(ctx, idToken, v.gClientId)
}

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
	loginTemplateData := struct {
		GoogleClientId   string
		LoginCallbackUri string
	}{gClientId, callbackUri}
	return func(c echo.Context) error {
		return c.Render(http.StatusOK, "login", loginTemplateData)
	}
}

func MakeLoginCallbackHandler(signingKey string, validator IdTokenValidator) echo.HandlerFunc {
	return func(c echo.Context) error {
		payload, err := validateGoogleSignIn(c, validator)
		if err != nil {
			return handleLoginError(c, err)
		}
		token := generateToken(payload)
		signedToken, err := token.SignedString([]byte(signingKey))
		if err != nil {
			return handleLoginError(c, err)
		}
		c.SetCookie(mypasteTokenCookie(signedToken))
		return c.Redirect(http.StatusFound, "/")
	}
}

func handleLoginError(c echo.Context, err error) error {
	c.Logger().Errorf("login failed: %v", err)
	return c.Redirect(http.StatusTemporaryRedirect, "/login-error")
}

type loginCallbackBody struct {
	Credential string `form:"credential"`
	CsrfToken  string `form:"g_csrf_token"`
}

func validateGoogleSignIn(c echo.Context, validator IdTokenValidator) (*idtoken.Payload, error) {
	body := new(loginCallbackBody)
	if err := c.Bind(body); err != nil {
		return nil, err
	}
	csrfTokenCookie, err := c.Cookie(csrfCookieName)
	if err != nil {
		return nil, err
	}
	if body.CsrfToken != csrfTokenCookie.Value {
		return nil, fmt.Errorf("invalid csrf token, body: %v, cookie: %v", body.CsrfToken, csrfTokenCookie.Value)
	}
	return validator.Validate(c.Request().Context(), body.Credential)
}

func generateToken(payload *idtoken.Payload) *jwt.Token {
	claims := &TokenClaims{
		payload.Claims["name"].(string),
		payload.Claims["email"].(string),
		jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour))},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
}

func mypasteTokenCookie(token string) *http.Cookie {
	return &http.Cookie{
		Name:     tokenCookieName,
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}
