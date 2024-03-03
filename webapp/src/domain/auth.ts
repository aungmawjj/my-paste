import { OptionalPromise, UnAuthorizedError, User } from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";

async function getLoginedUser(signal: AbortSignal): Promise<{ user: User; offline: boolean }> {
  // to make later db get calls faster, make get user call even thouugh not required for auth
  const storedUser = await persistence.getCurrentUser();
  const onlineUser = await authenticate(signal);
  if (onlineUser) return { user: onlineUser, offline: false };
  if (storedUser) return { user: storedUser, offline: true };
  throw new UnAuthorizedError();
}

async function authenticate(signal: AbortSignal, retry: number = 3): OptionalPromise<User> {
  try {
    const user = await backend.authenticate();
    await persistence.putCurrentUser(user);
    return user;
  } catch (err) {
    if (err instanceof UnAuthorizedError) {
      await persistence.deleteCurrentUser();
      throw err;
    }
    if (retry == 0) return;
    return authenticate(signal, retry - 1);
  }
}

async function logout() {
  await Promise.all([backend.logout(), persistence.deleteCurrentUser()]);
}

export { getLoginedUser, logout };
