import { useCallback, useRef } from "react";
import { StreamEvent } from "./model";
import { atom, useRecoilCallback, useRecoilState } from "recoil";
import axios from "axios";

const delay = async (ms: number) => new Promise((r) => setTimeout(r, ms));

const streamEventsState = atom<StreamEvent[]>({
  key: "StreamEventState",
  default: [],
});

function useStreamEvents() {
  const [streamEvents, setStreamEvents] = useRecoilState(streamEventsState);
  const lastId = useRef("");

  const resetLastId = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const s = await snapshot.getPromise(streamEventsState);
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
          await delay(10);
        } catch (err) {
          console.info("failed to fatch events: ", err);
          if (signal.aborted) break;
          await delay(5000);
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
export { streamEventsState };
