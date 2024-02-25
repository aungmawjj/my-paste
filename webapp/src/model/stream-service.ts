import { ServiceAlreadyStartedError, ServiceNotStartedError, StreamEvent } from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";
import { delay } from "./utils";

type StreamServiceOptions = {
  streamId: string;
  onAddedEvents?: (events: StreamEvent[]) => unknown;
  onDeletedEvents?: (...ids: string[]) => unknown;
  onError?: (err: unknown) => unknown;
};

class StreamService {
  private isStarted: boolean = false;
  private options?: StreamServiceOptions;
  private abortCtrl?: AbortController;
  private lastId: string = "";

  start = (options: StreamServiceOptions) => {
    if (this.isStarted) throw new ServiceAlreadyStartedError();
    this.isStarted = true;
    this.options = options;
    this.startAsync().catch((err) => options.onError?.(err));
  };

  stop = () => {
    this.assertServiceStarted();
    this.abortCtrl?.abort();
    this.isStarted = false;
  };

  addStreamEvent = async (event: Partial<StreamEvent>) => {
    this.assertServiceStarted();
    await backend.addStreamEvent(event); // need to add encryption later
  };

  deleteStreamEvents = async (...ids: string[]) => {
    this.assertServiceStarted();
    await Promise.all([
      backend.deleteStreamEvents(...ids),
      persistence.deleteStreamEvents(this.options!.streamId, ...ids),
    ]);
    this.options!.onDeletedEvents?.(...ids);
  };

  private assertServiceStarted = () => {
    if (!this.isStarted) throw new ServiceNotStartedError();
  };

  private startAsync = async () => {
    this.abortCtrl = new AbortController();
    await Promise.all([this.loadLocalStreamEvents(), this.loadStatus()]);
    await this.pollStreamEvents(this.abortCtrl.signal);
  };

  private loadLocalStreamEvents = async () => {
    const events = await persistence.getAllStreamEvents(this.options!.streamId);
    if (events && events.length > 0) this.options!.onAddedEvents?.(events);
  };

  private loadStatus = async () => {
    const status = await persistence.getStreamStatus(this.options!.streamId);
    if (status) {
      this.lastId = status.LastId ?? "";
      return;
    }
    await persistence.putStreamStatus({ StreamId: this.options!.streamId });
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
    this.options!.onAddedEvents?.(events);
    this.lastId = await persistence.putStreamEvents(this.options!.streamId, events);
  };
}

export default StreamService;

export { type StreamServiceOptions };
