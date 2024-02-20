import App from "./App";
import { act, render, screen } from "./test-utils";
import { setupServer } from "msw/node";
import { HttpResponse, delay, http } from "msw";
import { User } from "./model";

const fakeUser: User = { Name: "john", Email: "j@g.co" };

const server = setupServer(
  http.post("/api/auth/authenticate", () => HttpResponse.json(fakeUser)),
  http.get("/api/event", () => HttpResponse.error())
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test("authenticate success", async () => {
  await act(async () => {
    render(<App />);
    await delay(10);
  });
  expect(window.location).not.toBeAt("/login");
  expect(screen.getByTestId("top-bar")).toBeInTheDocument();
  expect(screen.getByText(fakeUser.Name)).toBeInTheDocument();
  expect(screen.getByText(fakeUser.Email)).toBeInTheDocument();
}, 1000);

test("redirect to login page", async () => {
  server.use(
    http.post("/api/auth/authenticate", () => {
      return HttpResponse.json({}, { status: 401 });
    })
  );
  await act(async () => {
    render(<App />);
    await delay(10);
  });
  expect(window.location).toBeAt("/login");
});

test("offline", async () => {
  server.use(
    http.post("/api/auth/authenticate", () => {
      return HttpResponse.error();
    })
  );
  await act(async () => {
    render(<App />);
    await delay(10);
  });
  expect(window.location).not.toBeAt("/login");
  expect(screen.getByTestId("loading-page")).toBeInTheDocument();
});
