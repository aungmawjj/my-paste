/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from "react";
import { render, renderHook, RenderHookOptions, RenderOptions } from "@testing-library/react";
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

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

const customRenderHook = <R,>(cb: (_: unknown) => R, options?: Omit<RenderHookOptions<unknown>, "wrapper">) => {
  return renderHook(cb, { wrapper: AllTheProviders, ...options });
};

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook, customRender };
