import { useCallback, useRef } from "react";
import { StreamEvent } from "./model";
import { atom, useRecoilCallback, useRecoilState } from "recoil";
import axios from "axios";

const sleep = async (ms: number) => new Promise((r) => setTimeout(r, ms));

const streamEventsAtom = atom<StreamEvent[]>({
  key: "StreamEventState",
  default: [],
});

function useStreamEvents() {
  const [streamEvents, setStreamEvents] = useRecoilState(streamEventsAtom);
  const lastId = useRef("");

  const resetLastId = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const s = await snapshot.getPromise(streamEventsAtom);
        lastId.current = s.length > 0 ? s[0].Id : "";
      },
    [lastId]
  );

  const fetchStreamEvents = useCallback(
    async (signal: AbortSignal) => {
      const resp = await axios.get<StreamEvent[]>("/api/event", {
        signal: signal,
        params: { lastId: lastId.current },
      });
      if (resp.data.length == 0) return;
      resp.data.reverse();
      setStreamEvents((prev) => [...resp.data, ...prev]);
      lastId.current = resp.data[0].Id;
    },
    [lastId, setStreamEvents]
  );

  const pollStreamEvents = useCallback(
    async (signal: AbortSignal) => {
      await resetLastId();
      while (!signal.aborted) {
        try {
          await fetchStreamEvents(signal);
        } catch (err) {
          console.warn("failed to fatch events: ", err);
          if (signal.aborted) break;
          await sleep(5000);
        }
      }
    },
    [resetLastId, fetchStreamEvents]
  );

  return {
    streamEvents,
    pollStreamEvents,
  };
}

export default useStreamEvents;
