/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ChakraProvider>
      <RecoilRoot>
        <BrowserRouter>{children}</BrowserRouter>
      </RecoilRoot>
    </ChakraProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
