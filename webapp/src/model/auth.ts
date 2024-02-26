import { OptionalPromise, UnAuthorizedError, User } from "./types";
import * as backend from "./backend";
import * as persistence from "./persistence";

async function getLoginedUser(signal: AbortSignal): Promise<{ user: User; offline: boolean }> {
  let user = await authenticate(signal);
  if (user) return { user, offline: false };

  user = await persistence.getCurrentUser();
  if (user) return { user, offline: true };
  throw new Error("offline and no logined user");
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

export { getLoginedUser };
