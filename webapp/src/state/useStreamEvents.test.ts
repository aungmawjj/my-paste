import { renderHook } from "@testing-library/react";
import useStreamEvents from "./useStreamEvents";
import { RecoilRoot } from "recoil";
import { act } from "react-dom/test-utils";
import { setupServer } from "msw/node";
import { HttpResponse, delay, http } from "msw";
import { StreamEvent } from "../model";
import _ from "lodash";

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

test("initial state", () => {
  const { result } = renderHook(() => useStreamEvents(), {
    wrapper: RecoilRoot,
  });
  expect(result.current.streamEvents).toStrictEqual([]);
});

test("poll events", async () => {
  const { result } = renderHook(() => useStreamEvents(), {
    wrapper: RecoilRoot,
  });
  await act(async () => {
    const ctrl = new AbortController();
    result.current.pollStreamEvents(ctrl.signal).catch(() => {});
    await delay(100);
    ctrl.abort();
  });
  expect(result.current.streamEvents).toStrictEqual(_.reverse(fakeEvents));
}, 1000);
