import { useCallback } from "react";
import { StreamEvent } from "./model";
import { atom, useRecoilCallback, useRecoilState } from "recoil";
import axios from "axios";
import _ from "lodash";

const delay = async (ms: number) => new Promise((r) => setTimeout(r, ms));

const streamEventsState = atom<StreamEvent[]>({
  key: "StreamEventState",
  default: [],
});

function useStreamEvents() {
  const [streamEvents, setStreamEvents] = useRecoilState(streamEventsState);

  const getLastId = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const s = await snapshot.getPromise(streamEventsState);
        return s.length > 0 ? s[0].Id : "";
      },
    []
  );

  const fetchStreamEvents = useCallback(
    async (signal: AbortSignal, lastId: string) => {
      const resp = await axios.get<StreamEvent[]>("/api/event", {
        signal: signal,
        params: { lastId },
      });
      if (resp.data.length == 0) return lastId;
      resp.data.reverse();
      setStreamEvents((prev) => [...resp.data, ...prev]);
      return resp.data[0].Id;
    },
    [setStreamEvents]
  );

  const pollStreamEvents = useCallback(
    async (signal: AbortSignal) => {
      let lastId = await getLastId();
      while (!signal.aborted) {
        try {
          lastId = await fetchStreamEvents(signal, lastId);
          await delay(1);
        } catch (err) {
          console.info("failed to fatch events: ", err);
          if (signal.aborted) break;
          await delay(5000);
        }
      }
    },
    [getLastId, fetchStreamEvents]
  );

  const deleteStreamEvents = useCallback(
    (...ids: string[]) => {
      const params = new URLSearchParams();
      ids.forEach((id) => params.append("id", id));
      return axios.delete("/api/event", { params: params }).then(() => {
        setStreamEvents((prev) =>
          _.filter(prev, (e) => !_.includes(ids, e.Id))
        );
      });
    },
    [setStreamEvents]
  );

  return {
    streamEvents,
    pollStreamEvents,
    deleteStreamEvents,
  };
}

export default useStreamEvents;
export { streamEventsState };
