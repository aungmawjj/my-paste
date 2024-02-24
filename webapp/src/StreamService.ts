import { StreamEvent } from "./model";
import * as backend from "./backend";
import { createContext, useContext } from "react";

const delay = async (ms: number) => new Promise((r) => setTimeout(r, ms));

type OnAddedEvents = (events: StreamEvent[]) => unknown;
type OnDeletedEvents = (...ids: string[]) => unknown;

class StreamService {
  private onAddedEvents?: OnAddedEvents;
  private onDeletedEvents?: OnDeletedEvents;

  private isStarted: boolean = false;
  private lastId: string = "";
  private abortCtrl: AbortController = new AbortController();

  start = (onAddedEvents?: OnAddedEvents, onDeletedEvents?: OnDeletedEvents) => {
    if (this.isStarted) throw new Error("stream service already started");
    this.isStarted = true;
    this.abortCtrl = new AbortController();
    this.onAddedEvents = onAddedEvents;
    this.onDeletedEvents = onDeletedEvents;
    this.pollStreamEvents().catch(console.error);
  };

  stop = () => {
    this.abortCtrl.abort();
    this.isStarted = false;
  };

  addStreamEvent = backend.addStreamEvent; // need to add encryption later

  deleteStreamEvents = async (...ids: string[]) => {
    await backend.deleteStreamEvents(...ids);
    this.onDeletedEvents?.(...ids);
  };

  private pollStreamEvents = async () => {
    while (!this.abortCtrl.signal.aborted) {
      try {
        await this.fetchStreamEvents();
        await delay(10);
      } catch {
        if (this.abortCtrl.signal.aborted) return;
        await delay(5000);
      }
    }
  };

  private fetchStreamEvents = async () => {
    const events = await backend.readStreamEvents(this.abortCtrl.signal, this.lastId);
    if (events.length == 0) return;
    this.onAddedEvents?.(events);
    this.lastId = events[events.length - 1].Id;
  };
}

const context = createContext(new StreamService());
const StreamServiceProvider = context.Provider;
const useStreamService = () => useContext(context);

export { StreamService, StreamServiceProvider, useStreamService };
