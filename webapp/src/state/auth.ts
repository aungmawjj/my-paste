import { atom, useRecoilState } from "recoil";
import { useCallback } from "react";
import { UnAuthorizedError, User } from "../model/types";
import * as backend from "../model/backend";
import * as persistence from "../model/persistence";

const authState = atom<{
  offline: boolean;
  user?: User;
}>({
  key: "authState",
  default: { offline: false },
});

function useAuthState() {
  const [{ offline, user }, setAuthState] = useRecoilState(authState);

  const setOffline = useCallback((offline: boolean) => setAuthState((prev) => ({ ...prev, offline })), [setAuthState]);
  const setUser = useCallback((user: User) => setAuthState((prev) => ({ ...prev, user })), [setAuthState]);

  const authenticate = useCallback(async (signal: AbortSignal, retry: number = 3): Promise<User | undefined> => {
    if (retry < 0) return;
    if (signal.aborted) return;
    try {
      const user = await backend.authenticate(signal);
      await persistence.putCurrentUser(user);
      return user;
    } catch (err) {
      if (err instanceof UnAuthorizedError) {
        await persistence.deleteCurrentUser();
        throw err;
      }
      console.debug("authenticate error: ", err);
      return authenticate(signal, retry - 1);
    }
  }, []);

  const loadUser = useCallback(
    async (signal: AbortSignal) => {
      let user = await authenticate(signal);
      if (signal.aborted) return;
      if (user) return setUser(user);

      setOffline(true);
      user = await persistence.getCurrentUser();
      if (signal.aborted) return;
      if (user) return setUser(user);
      throw new Error("offline and no logined user");
    },
    [authenticate, setOffline, setUser]
  );

  return {
    offline,
    user,
    loadUser,
  };
}

export { useAuthState };
