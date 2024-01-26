package mypaste

import (
	"errors"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"google.golang.org/api/idtoken"
)

// TODO: test using httptest without mocking echo context to decople the tests with implementation

func TestGoogleSignInValidator(t *testing.T) {
	csrfToken := "mock_csrftoken"
	credential := "mock_credential"
	user := &User{"user1", "user@example.com"}
	payload := &idtoken.Payload{Claims: map[string]interface{}{"name": user.Name, "email": user.Email}}
	cookie := &http.Cookie{Name: csrfCookieName, Value: csrfToken}
	diffCookie := &http.Cookie{Name: csrfCookieName, Value: "diff_cookie"}
	emptyCookie := &http.Cookie{Name: csrfCookieName, Value: ""}

	cRequestOk := func(c *MockEchoContext) {
		c.EXPECT().Request().Return(new(http.Request)).Maybe()
	}
	cBindOk := func(c *MockEchoContext) {
		c.EXPECT().Bind(mock.Anything).Return(nil).Run(func(i interface{}) {
			body := i.(*loginCallbackBody)
			body.Credential = credential
			body.CsrfToken = csrfToken
		}).Maybe()
	}
	cBindEmptyCsrf := func(c *MockEchoContext) {
		c.EXPECT().Bind(mock.Anything).Return(nil).Run(func(i interface{}) {
			body := i.(*loginCallbackBody)
			body.Credential = credential
			body.CsrfToken = ""
		}).Maybe()
	}
	cBindError := func(c *MockEchoContext) {
		c.EXPECT().Bind(mock.Anything).Return(errors.New("bind error")).Maybe()
	}
	cCookieOk := func(c *MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(cookie, nil).Maybe()
	}
	cCookieError := func(c *MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(nil, errors.New("cookie not found")).Maybe()
	}
	cCookieDiff := func(c *MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(diffCookie, nil).Maybe()
	}
	cCookieEmpty := func(c *MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(emptyCookie, nil).Maybe()
	}
	vValidateOk := func(v *MockIdTokenValidator) {
		v.EXPECT().Validate(mock.Anything, credential).Return(payload, nil).Maybe()
	}
	vValidateError := func(v *MockIdTokenValidator) {
		v.EXPECT().Validate(mock.Anything, credential).Return(nil, errors.New("invalid id token")).Maybe()
	}

	cOk := NewMockEchoContext(t)
	cRequestOk(cOk)
	cBindOk(cOk)
	cCookieOk(cOk)

	cNoCookie := NewMockEchoContext(t)
	cRequestOk(cNoCookie)
	cBindOk(cNoCookie)
	cCookieError(cNoCookie)

	cDiffCookie := NewMockEchoContext(t)
	cRequestOk(cDiffCookie)
	cBindOk(cDiffCookie)
	cCookieDiff(cDiffCookie)

	cEmptyCsrf := NewMockEchoContext(t)
	cRequestOk(cEmptyCsrf)
	cBindEmptyCsrf(cEmptyCsrf)
	cCookieEmpty(cEmptyCsrf)

	cErrorBind := NewMockEchoContext(t)
	cRequestOk(cErrorBind)
	cBindError(cErrorBind)
	cCookieOk(cErrorBind)

	vOk := NewMockIdTokenValidator(t)
	vValidateOk(vOk)

	vError := NewMockIdTokenValidator(t)
	vValidateError(vError)

	type args struct {
		v IdTokenValidator
		c echo.Context
	}
	tests := []struct {
		name    string
		args    args
		want    *User
		wantErr bool
	}{
		{"Ok", args{vOk, cOk}, user, false},
		{"NoCookie", args{vOk, cNoCookie}, nil, true},
		{"DifferentCsrf", args{vOk, cDiffCookie}, nil, true},
		{"EmptyCsrf", args{vOk, cEmptyCsrf}, nil, true},
		{"ErrorBind", args{vOk, cErrorBind}, nil, true},
		{"InvalidIdToken", args{vError, cOk}, nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := NewGoogleSignInValidator(tt.args.v).Validate(tt.args.c)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, payload)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, payload, tt.want)
		})
	}
}

// func TestLoginCallbackHandlerSuccess(t *testing.T) {
// 	user := &User{"user1", "user@example.com"}

// 	v := NewMockGoogleSignInValidator(t)
// 	v.EXPECT().Validate(mock.Anything).Return(user, nil)

// 	c := NewMockEchoContext(t)
// 	c.EXPECT().SetCookie(mock.MatchedBy(func(c *http.Cookie) bool { return c.Name == tokenCookieName }))
// 	c.EXPECT().Redirect(http.StatusFound, "/").Return(nil)

// 	err := MakeLoginCallbackHandler(v, "secret")(c)
// 	assert.NoError(t, err)

// 	c.AssertExpectations(t)
// }

// func TestLoginCallbackHandlerError(t *testing.T) {
// 	v := NewMockGoogleSignInValidator(t)
// 	v.EXPECT().Validate(mock.Anything).Return(nil, errors.New("invalid google sign in"))

// 	logger := NewMockEchoLogger(t)
// 	logger.EXPECT().Errorf(mock.Anything, mock.Anything).Maybe()

// 	c := NewMockEchoContext(t)
// 	c.EXPECT().Logger().Return(logger).Maybe()
// 	c.EXPECT().Redirect(http.StatusTemporaryRedirect, "/login-error").Return(nil)

// 	err := MakeLoginCallbackHandler(v, "secret")(c)
// 	assert.NoError(t, err)
// }
