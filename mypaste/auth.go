package mypaste

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

type User struct {
	Name  string
	Email string
}

type TokenClaims struct {
	User
	jwt.RegisteredClaims
}

const (
	tokenCookieName = "my_paste_token"
	csrfCookieName  = "g_csrf_token"
)

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

type GoogleSignInValidator interface {
	Validate(c echo.Context) (*User, error)
}

func NewGoogleSignInValidator(v IdTokenValidator) GoogleSignInValidator {
	return &gSignInValidator{v}
}

type gSignInValidator struct {
	validator IdTokenValidator
}

type loginCallbackBody struct {
	Credential string `form:"credential"`
	CsrfToken  string `form:"g_csrf_token"`
}

func (v *gSignInValidator) Validate(c echo.Context) (*User, error) {
	body := new(loginCallbackBody)
	if err := c.Bind(body); err != nil {
		return nil, err
	}
	csrfTokenCookie, err := c.Cookie(csrfCookieName)
	if err != nil {
		return nil, err
	}
	if body.CsrfToken == "" || body.CsrfToken != csrfTokenCookie.Value {
		return nil, fmt.Errorf("invalid csrf token, body: %v, cookie: %v", body.CsrfToken, csrfTokenCookie.Value)
	}
	payload, err := v.validator.Validate(c.Request().Context(), body.Credential)
	if err != nil {
		return nil, err
	}
	return &User{payload.Claims["name"].(string), payload.Claims["email"].(string)}, nil
}

func NewAuthMiddleware(jwtSignKey string) echo.MiddlewareFunc {
	config := echojwt.Config{
		TokenLookup: "cookie:" + tokenCookieName,
		NewClaimsFunc: func(c echo.Context) jwt.Claims {
			return new(TokenClaims)
		},
		SigningKey: []byte(jwtSignKey),
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

func MakeLoginCallbackHandler(validator IdTokenValidator, jwtSignKey string) echo.HandlerFunc {
	return func(c echo.Context) error {
		user, err := validateGoogleSignin(c, validator)
		if err != nil {
			return handleLoginError(c, err)
		}
		token := generateToken(*user)
		signedToken, err := token.SignedString([]byte(jwtSignKey))
		if err != nil {
			return handleLoginError(c, fmt.Errorf("failed to sign token. %w", err))
		}
		c.SetCookie(newTokenCookie(signedToken))
		return c.Redirect(http.StatusFound, "/")
	}
}

func validateGoogleSignin(c echo.Context, v IdTokenValidator) (*User, error) {
	body := new(loginCallbackBody)
	if err := c.Bind(body); err != nil {
		return nil, err
	}
	csrfTokenCookie, err := c.Cookie(csrfCookieName)
	if err != nil {
		return nil, err
	}
	if body.CsrfToken == "" || body.CsrfToken != csrfTokenCookie.Value {
		return nil, fmt.Errorf("invalid csrf token, body: %v, cookie: %v", body.CsrfToken, csrfTokenCookie.Value)
	}
	payload, err := v.Validate(c.Request().Context(), body.Credential)
	if err != nil {
		return nil, err
	}
	return &User{payload.Claims["name"].(string), payload.Claims["email"].(string)}, nil
}

func handleLoginError(c echo.Context, err error) error {
	c.Logger().Errorf("login failed: %v", err)
	return c.Redirect(http.StatusTemporaryRedirect, "/login-error")
}

func generateToken(user User) *jwt.Token {
	claims := &TokenClaims{
		user,
		jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour))},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
}

func newTokenCookie(token string) *http.Cookie {
	return &http.Cookie{
		Name:     tokenCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}

func expiredTokenCookie() *http.Cookie {
	return &http.Cookie{
		Name:    tokenCookieName,
		Path:    "/",
		Expires: time.Now().Add(-time.Hour),
	}
}

func MakeAuthenticateHandler(jwtSignKey string) echo.HandlerFunc {
	return func(c echo.Context) error {
		claims := GetTokenClaims(c)
		token := generateToken(claims.User)
		signedToken, err := token.SignedString([]byte(jwtSignKey))
		if err != nil {
			return fmt.Errorf("failed to sign token. %w", err)
		}
		c.SetCookie(newTokenCookie(signedToken))
		return c.JSON(http.StatusOK, claims.User)
	}
}

func MakeLogoutHandler() echo.HandlerFunc {
	return func(c echo.Context) error {
		c.SetCookie(expiredTokenCookie())
		return c.NoContent(http.StatusOK)
	}
}
