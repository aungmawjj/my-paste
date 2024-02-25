import { useEffect } from "react";
import { Box, useConst } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import LoadingPage from "./LoadingPage";
import TopBar from "./TopBar";
import { useStreamState } from "../state/stream";
import { useAuthState } from "../state/auth";

function App() {
  const { user, loadUser } = useAuthState();
  const { streamService, startStreamService } = useStreamState();

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
    startStreamService(user);
    return streamService.stop;
  }, [user, streamService, startStreamService]);

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
