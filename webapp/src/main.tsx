import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import PasteList from "./PasteList.tsx";
import AddPaste from "./AddPaste.tsx";
import { RecoilRoot, RecoilEnv } from "recoil";

if (import.meta.env.MODE == "development") {
  RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: <PasteList />,
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
      500: "#1A202C",
      900: "#171923",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <RecoilRoot>
        <RouterProvider router={router} />
      </RecoilRoot>
    </ChakraProvider>
  </React.StrictMode>
);
