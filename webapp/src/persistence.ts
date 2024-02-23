import { IDBPDatabase, openDB } from "idb";
import { StreamEvent, User } from "./model";

type PStreamEvent = StreamEvent & {
  PKey: string;
  StreamId: string;
};

type StreamStatus = {
  StreamId: string;
  KeyPair?: CryptoKeyPair;
  EncryptedSharedKey?: string;
  LastId?: string;
};

namespace Store {
  export const KeyValue = "KeyValue";
  export const StreamStatus = "StreamStatus";
  export const StreamEvents = "StreamEvents";
}

namespace Index {
  export const StreamId = "StreamId";
  export const Timestamp = "Timestamp";
}

namespace KVStoreKey {
  export const CurrentUser = "CurrentUser";
}

function putCurrentUser(user: User): Promise<any> {
  return withDB((db) => db.put(Store.KeyValue, user, KVStoreKey.CurrentUser));
}

function getCurrentUser(): Promise<User | undefined> {
  return withDB((db) => db.get(Store.KeyValue, KVStoreKey.CurrentUser));
}

function putStreamStatus(data: StreamStatus): Promise<any> {
  return withDB((db) => db.put(Store.StreamStatus, data));
}

function getStreamStatus(streamId: string): Promise<StreamStatus | undefined> {
  return withDB((db) => db.get(Store.StreamStatus, streamId));
}

function putStreamEvents(
  streamId: string,
  data: StreamEvent[]
): Promise<string> {
  const lastId = data[data.length - 1].Id;
  return withDB(async (db) => {
    const tx = db.transaction(
      [Store.StreamStatus, Store.StreamEvents],
      "readwrite"
    );
    // put all events
    data
      .map<PStreamEvent>((e) => ({
        ...e,
        PKey: eventPKey(streamId, e.Id),
        StreamId: streamId,
      }))
      .forEach((e) => tx.objectStore(Store.StreamEvents).put(e));

    // update stream lastId
    const statusStore = tx.objectStore(Store.StreamStatus);
    const status: StreamStatus = await statusStore.get(streamId);
    statusStore.put({ ...status, LastId: lastId } as StreamStatus);

    await tx.done;
    return lastId;
  });
}

function getAllStreamEvents(
  streamId: string
): Promise<StreamEvent[] | undefined> {
  return withDB(async (db) => {
    const events: PStreamEvent[] | undefined = await db.getAllFromIndex(
      Store.StreamEvents,
      Index.StreamId,
      streamId
    );
    return events?.map<StreamEvent>(({ PKey, StreamId, ...e }) => e);
  });
}

function deleteStreamEvents(streamId: string, ...ids: string[]): Promise<void> {
  return withDB(async (db) => {
    const tx = db.transaction(Store.StreamEvents, "readwrite");
    ids.forEach((id) => tx.store.delete(eventPKey(streamId, id)));
    await tx.done;
  });
}

function deleteOlderStreamEvents(timestamp: number): Promise<void> {
  return withDB(async (db) => {
    const tx = db.transaction(Store.StreamEvents, "readwrite");
    const iterator = tx.store
      .index(Index.Timestamp)
      .iterate(IDBKeyRange.upperBound(timestamp));
    for await (const cursor of iterator) cursor.delete();
    await tx.done;
  });
}

function eventPKey(streamId: string, eventId: string): string {
  return `${streamId}-${eventId}`;
}

async function withDB<R>(cb: (db: IDBPDatabase) => R | Promise<R>): Promise<R> {
  const db = await openDB("mypaste", 1, { upgrade: onUpgradeDB });
  try {
    return cb(db);
  } finally {
    db.close();
  }
}

function onUpgradeDB(db: IDBPDatabase) {
  db.createObjectStore(Store.KeyValue);
  db.createObjectStore(Store.StreamStatus, { keyPath: "StreamId" });
  const eStore = db.createObjectStore(Store.StreamEvents, {
    keyPath: "PKey",
  });
  eStore.createIndex(Index.StreamId, Index.StreamId, { unique: false });
  eStore.createIndex(Index.Timestamp, Index.Timestamp, { unique: false });
}

export {
  type StreamStatus,
  putCurrentUser,
  getCurrentUser,
  putStreamStatus,
  getStreamStatus,
  putStreamEvents,
  getAllStreamEvents,
  deleteStreamEvents,
  deleteOlderStreamEvents,
};
