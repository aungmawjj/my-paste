import { useStreamState } from "./stream";
import { renderHook } from "../test-utils";

test("initial state", () => {
  const { result } = renderHook(() => useStreamState());
  expect(result.current.streamEvents).toEqual([]);
});
