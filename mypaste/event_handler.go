package mypaste

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func MakeAddEventHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		event := new(Event)
		if err := c.Bind(event); err != nil {
			return err
		}
		id, err := streamService.Add(c.Request().Context(), user.Email, event.Payload)
		if err != nil {
			return err
		}
		event.Id = id
		return c.JSON(http.StatusOK, event)
	}
}

func MakeReadEventsHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		lastId := c.QueryParam("lastId")
		events, err := streamService.Read(c.Request().Context(), user.Email, lastId)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, events)
	}
}
