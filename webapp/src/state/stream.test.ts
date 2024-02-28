import { renderHook, act } from "../test-utils";
import { StreamServiceOptions } from "../model/stream-service";
import { fakeEvents, fakeUser } from "../test-data";

const mockStart = jest.fn();
jest.mock("../model/stream-service", () => jest.fn().mockReturnValue({ start: mockStart }));

import { useStreamState } from "./stream"; // import after mock

beforeEach(() => {
  mockStart.mockClear();
});

test("initial state", () => {
  const { result } = renderHook(() => useStreamState());
  expect(result.current.pastes).toEqual([]);
  expect(result.current.streamService).toBeDefined();
  expect(result.current.startStreamService).toBeDefined();
});

test("start stream service", () => {
  const { result } = renderHook(() => useStreamState());
  result.current.startStreamService(fakeUser);
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test("start stream service with correct options", () => {
  let options: StreamServiceOptions | undefined;
  mockStart.mockImplementation((opts: StreamServiceOptions) => (options = opts));

  const { result } = renderHook(() => useStreamState());
  result.current.startStreamService(fakeUser);

  expect(options).toBeDefined();
  expect(options?.streamId).toEqual(fakeUser.Email);
  expect(options?.onAddedPastes).toBeDefined();
  expect(options?.onDeletedPastes).toBeDefined();
  expect(options?.onError).toBeDefined();
});

test("state update", () => {
  let options: StreamServiceOptions | undefined;
  mockStart.mockImplementation((opts: StreamServiceOptions) => (options = opts));

  const { result } = renderHook(() => useStreamState());
  result.current.startStreamService(fakeUser);

  act(() => {
    options?.onAddedPastes?.([...fakeEvents]);
  });
  expect(result.current.pastes).toEqual([...fakeEvents].reverse());

  act(() => {
    options?.onDeletedPastes?.(fakeEvents[0].Id);
  });
  expect(result.current.pastes).toEqual(fakeEvents.slice(1));
});
