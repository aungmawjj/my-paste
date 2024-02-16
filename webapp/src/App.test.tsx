import App from "./App";
import { render, screen } from "./test-utils";
import { setupServer } from "msw/node";
import { HttpResponse, http, delay } from "msw";

const server = setupServer(
  http.post("/api/auth/authenticate", () => {
    return HttpResponse.json({}, { status: 401 });
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test("render loading", () => {
  render(<App />);
  expect(screen.queryByText(/loading/i)).toBeInTheDocument();
});

test("redirect to login page", async () => {
  render(<App />);
  await delay(10);
  expect(window.location).toBeAt("/login");
});
