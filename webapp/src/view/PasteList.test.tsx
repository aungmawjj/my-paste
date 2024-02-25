import { render, screen } from "../test-utils";
import { mockUseStreamState, mockStreamState } from "../mock/state/stream";
import PasteList from "./PasteList"; // import after mock
import { fakeEvents } from "../test-data";

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  mockUseStreamState.mockReturnValue({ ...mockStreamState, streamEvents: [...fakeEvents] });
  render(<PasteList />);
  fakeEvents.forEach((e) => expect(screen.getByText(e.Payload)).toBeInTheDocument());
});
