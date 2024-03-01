import { renderHook } from "../test-utils";
import { fakeEvents } from "../test-data";
import { useStream } from "./stream";
import { setupServer } from "msw/node";
import { HttpResponse, delay, http } from "msw";

const server = setupServer(
  http.get("/api/event", async ({ request }) => {
    const url = new URL(request.url);
    const lastId = url.searchParams.get("lastId");
    if (!lastId) return HttpResponse.json(fakeEvents.slice(0, 1));
    if (lastId == "1") return HttpResponse.json(fakeEvents.slice(1));
    await delay(5000);
    return HttpResponse.json([]);
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test("initial state", () => {
  const { result } = renderHook(() => useStream());
  expect(result.current.pastes).toEqual([]);
});
