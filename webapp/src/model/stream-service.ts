import {
  OptionalPromise,
  ServiceAlreadyStartedError,
  ServiceNotStartedError,
  StreamEvent,
  StreamStatus,
} from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";
import { delay, isNotNil, requireNotAborted } from "./utils";
import { decrypt, encrypt } from "./encryption";
import { getOrCreateEncryptionKey } from "./device";

type StreamServiceOptions = {
  streamId: string;
  onLoadedCache?: () => unknown;
  onAddedPastes?: (events: StreamEvent[]) => unknown;
  onDeletedPastes?: (...ids: string[]) => unknown;
  onError?: (err: unknown) => unknown;
};

class StreamService {
  private isStarted: boolean = false;
  private options!: StreamServiceOptions;
  private abortCtrl!: AbortController;
  private status!: StreamStatus;

  start = (options: StreamServiceOptions) => {
    if (this.isStarted) throw new ServiceAlreadyStartedError();
    this.isStarted = true;
    this.options = options;
    this.startAsync().catch((err) => options.onError?.(err));
  };

  stop = () => {
    this.requireServiceStarted();
    this.abortCtrl.abort();
    this.isStarted = false;
  };

  addPasteText = async (payload: string, isSensitive: boolean) => {
    this.requireServiceStarted();
    return backend.addStreamEvent({
      Kind: "PasteText",
      Payload: await encrypt(this.status.EncryptionKey, payload),
      IsSensitive: isSensitive,
    });
  };

  deleteStreamEvents = async (...ids: string[]) => {
    this.requireServiceStarted();
    await Promise.all([
      backend.deleteStreamEvents(...ids),
      persistence.deleteStreamEvents(this.options.streamId, ...ids),
    ]);
    this.options.onDeletedPastes?.(...ids);
  };

  private requireServiceStarted = () => {
    if (!this.isStarted) throw new ServiceNotStartedError();
  };

  private startAsync = async () => {
    const ctrl = new AbortController();
    this.abortCtrl = ctrl;
    await this.loadStatus(ctrl.signal);
    await this.loadLocalStreamEvents();
    this.options.onLoadedCache?.();
    await this.pollStreamEvents(ctrl.signal);
  };

  private loadLocalStreamEvents = async () => {
    const pastes = await persistence.getAllStreamEvents(this.options.streamId);
    if (pastes && pastes.length > 0) await this.options.onAddedPastes?.(pastes);
  };

  private loadStatus = async (signal: AbortSignal) => {
    const status = await persistence.getStreamStatus(this.options.streamId);
    if (status) {
      this.status = status;
      return;
    }
    this.status = {
      StreamId: this.options?.streamId,
      EncryptionKey: await getOrCreateEncryptionKey(signal),
      LastId: "",
    };
    await persistence.putStreamStatus(this.status);
  };

  private pollStreamEvents = async (signal: AbortSignal) => {
    while (!signal.aborted) {
      try {
        await this.fetchStreamEvents(signal);
        await delay(10);
      } catch (err) {
        requireNotAborted(signal);
        console.debug("fetch stream events failed!", err);
        await delay(5000);
      }
    }
  };

  private fetchStreamEvents = async (signal: AbortSignal) => {
    const events = await backend.readStreamEvents(signal, this.status.LastId);
    if (events.length == 0) return;
    const pastes = events.filter((e) => e.Kind == "PasteText");
    const decrypted = await Promise.all(pastes.map(this.decryptPaste)).then((e) => e.filter(isNotNil));
    this.options.onAddedPastes?.(decrypted);
    this.status.LastId = await persistence.putStreamEvents(this.options.streamId, decrypted);
  };

  private decryptPaste = async (event: StreamEvent): OptionalPromise<StreamEvent> => {
    if (event.Kind != "PasteText") return event;
    try {
      return { ...event, Payload: await decrypt(this.status.EncryptionKey, event.Payload) };
    } catch (err) {
      console.debug("decrypt error:", event.Payload, err);
    }
  };
}

export default StreamService;

export { type StreamServiceOptions };
