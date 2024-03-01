import { fakeUser } from "../test-data";
import { act, renderHook } from "../test-utils";

const mockGetLoginedUser = jest.fn().mockReturnValue({ user: fakeUser, offline: true });
jest.mock("../domain/auth", () => ({ getLoginedUser: mockGetLoginedUser }));

import { useAuth } from "./auth"; // import after mock

beforeEach(() => {
  mockGetLoginedUser.mockClear();
});

describe("loadUser", () => {
  test("offline", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.loadUser(new AbortController().signal);
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.offline).toEqual(true);
  }, 1000);

  test("online", async () => {
    mockGetLoginedUser.mockReturnValue({ user: fakeUser, offline: false });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.loadUser(new AbortController().signal);
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.offline).toEqual(false);
  }, 1000);

  test("failed", async () => {
    mockGetLoginedUser.mockImplementation(() => {
      throw new Error();
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await expect(result.current.loadUser(new AbortController().signal)).rejects.toThrow();
    });

    expect(result.current.user).toEqual(undefined);
    expect(result.current.offline).toEqual(false);
  }, 1000);
});
