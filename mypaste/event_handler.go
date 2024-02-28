package mypaste

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

func AddEventHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		var event Event
		if err := c.Bind(&event); err != nil {
			return c.String(http.StatusBadRequest, err.Error())
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
		c.Response().Header().Set("Cache-Control", "no-store")
		return c.JSON(http.StatusOK, events)
	}
}

func DeleteEventsHandler(streamService StreamService) echo.HandlerFunc {
	type query struct {
		Ids []string `query:"id"`
	}
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		var q query
		if err := c.Bind(&q); err != nil {
			return c.String(http.StatusBadRequest, err.Error())
		}
		count, err := streamService.Delete(c.Request().Context(), user.Email, q.Ids...)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, fmt.Sprintf("deleted %v events", count))
	}
}

func ResetEventsHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		count, err := streamService.Reset(c.Request().Context(), user.Email)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, fmt.Sprintf("deleted %v event streams", count))
	}
}
