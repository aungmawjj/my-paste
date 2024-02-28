package mypaste

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/idtoken"
)

func TestLoginCallbackHandler(t *testing.T) {
	const (
		credentialFormKey = "credential"
		csrfTokenFormKey  = "g_csrf_token"
		jwtSignKey        = "secret"
		headerContentType = "Content-Type"
	)

	newRequest := func(form url.Values, cookie *http.Cookie) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/login-callback", strings.NewReader(form.Encode()))
		req.Header.Set(headerContentType, "application/x-www-form-urlencoded")
		if cookie != nil {
			req.AddCookie(cookie)
		}
		return req
	}

	newIdTokenPayload := func(name, email string) *idtoken.Payload {
		return &idtoken.Payload{Claims: map[string]interface{}{"name": name, "email": email}}
	}

	newRequestForm := func(credential, csrfToken string) url.Values {
		return url.Values{credentialFormKey: {credential}, csrfTokenFormKey: {csrfToken}}
	}

	assertFailedResponse := func(t *testing.T, resp *http.Response) {
		assert.Equal(t, http.StatusSeeOther, resp.StatusCode)
		assert.Equal(t, "/login-failed", resp.Header.Get("Location"))
		assert.Nil(t, getResponseTokenCookie(resp), "should not return token cookie")
	}

	t.Run("ok", func(t *testing.T) {
		payload := newIdTokenPayload("name", "email")
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}

		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		mockV := NewMockIdTokenValidator(t)
		mockV.EXPECT().Validate(c.Request().Context(), "cred").Return(payload, nil)

		err := LoginCallbackHandler(mockV, jwtSignKey)(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Result().StatusCode)
		assert.Equal(t, "/", rec.Result().Header.Get("Location"))
		assertResponseTokenCookie(t, rec.Result(), jwtSignKey)
	})

	t.Run("fail if wrong content type", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(form, csrfCookie)
		req.Header.Del(headerContentType)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := LoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

	t.Run("fail if no request body", func(t *testing.T) {
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(nil, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := LoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

	t.Run("fail if no csrf cookie", func(t *testing.T) {
		form := newRequestForm("credential", "csrf")
		req := newRequest(form, nil)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := LoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

	t.Run("fail if empty csrf token", func(t *testing.T) {
		form := newRequestForm("cred", "")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: ""}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := LoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

	t.Run("fail if different csrf token", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "diff_csrf"}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := LoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

	t.Run("fail if invalid idtoken", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		mockV := NewMockIdTokenValidator(t)
		mockV.EXPECT().Validate(c.Request().Context(), "cred").Return(nil, errors.New("invalid idtoken"))

		err := LoginCallbackHandler(mockV, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec.Result())
	})

}

func TestAuthenticateHandler(t *testing.T) {
	const jwtSignKey = "secret"
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set("user", generateToken(User{"name", "email"}))

	err := AuthenticateHandler(jwtSignKey)(c)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Result().StatusCode)
	assertResponseTokenCookie(t, rec.Result(), jwtSignKey)
}

func TestMakeLogoutHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	err := LogoutHandler()(c)

	require.NoError(t, err)
	tokenCookie := getResponseTokenCookie(rec.Result())
	require.NotNil(t, tokenCookie, "should return token cookie")
	assert.Empty(t, tokenCookie.Value)
	assert.Less(t, tokenCookie.Expires, time.Now())
}

func assertResponseTokenCookie(t *testing.T, resp *http.Response, jwtSignKey string) {
	tokenCookie := getResponseTokenCookie(resp)
	require.NotNil(t, tokenCookie, "should return token cookie")

	assert.True(t, tokenCookie.HttpOnly)
	assert.True(t, tokenCookie.Secure)
	assert.NotEqual(t, http.SameSiteNoneMode, tokenCookie.SameSite)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(tokenCookie)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	authmw := NewAuthMiddleware(jwtSignKey)
	okHandler := func(c echo.Context) error { return c.NoContent(http.StatusOK) }

	err := authmw(okHandler)(c)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Result().StatusCode)
}

func getResponseTokenCookie(resp *http.Response) *http.Cookie {
	idx := slices.IndexFunc(resp.Cookies(), func(c *http.Cookie) bool { return c.Name == tokenCookieName })
	if idx == -1 {
		return nil
	}
	return resp.Cookies()[idx]
}
