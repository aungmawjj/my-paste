import { setupServer } from "msw/node";
import { HttpResponse, delay, http } from "msw";
import StreamService from "./stream-service";
import { fakeEvents } from "../test-data";

const testStreamId = "test-stream";

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

test("cannot start service more than once", () => {
  server.use(http.get("/api/event", () => HttpResponse.error()));
  const streamService = new StreamService();
  expect(() => streamService.start({ streamId: testStreamId })).not.toThrow();
  expect(() => streamService.start({ streamId: testStreamId })).toThrow();
  streamService.stop();
  expect(() => streamService.start({ streamId: testStreamId })).not.toThrow();
  streamService.stop();
});
