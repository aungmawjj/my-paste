import { ServiceAlreadyStartedError, ServiceNotStartedError, StreamEvent } from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";
import { delay } from "./utils";
import { decrypt, encrypt, importSharedKey } from "./encryption";

const hardCodedKey = `{"key_ops":["encrypt","decrypt"],"ext":true,"kty":"oct","k":"PYhMHfAgHpVrsmNs59ZtRaHbof8Ubw9GsabcbsePBJk","alg":"A256GCM"}`;

type StreamServiceOptions = {
  streamId: string;
  onAddedEvents?: (events: StreamEvent[]) => unknown;
  onDeletedEvents?: (...ids: string[]) => unknown;
  onError?: (err: unknown) => unknown;
};

class StreamService {
  private isStarted: boolean = false;
  private options?: StreamServiceOptions;
  private abortCtrl!: AbortController;
  private lastId: string = "";
  private sharedKey!: CryptoKey;

  start = (options: StreamServiceOptions) => {
    if (this.isStarted) throw new ServiceAlreadyStartedError();
    this.isStarted = true;
    this.options = options;
    this.startAsync().catch((err) => options.onError?.(err));
  };

  stop = () => {
    this.assertServiceStarted();
    this.abortCtrl.abort();
    this.isStarted = false;
  };

  addStreamEvent = async (event: Omit<StreamEvent, "Id" | "Timestamp">) => {
    this.assertServiceStarted();
    if (event.Kind == "PasteText") {
      event.Payload = await encrypt(this.sharedKey, event.Payload);
    }
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
    await this.loadStatus();
    await this.loadLocalStreamEvents();
    await this.pollStreamEvents(this.abortCtrl.signal);
  };

  private loadLocalStreamEvents = async () => {
    const events = await persistence.getAllStreamEvents(this.options!.streamId);
    if (events && events.length > 0) await this.invokeOnAddedEvents(events);
  };

  private loadStatus = async () => {
    this.sharedKey = await importSharedKey(hardCodedKey);
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
    await this.invokeOnAddedEvents(events);
    this.lastId = await persistence.putStreamEvents(this.options!.streamId, events);
  };

  private invokeOnAddedEvents = async (events: StreamEvent[]) => {
    const decrypted = await Promise.all(
      events.map(async (e) => {
        if (e.Kind == "PasteText") {
          e.Payload = await decrypt(this.sharedKey, e.Payload);
        }
        return e;
      })
    );
    this.options!.onAddedEvents?.(decrypted);
  };
}

export default StreamService;

export { type StreamServiceOptions };
