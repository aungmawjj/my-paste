import { StreamEvent, User } from "../model";
import { atom, useRecoilState } from "recoil";
import { createContext, useContext } from "react";
import _ from "lodash";
import * as backend from "../backend";
import * as persistence from "../persistence";

const delay = async (ms: number) => new Promise((r) => setTimeout(r, ms));

type OnAddedEvents = (events: StreamEvent[]) => unknown;
type OnDeletedEvents = (...ids: string[]) => unknown;

class StreamService {
  onAddedEvents?: OnAddedEvents;
  onDeletedEvents?: OnDeletedEvents;

  private isStarted: boolean = false;
  private streamId: string = "";
  private lastId: string = "";
  private abortCtrl?: AbortController;

  start = (user: User) => {
    if (this.isStarted) throw new Error("stream service already started");
    this.isStarted = true;
    this.streamId = user.Email;
    this.startAsync().catch(console.error);
  };

  stop = () => {
    this.abortCtrl?.abort();
    this.isStarted = false;
  };

  addStreamEvent = backend.addStreamEvent; // need to add encryption later

  deleteStreamEvents = async (...ids: string[]) => {
    await Promise.all([backend.deleteStreamEvents(...ids), persistence.deleteStreamEvents(this.streamId, ...ids)]);
    this.onDeletedEvents?.(...ids);
  };

  private startAsync = async () => {
    this.abortCtrl = new AbortController();
    await Promise.all([this.loadLocalStreamEvents(), this.loadStatus()]);
    await this.pollStreamEvents(this.abortCtrl.signal);
  };

  private loadLocalStreamEvents = async () => {
    const events = await persistence.getAllStreamEvents(this.streamId);
    if (events && events.length > 0) this.onAddedEvents?.(events);
  };

  private loadStatus = async () => {
    const status = await persistence.getStreamStatus(this.streamId);
    if (status) {
      this.lastId = status.LastId ?? "";
      return;
    }
    await persistence.putStreamStatus({ StreamId: this.streamId });
  };

  private pollStreamEvents = async (signal: AbortSignal) => {
    while (!signal.aborted) {
      try {
        await this.fetchStreamEvents(signal);
        await delay(10);
      } catch (err) {
        if (signal.aborted) return;
        console.debug("fetch stream events failed!", err);
        await delay(5000);
      }
    }
  };

  private fetchStreamEvents = async (signal: AbortSignal) => {
    const events = await backend.readStreamEvents(signal, this.lastId);
    if (signal.aborted) return;
    if (events.length == 0) return;
    this.onAddedEvents?.(events);
    this.lastId = await persistence.putStreamEvents(this.streamId, events);
  };
}

const serviceContext = createContext(new StreamService());

const streamState = atom<{ streamEvents: StreamEvent[] }>({
  key: "streamState",
  default: { streamEvents: [] },
});

function useStreamState() {
  const [{ streamEvents }, setStreamState] = useRecoilState(streamState);
  const service = useContext(serviceContext);

  service.onAddedEvents = (events) => {
    setStreamState((prev) => ({
      streamEvents: _.uniqBy([...[...events].reverse(), ...prev.streamEvents], (e) => e.Id),
    }));
  };

  service.onDeletedEvents = (...ids) => {
    setStreamState((prev) => ({
      streamEvents: _.filter(prev.streamEvents, (e) => !_.includes(ids, e.Id)),
    }));
  };

  return {
    streamEvents,
    startStreamService: service.start,
    stopStreamService: service.stop,
    addStreamEvent: service.addStreamEvent,
    deleteStreamEvents: service.deleteStreamEvents,
  };
}

export { useStreamState };
