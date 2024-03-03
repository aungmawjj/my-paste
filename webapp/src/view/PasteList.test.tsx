import { render, screen } from "../test-utils";
import { fakeEvents } from "../test-data";

const mockUseStream = jest.fn().mockReturnValue({ streamEvents: [], addPasteText: jest.fn() });
jest.mock("../model/stream", () => ({
  useStream: mockUseStream,
}));

import PasteList from "./PasteList"; // import after mock

test("empty", () => {
  render(<PasteList />);
  expect(screen.getByTestId("paste-list")).toBeInTheDocument();
});

test("with stream events", () => {
  mockUseStream.mockReturnValue({ streamService: jest.fn(), streamEvents: fakeEvents, addPasteText: jest.fn() });
  render(<PasteList />);
  fakeEvents.forEach((e) => expect(screen.getByText(e.Payload)).toBeInTheDocument());
});
