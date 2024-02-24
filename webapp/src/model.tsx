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

export { type User, type StreamEvent };
