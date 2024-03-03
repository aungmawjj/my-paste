import { atom, useRecoilState } from "recoil";
import { useCallback, useMemo } from "react";
import _ from "lodash";
import { Device, DeviceAddedPayload, DeviceRequestPayload, StreamEvent } from "../domain/types";
import * as backend from "../domain/backend";
import * as persistence from "../domain/persistence";
import { decrypt, encrypt } from "../domain/encryption";
import { requireNotAborted } from "../domain/utils";
import { addFirstDevice, approveDevice, getOrCreateDeviceId, requestNewDevice } from "../domain/device";

const streamState = atom<{
  streamEvents: StreamEvent[];
  streamId?: string;
  encryptionKey?: CryptoKey;
  devices?: Device[];
  deviceRequest?: DeviceRequestPayload;
}>({
  key: "streamState",
  default: { streamEvents: [] },
});

function useStream() {
  const [{ streamEvents, devices, streamId, encryptionKey, deviceRequest }, setStreamState] =
    useRecoilState(streamState);

  console.log("state devices ", devices);

  const addPasteText = useMemo(() => {
    return !encryptionKey
      ? undefined
      : async (payload: string, isSensitive: boolean) => {
          return backend.addStreamEvent({
            Kind: "PasteText",
            Payload: await encrypt(encryptionKey, payload),
            IsSensitive: isSensitive,
          });
        };
  }, [encryptionKey]);

  const deletePastes = useMemo(() => {
    return !streamId
      ? undefined
      : async (...ids: string[]) => {
          await backend.deleteStreamEvents(...ids);
          await persistence.deleteStreamEvents(streamId, ...ids);
          setStreamState((prev) => ({
            ...prev,
            streamEvents: _.filter(prev.streamEvents, (e) => !_.includes(ids, e.Id)),
          }));
        };
  }, [streamId, setStreamState]);

  const unsetDeviceRequest = useCallback(() => {
    setStreamState((prev) => ({ ...prev, deviceRequest: undefined }));
  }, [setStreamState]);

  const approveDeviceRequest = useMemo(
    () =>
      !(deviceRequest && encryptionKey)
        ? undefined
        : async () => {
            await approveDevice(deviceRequest, encryptionKey);
            unsetDeviceRequest();
          },
    [encryptionKey, deviceRequest, unsetDeviceRequest]
  );

  const listenToStreamEvents = useCallback(
    async (signal: AbortSignal, streamId: string, offline: boolean) => {
      await persistence.getAllStreamEvents(streamId).then(addEventsToState);
      if (offline) return;

      let lastId = "";
      let devices: Device[] = [];

      const { LastId, EncryptionKey } = await loadStatus(signal, streamId);
      lastId = LastId;

      await backend.longPoll(signal, async () => {
        const events = await backend.readStreamEvents(signal, lastId).then(decryptPasteTexts(EncryptionKey));
        if (events.length == 0) return;
        lastId = events[events.length - 1].Id;
        addEventsToState(events);
        handleDeviceAdded(events);
        handleDeviceRequest(events);
        await persistence.putStreamEvents(streamId, events, lastId);
      });

      function addEventsToState(events: StreamEvent[]) {
        setStreamState((prev) => ({
          ...prev,
          streamEvents: _.uniqBy([...[...events].reverse(), ...prev.streamEvents], (e) => e.Id),
        }));
      }

      async function loadStatus(signal: AbortSignal, streamId: string) {
        await confirmDeviceRegistered(signal, streamId);
        const status = await persistence.getStreamStatus(streamId);
        requireNotAborted(signal);
        if (!status) {
          await persistence.deleteDeviceId();
          await persistence.deleteStreamStatus(streamId);
          await persistence.deleteStreamEvents(streamId);
          return loadStatus(signal, streamId);
        }
        setStreamState((prev) => ({ ...prev, streamId: streamId, encryptionKey: status.EncryptionKey }));
        return status;
      }

      async function confirmDeviceRegistered(signal: AbortSignal, streamId: string) {
        const [deviceId, deviceList] = await Promise.all([getOrCreateDeviceId(), backend.getDevices()]);
        devices = deviceList;
        requireNotAborted(signal);
        setStreamState((prev) => ({ ...prev, devices }));
        if (_.find(devices, (d) => d.Id == deviceId)) return; // deviceId is found in backend list

        await persistence.deleteAllStreamEvents(streamId);
        try {
          let encryptionKey: CryptoKey;
          if (devices.length == 0) {
            encryptionKey = await addFirstDevice(signal, deviceId);
          } else {
            // change status as requesting new device and ask for approval
            encryptionKey = await requestNewDevice(signal, deviceId);
          }
          await persistence.putStreamStatus({ StreamId: streamId, LastId: "", EncryptionKey: encryptionKey });
        } catch (err) {
          console.error("failed to register device", err);
        }
        await confirmDeviceRegistered(signal, streamId);
      }

      function handleDeviceAdded(events: StreamEvent[]) {
        const newDevices: Device[] = events
          .filter((e) => e.Kind == "DeviceAdded")
          .map((e) => JSON.parse(e.Payload) as DeviceAddedPayload)
          .map((p) => ({ Id: p.Id, Description: p.Description }));
        devices = _.uniqBy([...devices, ...newDevices], (d) => d.Id);
        setStreamState((prev) => ({ ...prev, devices }));
      }

      function handleDeviceRequest(events: StreamEvent[]) {
        const deviceMap = devices?.reduce((o, d) => ({ ...o, [d.Id]: d }), {}) ?? {};
        // find device request from at most 2 minutes ago
        const deviceRequest = [...events]
          .reverse()
          .filter((e) => e.Kind == "DeviceRequest")
          .filter((e) => e.Timestamp > new Date().getTime() / 1000 - 120)
          .map((e) => JSON.parse(e.Payload) as DeviceRequestPayload)
          .find((req) => !_.has(deviceMap, req.Id));
        if (!deviceRequest) return;
        setStreamState((prev) => ({ ...prev, deviceRequest: deviceRequest }));
      }
    },
    [setStreamState]
  );

  return {
    streamEvents,
    devices,
    deviceRequest,
    addPasteText,
    deletePastes,
    approveDeviceRequest,
    unsetDeviceRequest,
    listenToStreamEvents,
  };
}

const decryptPasteTexts = (key: CryptoKey) => async (events: StreamEvent[]) => {
  return Promise.all(
    events.map(async (e) => {
      if (e.Kind != "PasteText") return e;
      let payload: string;
      try {
        payload = await decrypt(key, e.Payload);
      } catch (err) {
        console.debug("decrypt error: ", err);
        payload = `Failed to decrypt!`;
      }
      return { ...e, Payload: payload };
    })
  );
};

export { useStream };
