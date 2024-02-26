import { StreamEvent, User } from "./model/types";

const now = () => new Date().getTime() / 1000;

const fakeUser: User = { Name: "john", Email: "j@g.co" };

const fakeEvents: ReadonlyArray<StreamEvent> = [
  { Id: "1", Payload: "p1", Timestamp: now(), Kind: "PasteText", IsSensitive: false },
  { Id: "2", Payload: "p2", Timestamp: now(), Kind: "PasteText", IsSensitive: false },
];

export { fakeUser, fakeEvents };
