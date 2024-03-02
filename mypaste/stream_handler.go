package mypaste

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

func AddEventHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		var event Event
		if err := c.Bind(&event); err != nil {
			return c.String(http.StatusBadRequest, err.Error())
		}
		ctx := c.Request().Context()
		stream := user.Email
		if strings.Contains(event.Kind, "Device") {
			if err := handleDeviceEvent(ctx, streamService, stream, event); err != nil {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		}
		event, err := streamService.Add(ctx, stream, event)
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

func ResetStreamHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		err := streamService.Reset(c.Request().Context(), user.Email)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, fmt.Sprintf("reset stream, email: %v", user.Email))
	}
}

func GetDevicesHandler(streamService StreamService) echo.HandlerFunc {
	return func(c echo.Context) error {
		user := GetAuthorizedUser(c)
		devices, err := streamService.GetDevices(c.Request().Context(), user.Email)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, devices)
	}
}

func handleDeviceEvent(ctx context.Context, streamService StreamService, stream string, event Event) error {
	var device Device
	err := json.Unmarshal([]byte(event.Payload), &device)
	if err != nil {
		return err
	}
	switch event.Kind {
	case "DeviceAdded":
		_, err = streamService.AddDevice(ctx, stream, device)
	case "FirstDevice":
		_, err = streamService.AddFirstDevice(ctx, stream, device)
	}
	return err
}
