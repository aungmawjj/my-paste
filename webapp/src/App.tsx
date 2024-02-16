import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import Loading from "./Loading";
import { User } from "./model";
import TopBar from "./TopBar";
import { Box, useConst } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

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
          window.location.assign("/login");
          return;
        }
        // might be offline, for now just leave as loading
        console.log("authenticate failed:", err);
      });
    return () => ctrl.abort();
  }, []);

  const topBarHeight = useConst("72px");
  const px = useConst({ base: 4, md: 20, lg: 40, xl: 60, "2xl": 80 });

  if (!user) return <Loading />;
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
