import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import LoadingPage from "./LoadingPage";
import { User } from "./model";
import TopBar from "./TopBar";
import { Box, useConst } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import useStreamEvents from "./useStreamEvents";

function App() {
  const [user, setUser] = useState<User>();
  const { pollStreamEvents } = useStreamEvents();

  const authenticate = useCallback((signal: AbortSignal) => {
    axios
      .post<User>("/api/auth/authenticate", null, { signal: signal })
      .then((resp) => {
        setUser(resp.data);
      })
      .catch((err: Error) => {
        if (axios.isAxiosError(err) && err.response?.status == 401) {
          window.location.assign("/login");
          return;
        }
        // might be offline, for now just leave as loading
        console.info("failed to authenticate:", err);
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    authenticate(ctrl.signal);
    return () => ctrl.abort();
  }, [authenticate]);

  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    pollStreamEvents(ctrl.signal).catch(console.error);
    return () => ctrl.abort();
  }, [user, pollStreamEvents]);

  const topBarHeight = useConst("72px");
  const px = useConst({ base: 4, md: 20, lg: 40, xl: 60, "2xl": 80 });

  if (!user) return <LoadingPage />;
  return (
    <>
      <TopBar user={user} height={topBarHeight} px={px} />
      <Box pt={topBarHeight} px={px}>
        <Outlet />
      </Box>
    </>
  );
}

export default App;
