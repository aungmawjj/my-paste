import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import Pastes from "./Pastes";
import Loading from "./Loading";
import { User } from "./model";
import TopBar from "./TopBar";
import { Box } from "@chakra-ui/react";

function App() {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    const ctrl = new AbortController();
    axios
      .post<User>("/api/auth/authenticate", null, { signal: ctrl.signal })
      .then((resp) => {
        setUser(resp.data);
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

  if (!user) return <Loading />;
  return (
    <>
      <Box
        height="80px"
        width="100%"
        position="fixed"
        top={0}
        zIndex={1}
      >
        <TopBar user={user} />
      </Box>
      <Box pt="80px">
        <Pastes />
      </Box>
    </>
  );
}

export default App;
