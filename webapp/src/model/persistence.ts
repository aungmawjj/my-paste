import { DBSchema, IDBPDatabase, openDB } from "idb";
import { OptionalPromise, StreamEvent, StreamStatus, User } from "./types";
import _ from "lodash";

const StoreKeyValue = "KeyValue";
const StoreStreamStatus = "StreamStatus";
const StoreStreamEvents = "StreamEvents";

const IndexStreamId = "StreamId";
const IndexTimestamp = "Timestamp";

const KVStoreKeyCurrentUser = "CurrentUser";

type PStreamEvent = StreamEvent & {
  PKey: string;
  StreamId: string;
};

interface MyPasteDBSchema extends DBSchema {
  [StoreKeyValue]: { key: string; value: unknown };
  [StoreStreamStatus]: { key: string; value: StreamStatus };
  [StoreStreamEvents]: {
    key: string;
    value: PStreamEvent;
    indexes: { [IndexStreamId]: string; [IndexTimestamp]: number };
  };
}

function putCurrentUser(user: User): Promise<void> {
  return withDB(async (db) => {
    await db.put(StoreKeyValue, user, KVStoreKeyCurrentUser);
  });
}

function getCurrentUser(): OptionalPromise<User> {
  return withDB((db) => {
    return db.get(StoreKeyValue, KVStoreKeyCurrentUser) as OptionalPromise<User>;
  });
}

function deleteCurrentUser(): Promise<void> {
  return withDB((db) => {
    return db.delete(StoreKeyValue, KVStoreKeyCurrentUser);
  });
}

function putStreamStatus(data: StreamStatus): Promise<void> {
  return withDB(async (db) => {
    await db.put(StoreStreamStatus, data);
  });
}

function getStreamStatus(streamId: string): OptionalPromise<StreamStatus> {
  return withDB((db) => db.get(StoreStreamStatus, streamId));
}

function putStreamEvents(streamId: string, data: StreamEvent[]): Promise<string> {
  const lastId = data[data.length - 1].Id;
  return withDB(async (db) => {
    const tx = db.transaction([StoreStreamStatus, StoreStreamEvents], "readwrite");

    // update stream status last id
    const statusStore = tx.objectStore(StoreStreamStatus);
    const status = await statusStore.get(streamId);
    if (!status) throw new Error(`stream status not found, streamId: ${streamId}`);
    await statusStore.put({ ...status, LastId: lastId });

    // put all events
    await Promise.all(
      data
        .map<PStreamEvent>((e) => ({ ...e, PKey: eventPKey(streamId, e.Id), StreamId: streamId }))
        .map((e) => tx.objectStore(StoreStreamEvents).put(e))
    );

    await tx.done;
    return lastId;
  });
}

function getAllStreamEvents(streamId: string): OptionalPromise<StreamEvent[]> {
  return withDB(async (db) => {
    const events = await db.getAllFromIndex(StoreStreamEvents, IndexStreamId, streamId);
    return events.map<StreamEvent>((e) => _.omit(e, "PKey", "StreamId"));
  });
}

function deleteStreamEvents(streamId: string, ...ids: string[]): Promise<void> {
  return withDB(async (db) => {
    const tx = db.transaction(StoreStreamEvents, "readwrite");
    await Promise.all(ids.map((id) => tx.store.delete(eventPKey(streamId, id))));
    await tx.done;
  });
}

function deleteOlderStreamEvents(timestamp: number): Promise<void> {
  return withDB(async (db) => {
    const tx = db.transaction(StoreStreamEvents, "readwrite");
    const iterator = tx.store.index(IndexTimestamp).iterate(IDBKeyRange.upperBound(timestamp));
    for await (const cursor of iterator) {
      await cursor.delete();
    }
    await tx.done;
  });
}

function eventPKey(streamId: string, eventId: string): string {
  return `${streamId}-${eventId}`;
}

async function withDB<R>(cb: (db: IDBPDatabase<MyPasteDBSchema>) => R | Promise<R>): Promise<R> {
  const db = await openDB<MyPasteDBSchema>("MyPaste", 1, { upgrade: onUpgradeDB });
  try {
    return cb(db);
  } finally {
    db.close();
  }
}

function onUpgradeDB(db: IDBPDatabase<MyPasteDBSchema>) {
  db.createObjectStore(StoreKeyValue);
  db.createObjectStore(StoreStreamStatus, { keyPath: "StreamId" });
  const eStore = db.createObjectStore(StoreStreamEvents, { keyPath: "PKey" });
  eStore.createIndex(IndexStreamId, IndexStreamId, { unique: false });
  eStore.createIndex(IndexTimestamp, IndexTimestamp, { unique: false });
}

export {
  type StreamStatus,
  putCurrentUser,
  getCurrentUser,
  deleteCurrentUser,
  putStreamStatus,
  getStreamStatus,
  putStreamEvents,
  getAllStreamEvents,
  deleteStreamEvents,
  deleteOlderStreamEvents,
};
