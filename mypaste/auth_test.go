package mypaste

import (
	"errors"
	"net/http"
	"testing"

	mpmocks "github.com/aungmawjj/my-paste/mocks"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"google.golang.org/api/idtoken"
)

func TestGoogleSignInValidator(t *testing.T) {
	mockCsrfToken := "mock_csrftoken"
	mockCredential := "mock_credential"
	mockPayload := &idtoken.Payload{Issuer: "mock_issuer"}
	mockCookie := &http.Cookie{Name: csrfCookieName, Value: mockCsrfToken}
	mockDiffCookie := &http.Cookie{Name: csrfCookieName, Value: "diff_cookie"}

	cRequestOk := func(c *mpmocks.MockEchoContext) {
		c.EXPECT().Request().Return(new(http.Request)).Maybe()
	}
	cBindOk := func(c *mpmocks.MockEchoContext) {
		c.EXPECT().Bind(mock.Anything).Return(nil).Run(func(i interface{}) {
			body := i.(*loginCallbackBody)
			body.Credential = mockCredential
			body.CsrfToken = mockCsrfToken
		}).Maybe()
	}
	cCookieOk := func(c *mpmocks.MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(mockCookie, nil).Maybe()
	}
	cCookieError := func(c *mpmocks.MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(nil, errors.New("cookie not found")).Maybe()
	}
	cCookieDiff := func(c *mpmocks.MockEchoContext) {
		c.EXPECT().Cookie(csrfCookieName).Return(mockDiffCookie, nil).Maybe()
	}
	vValidateOk := func(v *mpmocks.MockIdTokenValidator) {
		v.EXPECT().Validate(mock.Anything, mockCredential).Return(mockPayload, nil).Maybe()
	}
	vValidateError := func(v *mpmocks.MockIdTokenValidator) {
		v.EXPECT().Validate(mock.Anything, mockCredential).Return(nil, errors.New("invalid id token")).Maybe()
	}

	cOk := new(mpmocks.MockEchoContext)
	cRequestOk(cOk)
	cBindOk(cOk)
	cCookieOk(cOk)

	cNoCookie := new(mpmocks.MockEchoContext)
	cRequestOk(cNoCookie)
	cBindOk(cNoCookie)
	cCookieError(cNoCookie)

	cDiffCookie := new(mpmocks.MockEchoContext)
	cRequestOk(cDiffCookie)
	cBindOk(cDiffCookie)
	cCookieDiff(cDiffCookie)

	vOk := new(mpmocks.MockIdTokenValidator)
	vValidateOk(vOk)

	vError := new(mpmocks.MockIdTokenValidator)
	vValidateError(vError)

	type args struct {
		v IdTokenValidator
		c echo.Context
	}
	tests := []struct {
		name    string
		args    args
		want    *idtoken.Payload
		wantErr bool
	}{
		{"Ok", args{vOk, cOk}, mockPayload, false},
		{"NoCookie", args{vOk, cNoCookie}, nil, true},
		{"DifferentCookie", args{vOk, cDiffCookie}, nil, true},
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

func TestLoginCallbackHandlerSuccess(t *testing.T) {
	mockPayload := &idtoken.Payload{
		Claims: map[string]interface{}{"name": "mock", "email": "mock"},
	}

	v := mpmocks.NewMockGoogleSignInValidator(t)
	v.EXPECT().Validate(mock.Anything).Return(mockPayload, nil)

	c := mpmocks.NewMockEchoContext(t)
	c.EXPECT().SetCookie(mock.MatchedBy(func(c *http.Cookie) bool { return c.Name == tokenCookieName }))
	c.EXPECT().Redirect(http.StatusFound, "/").Return(nil)

	err := MakeLoginCallbackHandler(v, "secret")(c)
	assert.NoError(t, err)

	c.AssertExpectations(t)
}

func TestLoginCallbackHandlerError(t *testing.T) {
	v := mpmocks.NewMockGoogleSignInValidator(t)
	v.EXPECT().Validate(mock.Anything).Return(nil, errors.New("invalid google sign in"))

	logger := mpmocks.NewMockEchoLogger(t)
	logger.EXPECT().Errorf(mock.Anything, mock.Anything).Maybe()

	c := mpmocks.NewMockEchoContext(t)
	c.EXPECT().Logger().Return(logger).Maybe()
	c.EXPECT().Redirect(http.StatusTemporaryRedirect, "/login-error").Return(nil)

	err := MakeLoginCallbackHandler(v, "secret")(c)
	assert.NoError(t, err)
}
