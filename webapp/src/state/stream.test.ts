import { renderHook, act } from "../test-utils";
import { StreamServiceOptions } from "../model/stream-service";
import { fakeEvents, fakeUser } from "../test-data";
import { mockStreamService } from "../mock/model/stream-service";
import { useStreamState } from "./stream"; // import after mock

jest.mock("../model/stream-service");

beforeEach(() => {
  mockStreamService.start.mockClear();
  mockStreamService.stop.mockClear();
});

test("initial state", () => {
  const { result } = renderHook(() => useStreamState());
  expect(result.current.streamEvents).toEqual([]);
});

test("start stream service", () => {
  const { result } = renderHook(() => useStreamState());
  expect(result.current.streamEvents).toEqual([]);

  result.current.startStreamService(fakeUser);
  expect(mockStreamService.start).toHaveBeenCalledTimes(1);
});

test("start stream service with correct options", () => {
  const { result } = renderHook(() => useStreamState());

  let options: StreamServiceOptions | undefined;
  mockStreamService.start.mockImplementation((opts: StreamServiceOptions) => {
    options = opts;
  });

  result.current.startStreamService(fakeUser);

  expect(options).toBeDefined();
  expect(options?.streamId).toEqual(fakeUser.Email);
  expect(options?.onAddedEvents).toBeDefined();
  expect(options?.onDeletedEvents).toBeDefined();
  expect(options?.onError).toBeDefined();
});

test("state update", () => {
  const { result } = renderHook(() => useStreamState());

  let options: StreamServiceOptions | undefined;
  mockStreamService.start.mockImplementation((opts: StreamServiceOptions) => (options = opts));
  result.current.startStreamService(fakeUser);

  act(() => {
    options?.onAddedEvents?.([...fakeEvents]);
  });
  expect(result.current.streamEvents).toEqual([...fakeEvents].reverse());

  act(() => {
    options?.onDeletedEvents?.(fakeEvents[0].Id);
  });
  expect(result.current.streamEvents).toEqual(fakeEvents.slice(1));
});
