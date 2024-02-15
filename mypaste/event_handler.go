package mypaste

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func AddEventHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		var event Event
		if err := c.Bind(&event); err != nil {
			return c.String(http.StatusBadRequest, "Invalid request body, "+err.Error())
		}
		event, err := streamService.Add(c.Request().Context(), user.Email, event)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, event)
	}
}

func ReadEventsHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		lastId := c.QueryParam("lastId")
		events, err := streamService.Read(c.Request().Context(), user.Email, lastId)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, events)
	}
}
