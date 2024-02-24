import { setupServer } from "msw/node";
import { HttpResponse, delay, http } from "msw";
import { StreamEvent } from "./model";
import { StreamService } from "./StreamService";

const now = () => new Date().getTime() / 1000;
const fakeEvents: StreamEvent[] = [
  { Id: "1", Payload: "p1", Timestamp: now(), Kind: "", IsSensitive: false },
  { Id: "2", Payload: "p2", Timestamp: now(), Kind: "", IsSensitive: false },
];

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

test("cannot start more than once", () => {
  const streamService = new StreamService();
  streamService.start();
  expect(streamService.start).toThrow();
});
