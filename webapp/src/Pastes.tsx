import { useCallback, useState, useEffect } from "react";
import axios from "axios";

type Event = {
  Id: string;
  Payload: string;
  Timestamp: number;
};

function Pastes() {
  const [pastes, setPastes] = useState<Event[]>([]);
  const [payload, setPayload] = useState("");

  const onSubmit = useCallback((payload: string) => {
    axios.post("/api/event", { Payload: payload }).catch(console.error);
  }, []);

  const fetchEvents = useCallback((ctrl: AbortController, lastId: string) => {
    return axios
      .get<Event[]>("/api/event", {
        signal: ctrl.signal,
        params: { lastId: lastId },
      })
      .then((resp) => {
        setPastes((old) => [...old, ...resp.data]);
        return resp.data[resp.data.length - 1].Id;
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let loop = true;
    let lastId = "";
    const fetchLoop = async () => {
      while (loop) {
        lastId = await fetchEvents(ctrl, lastId);
      }
    };
    fetchLoop().catch(console.error);
    return () => {
      loop = false;
      ctrl.abort();
    };
  }, [fetchEvents]);

  return (
    <>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: "flex", flexDirection: "row", gap: 16 }}
      >
        <input
          placeholder="New Text"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
        <button type="submit" onClick={() => onSubmit(payload)}>
          Add
        </button>
      </form>

      <ul>
        {pastes.map((p) => (
          <li key={p.Id}>{p.Payload}</li>
        ))}
      </ul>
    </>
  );
}

export default Pastes;
