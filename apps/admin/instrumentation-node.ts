import { ensureMockServer } from "@sp/mocks/autostart";

if (process.env.NODE_ENV === "development") ensureMockServer(process.cwd());
