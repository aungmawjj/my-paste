package mypaste

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"

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

	newIdTokenPayload := func(name, email interface{}) *idtoken.Payload {
		return &idtoken.Payload{Claims: map[string]interface{}{"name": "a", "email": "b"}}
	}

	newRequestForm := func(credential, csrfToken string) url.Values {
		return url.Values{credentialFormKey: {credential}, csrfTokenFormKey: {csrfToken}}
	}

	assertFailedResponse := func(t *testing.T, rec *httptest.ResponseRecorder) {
		assert.Equal(t, http.StatusSeeOther, rec.Result().StatusCode)
		assert.Equal(t, "/login-failed", rec.Result().Header.Get("Location"))
		idx := slices.IndexFunc(rec.Result().Cookies(), func(c *http.Cookie) bool { return c.Name == tokenCookieName })
		assert.Equalf(t, -1, idx, "should not return token cookie")
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

		err := MakeLoginCallbackHandler(mockV, jwtSignKey)(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Result().StatusCode)
		assert.Equal(t, "/", rec.Result().Header.Get("Location"))

		idx := slices.IndexFunc(rec.Result().Cookies(), func(c *http.Cookie) bool { return c.Name == tokenCookieName })
		require.NotEqual(t, -1, idx, "should return token cookie")
		tokenCookie := rec.Result().Cookies()[idx]
		assert.True(t, tokenCookie.HttpOnly)
		assert.True(t, tokenCookie.Secure)
		assert.NotEqual(t, http.SameSiteNoneMode, tokenCookie.SameSite)
	})

	t.Run("fail if wrong content type", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(form, csrfCookie)
		req.Header.Del(headerContentType)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := MakeLoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

	t.Run("fail if no request body", func(t *testing.T) {
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(nil, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := MakeLoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

	t.Run("fail if no csrf cookie", func(t *testing.T) {
		form := newRequestForm("credential", "csrf")
		req := newRequest(form, nil)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := MakeLoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

	t.Run("fail if empty csrf token", func(t *testing.T) {
		form := newRequestForm("cred", "")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: ""}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := MakeLoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

	t.Run("fail if different csrf token", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "diff_csrf"}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		err := MakeLoginCallbackHandler(nil, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

	t.Run("fail if invalid idtoken", func(t *testing.T) {
		form := newRequestForm("cred", "csrf")
		csrfCookie := &http.Cookie{Name: csrfCookieName, Value: "csrf"}
		req := newRequest(form, csrfCookie)
		rec := httptest.NewRecorder()
		c := echo.New().NewContext(req, rec)

		mockV := NewMockIdTokenValidator(t)
		mockV.EXPECT().Validate(c.Request().Context(), "cred").Return(nil, errors.New("invalid idtoken"))

		err := MakeLoginCallbackHandler(mockV, jwtSignKey)(c)

		require.NoError(t, err)
		assertFailedResponse(t, rec)
	})

}
