import { useEffect } from "react";
import { Box, useConst } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import LoadingPage from "./LoadingPage";
import TopBar from "./TopBar";
import { useStream } from "../model/stream";
import { useAuth } from "../model/auth";

function App() {
  const { user, offline, loadUser } = useAuth();
  const { listenToStreamEvents } = useStream();

  useEffect(() => {
    const ctrl = new AbortController();
    loadUser(ctrl.signal).catch(() => {
      if (ctrl.signal.aborted) return;
      window.location.assign("/login");
    });
    return () => ctrl.abort();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    listenToStreamEvents(ctrl.signal, user.Email, offline).catch(console.debug);
    return () => ctrl.abort();
  }, [user, offline, listenToStreamEvents]);

  const topBarHeight = useConst("72px");
  const px = useConst({ base: 4, md: 20, lg: 40, xl: 60, "2xl": 80 });

  return user ? (
    <Box overflowX="hidden">
      <TopBar user={user} height={topBarHeight} px={px} />
      <Box pt={topBarHeight} px={px}>
        <Outlet />
      </Box>
    </Box>
  ) : (
    <LoadingPage />
  );
}

export default App;
