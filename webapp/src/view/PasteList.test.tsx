import PasteList from "./PasteList";
import { render, screen } from "../test-utils";
import { StreamEvent } from "../model/types";
import { useStreamState } from "../state/stream";

jest.mock("../state/stream");
const mockedState: ReturnType<typeof useStreamState> = {
  streamEvents: [],
  startStreamService: jest.fn(),
  stopStreamService: jest.fn(),
  addStreamEvent: jest.fn(),
  deleteStreamEvents: jest.fn(),
};
const mockedHook = jest.mocked(useStreamState);
mockedHook.mockReturnValue(mockedState);

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  const now = () => new Date().getTime() / 1000;
  const fakeEvents: StreamEvent[] = [
    { Id: "1", Payload: "p1", Timestamp: now(), Kind: "", IsSensitive: false },
    { Id: "2", Payload: "p2", Timestamp: now(), Kind: "", IsSensitive: false },
  ];
  mockedHook.mockReturnValue({ ...mockedState, streamEvents: fakeEvents });
  render(<PasteList />);
  fakeEvents.forEach((e) => expect(screen.getByText(e.Payload)).toBeInTheDocument());
});
