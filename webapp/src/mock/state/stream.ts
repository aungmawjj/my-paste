import StreamService from "../../model/stream-service";
import { useStreamState } from "../../state/stream";
import { mockStreamService } from "../model/stream-service";

jest.mock("../../state/stream");

const mockStreamState: ReturnType<typeof useStreamState> = {
  streamService: mockStreamService as unknown as StreamService,
  streamEvents: [],
  startStreamService: jest.fn(),
};

const mockUseStreamState = jest.mocked(useStreamState);
mockUseStreamState.mockReturnValue(mockStreamState);

export { mockUseStreamState, mockStreamState };
