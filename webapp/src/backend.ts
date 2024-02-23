import axios from "axios";
import { StreamEvent, User } from "./model";

class UnAuthorizedError extends Error {}

function authenticate(signal: AbortSignal) {
  return axios
    .post<User>("/api/auth/authenticate", null, { signal: signal })
    .then((resp) => resp.data)
    .catch((err: Error) => {
      if (axios.isAxiosError(err) && err.response?.status == 401) throw new UnAuthorizedError();
      throw err;
    });
}

function addStreamEvents(body: Partial<StreamEvent>) {
  return axios.post("/api/event", body);
}

function readStreamEvents(signal: AbortSignal, lastId: string) {
  return axios.get<StreamEvent[]>("/api/event", { signal: signal, params: { lastId } }).then((resp) => resp.data);
}

function deleteStreamEvents(...ids: string[]) {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("id", id));
  return axios.delete("/api/event", { params: params });
}

export { UnAuthorizedError, authenticate, addStreamEvents, readStreamEvents, deleteStreamEvents };
