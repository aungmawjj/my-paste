type User = {
  Name: string;
  Email: string;
};

type StreamEvent = {
  Id: string;
  Timestamp: number;
  Kind: "PasteText" | "DeviceRequest" | "DeviceAdded";
  Payload: string;
  IsSensitive?: boolean;
};

type StreamStatus = {
  StreamId: string;
  EncryptionKey: CryptoKey;
  LastId: string;
};

type DeviceRequestPayload = {
  DeviceId: string;
  DevicePublicKey: string;
  DeviceDescription: string;
};

type DeviceAddedPayload = DeviceRequestPayload & {
  EncryptedSharedKey: string;
  FromDeviceId: string;
};

type OptionalPromise<T> = Promise<T | undefined>;

class UnAuthorizedError extends Error {}

class AbortedError extends Error {}

export {
  type User,
  type StreamEvent,
  type StreamStatus,
  type DeviceRequestPayload,
  type DeviceAddedPayload,
  type OptionalPromise,
  UnAuthorizedError,
  AbortedError,
};
