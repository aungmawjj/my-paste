import axios from "axios";
import { StreamEvent, UnAuthorizedError, User } from "./types";
import { delay, requireNotAborted } from "./utils";

function authenticate(signal: AbortSignal) {
  return axios
    .post<User>("/api/auth/authenticate", null, { signal: signal })
    .then((resp) => resp.data)
    .catch((err: Error) => {
      if (axios.isAxiosError(err) && err.response?.status == 401) throw new UnAuthorizedError();
      throw err;
    });
}

function logout() {
  return axios.post("/api/auth/logout", null);
}

function addStreamEvent(event: Omit<StreamEvent, "Id" | "Timestamp">) {
  return axios.post<StreamEvent>("/api/event", event).then((resp) => resp.data);
}

function readStreamEvents(signal: AbortSignal, lastId: string) {
  return axios.get<StreamEvent[]>("/api/event", { signal: signal, params: { lastId } }).then((resp) => resp.data);
}

function deleteStreamEvents(...ids: string[]) {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("id", id));
  return axios.delete("/api/event", { params: params });
}

async function longPoll(signal: AbortSignal, fetcher: () => Promise<void>) {
  while (!signal.aborted) {
    try {
      await fetcher();
      await delay(10);
    } catch (err) {
      requireNotAborted(signal);
      console.debug("failed to fetch, error:", err);
      await delay(5000);
    }
  }
}

export { authenticate, logout, addStreamEvent, readStreamEvents, deleteStreamEvents, longPoll };
