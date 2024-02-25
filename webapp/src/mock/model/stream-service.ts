const mockStreamService = {
  start: jest.fn(),
  stop: jest.fn(),
};

const mock = jest.mock("../../model/stream-service", () => {
  return jest.fn().mockImplementation(() => mockStreamService);
});

export default mock;
export { mockStreamService };
