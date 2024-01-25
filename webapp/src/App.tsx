import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";

type User = Record<string, string>;

function App() {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    axios
      .post("/api/auth/logout", null)
      .then(() => {
        console.log("logout successful");
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
  return (
    <div
      style={{
        height: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
      }}
    >
      {loading ? (
        <>Loading...</>
      ) : (
        <>
          Hello {user?.Name} <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </div>
  );
}

export default App;
