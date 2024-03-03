import { atom, useRecoilCallback, useRecoilState } from "recoil";
import { useCallback, useMemo } from "react";
import _ from "lodash";
import { Device, DeviceRequestPayload, StreamEvent } from "../domain/types";
import * as backend from "../domain/backend";
import * as persistence from "../domain/persistence";
import { decrypt, encrypt } from "../domain/encryption";
import { filterNotNil, requireNotAborted } from "../domain/utils";
import { addFirstDevice, approveDevice, getOrCreateDeviceId, requestNewDevice } from "../domain/device";

const streamState = atom<{
  pastes: StreamEvent[];
  streamId?: string;
  encryptionKey?: CryptoKey;
  devices?: Device[];
  deviceRequest?: DeviceRequestPayload;
}>({
  key: "streamState",
  default: { pastes: [] },
});

function useStream() {
  const [{ pastes, streamId, encryptionKey, deviceRequest }, setStreamState] = useRecoilState(streamState);

  const addPastesToState = useCallback(
    (events: StreamEvent[]) => {
      setStreamState((prev) => ({
        ...prev,
        pastes: _.uniqBy([...[...events].reverse(), ...prev.pastes], (e) => e.Id),
      }));
    },
    [setStreamState]
  );

  const deletePastesFromState = useCallback(
    (...ids: string[]) => {
      setStreamState((prev) => ({
        ...prev,
        pastes: _.filter(prev.pastes, (e) => !_.includes(ids, e.Id)),
      }));
    },
    [setStreamState]
  );

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
          deletePastesFromState(...ids);
        };
  }, [streamId, deletePastesFromState]);

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

  const confirmDeviceRegistered = useCallback(
    async (signal: AbortSignal, streamId: string) => {
      const [deviceId, devices] = await Promise.all([getOrCreateDeviceId(), backend.getDevices()]);
      requireNotAborted(signal);
      console.log(deviceId, devices);
      setStreamState((prev) => ({ ...prev, devices: devices }));
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
    },
    [setStreamState]
  );

  const loadStatus = useCallback(
    async (signal: AbortSignal, streamId: string) => {
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
    },
    [confirmDeviceRegistered, setStreamState]
  );

  const handleDeviceRequestEvent = useRecoilCallback(
    ({ snapshot }) =>
      async (events: StreamEvent[]) => {
        // find device request from at most 2 minutes ago
        const { devices } = await snapshot.getPromise(streamState);
        const deviceMap = devices?.reduce((o, d) => ({ ...o, [d.Id]: d }), {}) ?? {};

        const deviceRequest = [...events]
          .reverse()
          .filter((e) => e.Kind == "DeviceRequest")
          .filter((e) => e.Timestamp > new Date().getTime() / 1000 - 120)
          .map((e) => JSON.parse(e.Payload) as DeviceRequestPayload)
          .find((req) => !_.has(deviceMap, req.Id));
        if (!deviceRequest) return;
        setStreamState((prev) => ({ ...prev, deviceRequest: deviceRequest }));
      },
    [setStreamState]
  );

  const listenToStreamEvents = useCallback(
    async (signal: AbortSignal, streamId: string, offline: boolean) => {
      await persistence.getAllStreamEvents(streamId).then(addPastesToState);
      if (offline) return;

      const status = await loadStatus(signal, streamId);
      let lastId = status.LastId;

      await backend.longPoll(signal, async () => {
        const events = await backend.readStreamEvents(signal, lastId);
        if (events.length == 0) return;
        lastId = events[events.length - 1].Id;
        await handleDeviceRequestEvent(events);
        const pastes = await getDecryptedPastes(status.EncryptionKey, events);
        addPastesToState(pastes);
        await persistence.putStreamEvents(streamId, pastes, lastId);
      });
    },
    [loadStatus, addPastesToState, handleDeviceRequestEvent]
  );

  return {
    pastes,
    deviceRequest,
    addPasteText,
    deletePastes,
    approveDeviceRequest,
    unsetDeviceRequest,
    listenToStreamEvents,
  };
}

async function getDecryptedPastes(key: CryptoKey, events: StreamEvent[]): Promise<StreamEvent[]> {
  async function decryptOrNull(p: StreamEvent) {
    try {
      return { ...p, Payload: await decrypt(key, p.Payload) };
    } catch (err) {
      console.debug("decrypt error:", p.Id, p.Payload, err);
    }
  }
  const pastes = events.filter((e) => e.Kind == "PasteText");
  return Promise.all(pastes.map(decryptOrNull)).then(filterNotNil);
}

export { useStream };
