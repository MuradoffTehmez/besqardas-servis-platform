import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@sp/ui", "@sp/api-client", "@sp/mocks", "@sp/i18n", "@sp/utils"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.MOCK_API_URL ?? "http://127.0.0.1:4000"}/api/:path*` }];
  },
};
export default config;
