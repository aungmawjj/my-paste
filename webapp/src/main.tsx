import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Pastes from "./Pastes.tsx";
import AddPaste from "./AddPaste.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: <Pastes />,
      },
      {
        path: "add-paste",
        element: <AddPaste />,
      },
    ],
  },
]);

const theme = extendTheme({
  colors: {
    brand: {
      100: "#A0AEC0",
      500: "#2D3748",
      900: "#171923",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>
);
