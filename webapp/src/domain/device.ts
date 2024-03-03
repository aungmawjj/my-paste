import platform from "platform";
import * as backend from "./backend";
import * as persistence from "./persistence";

import {
  decryptAsymmetric,
  encryptAsymmetric,
  exportCryptoKey,
  generateKeyPair,
  generateSharedKey,
  importPublicKey,
  importSharedKey,
} from "./encryption";
import { Device, DeviceAddedPayload, DeviceRequestPayload } from "./types";
import { requireNotAborted } from "./utils";

async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await persistence.getDeviceId();
  if (!deviceId) {
    deviceId = window.crypto.randomUUID();
    await persistence.putDeviceId(deviceId);
  }
  return deviceId;
}

async function addFirstDevice(signal: AbortSignal, deviceId: string): Promise<CryptoKey> {
  const device: Device = { Id: deviceId, Description: deviceDescription() };
  await backend.withRetry(signal, () =>
    backend.addStreamEvent({ Kind: "FirstDevice", Payload: JSON.stringify(device) })
  );
  return generateSharedKey();
}

async function requestNewDevice(signal: AbortSignal, deviceId: string): Promise<CryptoKey> {
  const keyPair = await generateKeyPair();
  const publicKey = await exportCryptoKey(keyPair.publicKey);
  requireNotAborted(signal);
  const { Id: eventId } = await addDeviceRequestEvent(deviceId, publicKey);
  const { EncryptedKey } = await waitForDeviceAddedEvent(signal, deviceId, eventId);
  return importSharedKey(await decryptAsymmetric(keyPair.privateKey, EncryptedKey));
}

async function addDeviceRequestEvent(deviceId: string, publicKey: string) {
  const payload: DeviceRequestPayload = {
    Id: deviceId,
    Description: deviceDescription(),
    PublicKey: publicKey,
  };
  return backend.addStreamEvent({ Kind: "DeviceRequest", Payload: JSON.stringify(payload) });
}

async function waitForDeviceAddedEvent(signal: AbortSignal, deviceId: string, lastId: string) {
  const events = await backend.readStreamEvents(signal, lastId);
  if (events.length > 0) lastId = events[events.length - 1].Id;
  const payload = events
    .filter((e) => e.Kind == "DeviceAdded")
    .map((e) => JSON.parse(e.Payload) as DeviceAddedPayload)
    .find((p) => p.Id == deviceId);
  if (payload) return payload;
  return waitForDeviceAddedEvent(signal, deviceId, lastId);
}

async function approveDevice(reqPayload: DeviceRequestPayload, encryptionKey: CryptoKey) {
  const payload: DeviceAddedPayload = {
    ...reqPayload,
    FromDeviceId: await getOrCreateDeviceId(),
    EncryptedKey: await encryptAsymmetric(
      await importPublicKey(reqPayload.PublicKey),
      await exportCryptoKey(encryptionKey)
    ),
  };
  return backend.addStreamEvent({ Kind: "DeviceAdded", Payload: JSON.stringify(payload) });
}

function deviceDescription(): string {
  return `${platform.manufacturer ?? ""} ${platform.product ?? ""} ${platform.os?.toString() ?? ""}`;
}

export { getOrCreateDeviceId, addFirstDevice, requestNewDevice, approveDevice, deviceDescription };
