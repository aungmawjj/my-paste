import _ from "lodash";

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireNotAborted(signal: AbortSignal) {
  if (signal.aborted) throw Error("aborted");
}

function notNil<T>(e: T | undefined | null): e is T {
  return !_.isNil(e);
}

export { delay, requireNotAborted, notNil as isNotNil };
