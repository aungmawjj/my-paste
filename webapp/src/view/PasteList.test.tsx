import { render, screen } from "../test-utils";
import { fakeEvents } from "../test-data";

const mockUseStreamState = jest.fn().mockReturnValue({ streamEvents: [] });
jest.mock("../state/stream", () => ({ useStreamState: mockUseStreamState }));

import PasteList from "./PasteList"; // import after mock

beforeEach(() => {
  mockUseStreamState.mockClear();
});

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  mockUseStreamState.mockReturnValue({ streamEvents: fakeEvents });
  render(<PasteList />);
  fakeEvents.forEach((e) => expect(screen.getByText(e.Payload)).toBeInTheDocument());
});
