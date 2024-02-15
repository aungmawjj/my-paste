package mypaste

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func AddEventHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		event := new(Event)
		if err := c.Bind(event); err != nil {
			return c.String(http.StatusBadRequest, "Invalid request body, "+err.Error())
		}
		id, err := streamService.Add(c.Request().Context(), user.Email, event.Payload)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		event.Id = id
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
