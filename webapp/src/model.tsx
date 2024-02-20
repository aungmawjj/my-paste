export type User = {
  Name: string;
  Email: string;
};

export type StreamEvent = {
  Id: string;
  Payload: string;
  Timestamp: number;
  Kind?: string;
  IsSensitive?: boolean;
};
