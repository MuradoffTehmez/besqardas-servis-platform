import React from "react";
import type { Preview } from "@storybook/react-vite";
import { I18nProvider } from "../src/app/core/i18n";
import "../src/styles.css";
import "../src/app/app.css";

const preview: Preview = {
  globalTypes: {
    locale: {
      description: "Dil",
      toolbar: {
        title: "Dil",
        icon: "globe",
        items: [
          { value: "az", title: "Azərbaycan" },
          { value: "ru", title: "Русский" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "az" },
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    backgrounds: { options: { canvas: { name: "Canvas", value: "#f8fafc" }, surface: { name: "Surface", value: "#ffffff" } } },
  },
  decorators: [
    (Story, context) => (
      <I18nProvider locale={context.globals.locale ?? "az"}>
        <div lang={context.globals.locale ?? "az"}>
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
};

export default preview;
