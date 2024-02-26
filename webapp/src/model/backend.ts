import axios from "axios";
import { StreamEvent, UnAuthorizedError, User } from "./types";

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

function addStreamEvent(event: Partial<StreamEvent>) {
  return axios.post("/api/event", event);
}

function readStreamEvents(signal: AbortSignal, lastId: string) {
  return axios.get<StreamEvent[]>("/api/event", { signal: signal, params: { lastId } }).then((resp) => resp.data);
}

function deleteStreamEvents(...ids: string[]) {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("id", id));
  return axios.delete("/api/event", { params: params });
}

export { authenticate, logout, addStreamEvent, readStreamEvents, deleteStreamEvents };
