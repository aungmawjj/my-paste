import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { fakeUser } from "../test-data";
import { getLoginedUser } from "./auth";
import * as persistence from "../model/persistence";

const server = setupServer(http.post("/api/auth/authenticate", () => HttpResponse.json(fakeUser)));

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test("authenticate success", async () => {
  const { user, offline } = await getLoginedUser(new AbortController().signal);
  expect(user).toEqual(fakeUser);
  expect(offline).toEqual(false);
  expect(await persistence.getCurrentUser()).toEqual(fakeUser);
}, 1000);

test("unauthorized", async () => {
  await persistence.putCurrentUser(fakeUser);
  server.use(http.post("/api/auth/authenticate", () => HttpResponse.json({}, { status: 401 })));

  await expect(getLoginedUser(new AbortController().signal)).rejects.toThrow();

  expect(await persistence.getCurrentUser()).toBeUndefined();
}, 1000);

test("offline", async () => {
  await persistence.putCurrentUser(fakeUser);
  server.use(http.post("/api/auth/authenticate", () => HttpResponse.error()));

  const { user, offline } = await getLoginedUser(new AbortController().signal);

  expect(user).toEqual(fakeUser);
  expect(offline).toEqual(true);
  expect(await persistence.getCurrentUser()).toEqual(fakeUser);
}, 1000);
