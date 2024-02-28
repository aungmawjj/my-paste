import { atom, useRecoilState } from "recoil";
import { createContext, useCallback, useContext } from "react";
import _ from "lodash";
import { StreamEvent, User } from "../model/types";
import StreamService from "../model/stream-service";

const StreamServiceContext = createContext(new StreamService());

const streamState = atom<{ pastes: StreamEvent[]; isLoadingCache: boolean }>({
  key: "streamState",
  default: { pastes: [], isLoadingCache: true },
});

const useStreamService = () => useContext(StreamServiceContext);

function useStreamState() {
  const [{ pastes, isLoadingCache }, setStreamState] = useRecoilState(streamState);
  const streamService = useStreamService();

  const startStreamService = useCallback(
    (user: User) => {
      streamService.start({
        streamId: user.Email,

        onLoadedCache: () => {
          setStreamState((prev) => ({ ...prev, isLoadingCache: false }));
        },

        onAddedPastes: (events) => {
          setStreamState((prev) => ({
            ...prev,
            pastes: _.uniqBy([...[...events].reverse(), ...prev.pastes], (e) => e.Id),
          }));
        },

        onDeletedPastes: (...ids) => {
          setStreamState((prev) => ({
            ...prev,
            pastes: _.filter(prev.pastes, (e) => !_.includes(ids, e.Id)),
          }));
        },

        onError: console.error,
      });
    },
    [streamService, setStreamState]
  );

  return {
    pastes,
    isLoadingCache,
    streamService,
    startStreamService,
  };
}

export { StreamServiceContext, useStreamState };
