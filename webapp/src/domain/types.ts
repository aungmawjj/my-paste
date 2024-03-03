type User = {
  Name: string;
  Email: string;
};

type StreamEvent = {
  Id: string;
  Timestamp: number;
  Kind: "PasteText" | "DeviceRequest" | "DeviceAdded" | "FirstDevice";
  Payload: string;
  IsSensitive?: boolean;
};

type StreamStatus = {
  StreamId: string;
  EncryptionKey: CryptoKey;
  LastId: string;
};

type Device = {
  Id: string;
  Description: string;
};

type DeviceRequestPayload = Device & {
  PublicKey: string;
};

type DeviceAddedPayload = DeviceRequestPayload & {
  EncryptedKey: string;
  FromDeviceId: string;
};

type OptionalPromise<T> = Promise<T | undefined>;

class UnAuthorizedError extends Error {}

class AbortedError extends Error {}

export {
  type User,
  type StreamEvent,
  type StreamStatus,
  type Device,
  type DeviceRequestPayload,
  type DeviceAddedPayload,
  type OptionalPromise,
  UnAuthorizedError,
  AbortedError,
};
