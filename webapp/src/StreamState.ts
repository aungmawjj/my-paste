import { StreamEvent } from "./model";
import { atom, useRecoilState } from "recoil";
import _ from "lodash";

const StreamState = atom<{ streamEvents: StreamEvent[] }>({
  key: "StreamState",
  default: { streamEvents: [] },
});

function useStreamState() {
  const [{ streamEvents }, setStreamEvents] = useRecoilState(StreamState);

  const onAddedEvents = (data: StreamEvent[]) => {
    setStreamEvents((prev) => ({
      streamEvents: _.uniqBy([...[...data].reverse(), ...prev.streamEvents], (e) => e.Id),
    }));
  };

  const onDeletedEvents = (...ids: string[]) => {
    setStreamEvents((prev) => ({
      streamEvents: _.filter(prev.streamEvents, (e) => !_.includes(ids, e.Id)),
    }));
  };

  return {
    streamEvents,
    onAddedEvents,
    onDeletedEvents,
  };
}

export { StreamState, useStreamState };
