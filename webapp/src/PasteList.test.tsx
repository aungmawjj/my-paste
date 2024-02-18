import PasteList from "./PasteList";
import { render, screen } from "./test-utils";
import { StreamEvent } from "./model";
import { RecoilRoot } from "recoil";
import { streamEventsState } from "./useStreamEvents";

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  const now = () => new Date().getTime() / 1000;
  const fakeEvents: StreamEvent[] = [
    { Id: "1", Payload: "p1", Timestamp: now() },
    { Id: "2", Payload: "p2", Timestamp: now() },
  ];
  render(
    <RecoilRoot initializeState={(s) => s.set(streamEventsState, fakeEvents)}>
      <PasteList />
    </RecoilRoot>
  );
  fakeEvents.forEach((e) =>
    expect(screen.getByText(e.Payload)).toBeInTheDocument()
  );
});