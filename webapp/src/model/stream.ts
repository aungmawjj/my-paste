import { atom, useRecoilState } from "recoil";
import { useCallback, useMemo } from "react";
import _ from "lodash";
import { StreamEvent, StreamStatus } from "../domain/types";
import * as backend from "../domain/backend";
import * as persistence from "../domain/persistence";
import { decrypt, encrypt } from "../domain/encryption";
import { filterNotNil, requireNotAborted } from "../domain/utils";
import { getOrCreateEncryptionKey } from "../domain/device";

const streamState = atom<{ pastes: StreamEvent[]; status?: StreamStatus }>({
  key: "streamState",
  default: { pastes: [] },
});

function useStream() {
  const [{ pastes, status }, setStreamState] = useRecoilState(streamState);

  const addPastesToState = useCallback(
    (events: StreamEvent[]) => {
      setStreamState((prev) => ({
        ...prev,
        pastes: _.uniqBy([...[...events].reverse(), ...prev.pastes], (e) => e.Id),
      }));
    },
    [setStreamState]
  );

  const deletePastesFromState = useCallback(
    (...ids: string[]) => {
      setStreamState((prev) => ({
        ...prev,
        pastes: _.filter(prev.pastes, (e) => !_.includes(ids, e.Id)),
      }));
    },
    [setStreamState]
  );

  const setStatusToState = useCallback(
    (status: StreamStatus) => setStreamState((prev) => ({ ...prev, status })),
    [setStreamState]
  );

  const addPasteText = useMemo(() => {
    return !status
      ? undefined
      : async (payload: string, isSensitive: boolean) => {
          return backend.addStreamEvent({
            Kind: "PasteText",
            Payload: await encrypt(status.EncryptionKey, payload),
            IsSensitive: isSensitive,
          });
        };
  }, [status]);

  const deletePastes = useMemo(() => {
    return !status
      ? undefined
      : async (...ids: string[]) => {
          await backend.deleteStreamEvents(...ids);
          await persistence.deleteStreamEvents(status.StreamId, ...ids);
          deletePastesFromState(...ids);
        };
  }, [status, deletePastesFromState]);

  const loadStatus = useCallback(
    async (signal: AbortSignal, streamId: string) => {
      let status = await persistence.getStreamStatus(streamId);
      if (!status) {
        status = { StreamId: streamId, EncryptionKey: await getOrCreateEncryptionKey(signal), LastId: "" };
        await persistence.putStreamStatus(status);
      }
      setStatusToState(status);
      return status;
    },
    [setStatusToState]
  );

  const listenToStreamEvents = useCallback(
    async (signal: AbortSignal, streamId: string, offline: boolean) => {
      await persistence.getAllStreamEvents(streamId).then(addPastesToState);
      if (offline) return;

      requireNotAborted(signal);
      const status = await loadStatus(signal, streamId);

      await backend.longPoll(signal, async () => {
        const events = await backend.readStreamEvents(signal, status.LastId);
        const pastes = await getDecryptedPastes(status.EncryptionKey, events);
        addPastesToState(pastes);
        await persistence.putStreamEvents(streamId, pastes);
      });
    },
    [loadStatus, addPastesToState]
  );

  return {
    pastes,
    addPasteText,
    deletePastes,
    listenToStreamEvents,
  };
}

async function getDecryptedPastes(key: CryptoKey, events: StreamEvent[]): Promise<StreamEvent[]> {
  async function decryptOrNull(p: StreamEvent) {
    try {
      return { ...p, Payload: await decrypt(key, p.Payload) };
    } catch (err) {
      console.debug("decrypt error:", p.Id, p.Payload, err);
    }
  }
  const pastes = events.filter((e) => e.Kind == "PasteText");
  return Promise.all(pastes.map(decryptOrNull)).then(filterNotNil);
}

export { useStream };
