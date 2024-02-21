import axios from "axios";
import { StreamEvent, User } from "./model";

const backend = {
  authenticate: (signal: AbortSignal) => {
    return axios
      .post<User>("/api/auth/authenticate", null, { signal: signal })
      .then((resp) => resp.data)
      .catch((err: Error) => {
        if (axios.isAxiosError(err) && err.response?.status == 401) {
          window.location.assign("/login");
        }
        // might be offline, for now just leave as loading
        throw err;
      });
  },

  addStreamEvents: (body: Partial<StreamEvent>) => {
    return axios.post("/api/event", body);
  },

  readStreamEvents: (signal: AbortSignal, lastId: string) => {
    return axios
      .get<StreamEvent[]>("/api/event", { signal: signal, params: { lastId } })
      .then((resp) => resp.data);
  },

  deleteStreamEvents: (...ids: string[]) => {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("id", id));
    return axios.delete("/api/event", { params: params });
  },
};

export default backend;
