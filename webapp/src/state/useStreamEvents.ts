import { useCallback } from "react";
import { StreamEvent } from "../model";
import { atom, useRecoilCallback, useRecoilState } from "recoil";
import * as backend from "../backend";
import _ from "lodash";

const delay = async (ms: number) => new Promise((r) => setTimeout(r, ms));

const streamEventsState = atom<StreamEvent[]>({
  key: "StreamEventState",
  default: [],
});

function useStreamEvents() {
  const [streamEvents, setStreamEvents] = useRecoilState(streamEventsState);

  const getLastIdFromState = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const s = await snapshot.getPromise(streamEventsState);
        return s.length > 0 ? s[0].Id : "";
      },
    []
  );

  const addNewEventsToState = useCallback(
    (data: StreamEvent[]) => {
      setStreamEvents((prev) =>
        _.uniqBy([...[...data].reverse(), ...prev], (e) => e.Id)
      );
    },
    [setStreamEvents]
  );

  const deleteEventsFromState = useCallback(
    (...ids: string[]) => {
      setStreamEvents((prev) => _.filter(prev, (e) => !_.includes(ids, e.Id)));
    },
    [setStreamEvents]
  );

  const fetchStreamEvents = useCallback(
    async (signal: AbortSignal, lastId: string) => {
      const data = await backend.readStreamEvents(signal, lastId);
      if (data.length == 0) return lastId;
      addNewEventsToState(data);
      return data[data.length - 1].Id; // return new lastId
    },
    [addNewEventsToState]
  );

  const pollStreamEvents = useCallback(
    async (signal: AbortSignal) => {
      let lastId = await getLastIdFromState();
      while (!signal.aborted) {
        try {
          lastId = await fetchStreamEvents(signal, lastId);
          await delay(10);
        } catch {
          if (signal.aborted) return;
          await delay(5000);
        }
      }
    },
    [getLastIdFromState, fetchStreamEvents]
  );

  const deleteStreamEvents = useCallback(
    async (...ids: string[]) => {
      await backend.deleteStreamEvents(...ids);
      deleteEventsFromState(...ids);
    },
    [deleteEventsFromState]
  );

  const addStreamEvents = backend.addStreamEvents; // need to add encryption later

  return {
    streamEvents,
    addStreamEvents,
    pollStreamEvents,
    deleteStreamEvents,
  };
}

export default useStreamEvents;

export { streamEventsState };
