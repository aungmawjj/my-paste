import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import {
  ChakraProvider,
  ColorModeScript,
  ThemeConfig,
  extendTheme,
} from "@chakra-ui/react";
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

const themeConfig: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const theme = extendTheme({
  config: themeConfig,
  styles: {
    global: {
      body: {
        bg: "gray.100",
        _dark: {
          bg: "gray.900",
        },
      },
    },
  },
  colors: {
    brand: {
      50: "#F7FAFC",
      100: "#EDF2F7",
      200: "#E2E8F0",
      300: "#CBD5E0",
      400: "#A0AEC0",
      500: "#1A202C",
      600: "#1A202C",
      700: "#171923",
      800: "#171923",
      900: "#171923",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorModeScript initialColorMode={themeConfig.initialColorMode} />
    <ChakraProvider theme={theme}>
      <RecoilRoot>
        <RouterProvider router={router} />
      </RecoilRoot>
    </ChakraProvider>
  </StrictMode>
);
