import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { join, resolve } from "node:path";

/**
 * Development rejimində Mock API-ni (port 4000) avtomatik işə salır və izləyir.
 * Server dayanarsa (proses bağlanıb, terminal qapanıb) 5 saniyə ərzində yenidən qaldırılır —
 * beləliklə səhifələrdə "Məlumat yüklənmədi" xətası görünmür. Söndürmək üçün: MOCK_AUTOSTART=0.
 */

const PORT = 4000;
let child: ChildProcess | null = null;
let started = false;

function alive() {
  return new Promise<boolean>((done) => {
    const socket = connect(PORT, "127.0.0.1");
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); done(true); });
    socket.once("timeout", () => { socket.destroy(); done(false); });
    socket.once("error", () => done(false));
  });
}

export function ensureMockServer(appDir: string) {
  if (started || process.env.MOCK_AUTOSTART === "0") return;
  started = true;
  const mocksDir = resolve(appDir, "../../packages/mocks");
  const cli = join(mocksDir, "node_modules/tsx/dist/cli.mjs");
  if (!existsSync(cli)) {
    console.warn("[mock] tsx tapılmadı — Mock API-ni əl ilə işə salın: pnpm mock");
    return;
  }
  let checking = false;
  const check = async () => {
    if (checking || (child && child.exitCode === null)) return;
    checking = true;
    try {
      if (await alive()) return;
      child = spawn(process.execPath, [cli, "src/server.ts"], { cwd: mocksDir, stdio: ["ignore", "inherit", "inherit"] });
      child.once("exit", () => { child = null; });
      console.log(`[mock] Mock API işə salındı: http://localhost:${PORT}`);
    } finally {
      checking = false;
    }
  };
  void check();
  setInterval(check, 5000).unref();
  const stop = () => child?.kill();
  process.once("exit", stop);
}
