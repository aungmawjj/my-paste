// import platform from "platform";
// import * as backend from "./backend";

import { importSharedKey } from "./encryption";
// import { DeviceAddedPayload, DeviceRequestPayload } from "./types";
import { requireNotAborted } from "./utils";

const hardCodedKey = `{"key_ops":["encrypt","decrypt"],"ext":true,"kty":"oct","k":"PYhMHfAgHpVrsmNs59ZtRaHbof8Ubw9GsabcbsePBJk","alg":"A256GCM"}`;

async function getOrCreateEncryptionKey(signal: AbortSignal): Promise<CryptoKey> {
  requireNotAborted(signal);
  return importSharedKey(hardCodedKey);
  // const keyPair = await exportCryptoKey((await generateKeyPair()).publicKey);
  // const publicKey =
  // const { deviceId, eventId } = await addDeviceRequestEvent(signal, publicKey);
  // return await waitForDeviceAddedEvent(signal, deviceId, eventId);
}

// async function addDeviceRequestEvent(signal: AbortSignal, publicKey: string) {
//   const deviceId = await sha256Base64(publicKey);
//   requireNotAborted(signal);
//   const payload: DeviceRequestPayload = {
//     DeviceId: deviceId,
//     DevicePublicKey: publicKey,
//     DeviceDescription: deviceDescription(),
//   };
//   const event = await backend.addStreamEvent({ Kind: "DeviceRequest", Payload: JSON.stringify(payload) });
//   return { deviceId, eventId: event.Id };
// }

// // wait for device added event and return shared key
// async function waitForDeviceAddedEvent(signal: AbortSignal, deviceId: string, lastId: string): Promise<string> {
//   const events = await backend.readStreamEvents(signal, lastId);
//   if (events.length > 0) lastId = events[events.length - 1].Id;
//   const payload = events
//     .filter((e) => e.Kind != "DeviceAdded")
//     .map((e) => JSON.parse(e.Payload) as DeviceAddedPayload)
//     .find((p) => p.DeviceId == deviceId);
//   if (!payload) return waitForDeviceAddedEvent(signal, deviceId, lastId);
//   return payload.EncryptedSharedKey;
// }

// function deviceDescription(): string {
//   return `${platform.manufacturer ?? ""} ${platform.product ?? ""} ${platform.os?.toString() ?? ""}`;
// }

export { getOrCreateEncryptionKey };
