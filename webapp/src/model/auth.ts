import { atom, useRecoilState } from "recoil";
import { useCallback } from "react";
import { User } from "../domain/types";
import { getLoginedUser } from "../domain/auth";

const authState = atom<{ user?: User; offline: boolean }>({
  key: "authState",
  default: { offline: false },
});

function useAuth() {
  const [{ user, offline }, setAuthState] = useRecoilState(authState);

  const loadUser = useCallback(
    async (signal: AbortSignal) => {
      const { user, offline } = await getLoginedUser(signal);
      setAuthState({ user, offline });
    },
    [setAuthState]
  );

  return {
    user,
    offline,
    loadUser,
  };
}

export { useAuth };
