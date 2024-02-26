import { atom, useRecoilState } from "recoil";
import { createContext, useCallback, useContext } from "react";
import _ from "lodash";
import { StreamEvent, User } from "../model/types";
import StreamService from "../model/stream-service";

const StreamServiceContext = createContext(new StreamService());

const streamState = atom<{ streamEvents: StreamEvent[] }>({
  key: "streamState",
  default: { streamEvents: [] },
});

function useStreamState() {
  const [{ streamEvents }, setStreamState] = useRecoilState(streamState);
  const streamService = useContext(StreamServiceContext);

  const startStreamService = useCallback(
    (user: User) => {
      streamService.start({
        streamId: user.Email,

        onAddedEvents: (events) => {
          setStreamState((prev) => ({
            streamEvents: _.uniqBy([...[...events].reverse(), ...prev.streamEvents], (e) => e.Id),
          }));
        },

        onDeletedEvents: (...ids) => {
          setStreamState((prev) => ({
            streamEvents: _.filter(prev.streamEvents, (e) => !_.includes(ids, e.Id)),
          }));
        },

        onError: console.error,
      });
    },
    [streamService, setStreamState]
  );

  return {
    streamEvents,
    streamService,
    startStreamService,
  };
}

export { useStreamState, StreamServiceContext };
