package service

import (
	"errors"
	mpmocks "mypaste/mocks"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"google.golang.org/api/idtoken"
)

func TestValidateGoogleSignIn(t *testing.T) {
	var mockCsrfToken = "mock_csrftoken"
	var mockCredential = "mock_credential"
	var mockPayload = &idtoken.Payload{Issuer: "mock_issuer"}
	var mockCookie = &http.Cookie{Name: csrfCookieName, Value: mockCsrfToken}
	var mockDiffCookie = &http.Cookie{Name: csrfCookieName, Value: "diff_cookie"}

	cRequestOk := func(c *mpmocks.MockEchoContext) {
		c.On("Request").Return(new(http.Request))
	}
	cBindOk := func(c *mpmocks.MockEchoContext) {
		c.On("Bind", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
			body := args.Get(0).(*loginCallbackBody)
			body.Credential = mockCredential
			body.CsrfToken = mockCsrfToken
		})
	}
	cCookieOk := func(c *mpmocks.MockEchoContext) {
		c.On("Cookie", csrfCookieName).Return(mockCookie, nil)
	}
	cCookieError := func(c *mpmocks.MockEchoContext) {
		c.On("Cookie", csrfCookieName).Return(nil, errors.New("cookie not found"))
	}
	cCookieDiff := func(c *mpmocks.MockEchoContext) {
		c.On("Cookie", csrfCookieName).Return(mockDiffCookie, nil)
	}
	vValidateOk := func(v *mpmocks.MockIdTokenValidator) {
		v.On("Validate", mock.Anything, mockCredential).Return(mockPayload, nil)
	}
	vValidateError := func(v *mpmocks.MockIdTokenValidator) {
		v.On("Validate", mock.Anything, mockCredential).Return(nil, errors.New("invalid id token"))
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
		c         echo.Context
		validator IdTokenValidator
	}
	tests := []struct {
		name    string
		args    args
		want    *idtoken.Payload
		wantErr bool
	}{
		{"Ok", args{cOk, vOk}, mockPayload, false},
		{"NoCookie", args{cNoCookie, vOk}, nil, true},
		{"DifferentCookie", args{cDiffCookie, vOk}, nil, true},
		{"InvalidIdToken", args{cOk, vError}, nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := validateGoogleSignIn(tt.args.c, tt.args.validator)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, payload)
				return
			}
			assert.Nil(t, err)
			assert.Equal(t, payload, tt.want)
		})
	}
}
