import { StreamEvent, User } from "./types";
import {
  deleteOlderStreamEvents,
  deleteStreamEvents,
  getAllStreamEvents,
  getCurrentUser,
  getStreamStatus,
  putCurrentUser,
  putStreamEvents,
  putStreamStatus,
} from "./persistence";
import { generateSharedKey } from "./encryption";

const user: User = {
  Name: "User Name",
  Email: "user@gmail.com",
};

const streamId = user.Email;

const events: StreamEvent[] = [
  { Id: "e1", Payload: "hello1", Kind: "PasteText", Timestamp: 1 },
  { Id: "e2", Payload: "hello2", Kind: "PasteText", Timestamp: 2 },
  { Id: "e3", Payload: "hello3", Kind: "PasteText", Timestamp: 3 },
];

test("no current user", async () => {
  const currentUser = await getCurrentUser();
  expect(currentUser).toBeUndefined();
});

test("put and get current user", async () => {
  await putCurrentUser(user);
  const currentUser = await getCurrentUser();
  expect(currentUser).toEqual(user);
});

test("not existing stream status", async () => {
  const status = await getStreamStatus(streamId);
  expect(status).toBeUndefined();
});

test("put and get stream status", async () => {
  await putStreamStatus({ StreamId: streamId, EncryptionKey: await generateSharedKey(), LastId: "" });
  const status = await getStreamStatus(streamId);

  expect(status).toBeDefined();
  if (!status) return;

  expect(status.StreamId).toStrictEqual(streamId);
});

test("put and get stream events", async () => {
  await putStreamEvents(streamId, events, events[events.length - 1].Id);

  const status = await getStreamStatus(streamId);
  expect(status).toBeDefined();
  if (!status) return;

  expect(status.LastId).toStrictEqual(events[events.length - 1].Id);
  const storedEvents = await getAllStreamEvents(streamId);
  expect(storedEvents).toStrictEqual(events);
});

test("delete stream event", async () => {
  await deleteStreamEvents(streamId, events[events.length - 1].Id); // remove last event
  const storedEvents = await getAllStreamEvents(streamId);
  expect(storedEvents?.length).toEqual(events.length - 1);
  expect(storedEvents).toStrictEqual(events.slice(0, -1));
});

test("delete older stream events", async () => {
  await deleteOlderStreamEvents(1); // remove first event
  const storedEvents = await getAllStreamEvents(streamId);
  expect(storedEvents?.length).toEqual(events.length - 2);
  expect(storedEvents).toStrictEqual(events.slice(1, -1));
});
