import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import Pastes from "./Pastes";

type User = Record<string, string>;

function App() {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    axios
      .post("/api/auth/logout", null)
      .then(() => {
        window.location.replace("/login");
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    axios
      .post<User>("/api/auth/authenticate", null, { signal: ctrl.signal })
      .then((resp) => {
        setUser(resp.data);
        setLoading(false);
      })
      .catch((err: Error | AxiosError) => {
        if (axios.isAxiosError(err) && err.response?.status == 401) {
          window.location.replace("/login");
          return;
        }
        console.error("authenticate failed:", err);
        // might be offline, for now just leave as loading
      });
    return () => ctrl.abort();
  }, []);

  return loading ? (
    <div
      style={{
        height: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
      }}
    >
      Loading...
    </div>
  ) : (
    <>
      <div
        style={{
          height: 56,
          position: "fixed",
          top: 0,
          background: "white",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        {user?.Name} <button onClick={handleLogout}>Logout</button>
      </div>
      <div style={{ paddingTop: 56 }}>
        <Pastes />
      </div>
    </>
  );
}

export default App;
