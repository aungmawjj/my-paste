import { render, screen } from "../test-utils";
import { fakeEvents } from "../test-data";

const mockUseStreamState = jest.fn().mockReturnValue({ streamService: jest.fn(), pastes: [] });
jest.mock("../state/stream", () => ({
  useStreamState: mockUseStreamState,
}));

import PasteList from "./PasteList"; // import after mock

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  mockUseStreamState.mockReturnValue({ streamService: jest.fn(), pastes: fakeEvents });
  render(<PasteList />);
  fakeEvents.forEach((e) => expect(screen.getByText(e.Payload)).toBeInTheDocument());
});
