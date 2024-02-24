import { useEffect, useState } from "react";
import LoadingPage from "./LoadingPage";
import { User } from "../model";
import TopBar from "./TopBar";
import { Box, useConst } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { useStreamState } from "../StreamState";
import * as backend from "../backend";
import { useStreamService } from "../StreamService";

function App() {
  const [user, setUser] = useState<User>();
  const { onAddedEvents, onDeletedEvents } = useStreamState();
  const streamService = useStreamService();

  useEffect(() => {
    const ctrl = new AbortController();
    backend
      .authenticate(ctrl.signal)
      .then(setUser)
      .catch((err) => {
        if (err instanceof backend.UnAuthorizedError) window.location.assign("/login");
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!user) return () => {};
    streamService.start(onAddedEvents, onDeletedEvents);
    return () => streamService.stop();
  }, [user, streamService, onAddedEvents, onDeletedEvents]);

  const topBarHeight = useConst("72px");
  const px = useConst({ base: 4, md: 20, lg: 40, xl: 60, "2xl": 80 });
  if (!user) return <LoadingPage />;

  return (
    <Box overflowX="hidden">
      <TopBar user={user} height={topBarHeight} px={px} />
      <Box pt={topBarHeight} px={px}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default App;
