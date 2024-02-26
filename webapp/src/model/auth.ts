import { OptionalPromise, UnAuthorizedError, User } from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";

// if either no local user, throw UnAuthorizedError
// if authenticate is successful, offline is false, otherwise true
async function getLoginedUser(signal: AbortSignal): Promise<{ user: User; offline: boolean }> {
  const storedUser = await persistence.getCurrentUser();
  if (!storedUser) throw new UnAuthorizedError();

  const onlineUser = await authenticate(signal);
  if (onlineUser) return { user: onlineUser, offline: false };

  return { user: storedUser, offline: true };
}

async function authenticate(signal: AbortSignal, retry: number = 3): OptionalPromise<User> {
  try {
    const user = await backend.authenticate(signal);
    await persistence.putCurrentUser(user);
    return user;
  } catch (err) {
    if (err instanceof UnAuthorizedError) {
      await persistence.deleteCurrentUser();
      throw err;
    }
    if (signal.aborted) return;
    if (retry == 0) return;
    return authenticate(signal, retry - 1);
  }
}

async function logout() {
  await Promise.all([backend.logout(), persistence.deleteCurrentUser()]);
}

export { getLoginedUser, logout };
