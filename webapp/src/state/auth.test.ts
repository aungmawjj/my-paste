import { act, renderHook } from "../test-utils";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { useAuthState } from "./auth";
import * as persistence from "../model/persistence";
import { fakeUser } from "../test-data";

const server = setupServer(http.post("/api/auth/authenticate", () => HttpResponse.json(fakeUser)));

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test("authenticate success", async () => {
  const { result } = renderHook(() => useAuthState());
  await act(async () => {
    await result.current.loadUser(new AbortController().signal);
  });
  expect(result.current.offline).toEqual(false);
  expect(result.current.user).toEqual(fakeUser);
  expect(await persistence.getCurrentUser()).toEqual(fakeUser);
}, 1000);

test("unauthorized", async () => {
  await persistence.putCurrentUser(fakeUser);
  server.use(http.post("/api/auth/authenticate", () => HttpResponse.json({}, { status: 401 })));
  const { result } = renderHook(() => useAuthState());
  await act(async () => {
    await expect(result.current.loadUser(new AbortController().signal)).rejects.toThrow();
  });
  expect(result.current.offline).toEqual(false);
  expect(result.current.user).toBeUndefined();
  expect(await persistence.getCurrentUser()).toBeUndefined();
}, 1000);

test("offline", async () => {
  await persistence.putCurrentUser(fakeUser);
  server.use(http.post("/api/auth/authenticate", () => HttpResponse.error()));
  const { result } = renderHook(() => useAuthState());
  await act(async () => {
    await result.current.loadUser(new AbortController().signal);
  });
  expect(result.current.offline).toEqual(true);
  expect(result.current.user).toEqual(fakeUser);
}, 1000);
