import { atom, useRecoilState } from "recoil";
import { useCallback } from "react";
import { User } from "../model/types";
import { getLoginedUser } from "../model/auth";

const authState = atom<{ user?: User; offline: boolean }>({
  key: "authState",
  default: { offline: false },
});

function useAuthState() {
  const [{ user, offline }, setAuthState] = useRecoilState(authState);

  const setOffline = useCallback((offline: boolean) => setAuthState((prev) => ({ ...prev, offline })), [setAuthState]);
  const setUser = useCallback((user: User) => setAuthState((prev) => ({ ...prev, user })), [setAuthState]);

  const loadUser = useCallback(
    async (signal: AbortSignal) => {
      const { user, offline } = await getLoginedUser(signal);
      setUser(user);
      setOffline(offline);
    },
    [setOffline, setUser]
  );

  return {
    user,
    offline,
    loadUser,
  };
}

export { useAuthState };
