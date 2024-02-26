type User = {
  Name: string;
  Email: string;
};

type StreamEvent = {
  Id: string;
  Payload: string;
  Timestamp: number;
  Kind?: string;
  IsSensitive?: boolean;
};

type OptionalPromise<T> = Promise<T | undefined>;

class ServiceNotStartedError extends Error {}

class ServiceAlreadyStartedError extends Error {}

class UnAuthorizedError extends Error {}

export {
  type User,
  type StreamEvent,
  type OptionalPromise,
  ServiceNotStartedError,
  ServiceAlreadyStartedError,
  UnAuthorizedError,
};
