import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

function toWebSocketTarget(httpTarget: string) {
  if (httpTarget.startsWith("https://")) {
    return `wss://${httpTarget.slice("https://".length)}`;
  }
  if (httpTarget.startsWith("http://")) {
    return `ws://${httpTarget.slice("http://".length)}`;
  }
  return httpTarget;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_BASE_URL || "http://localhost:8080";
  const wsTarget = env.VITE_WS_BASE_URL || toWebSocketTarget(apiTarget);

  return {
    plugins: [react(), tailwindcss(), svgr()],
    server: {
      proxy: {
        "/api": apiTarget,
        "/ws": { target: wsTarget, ws: true },
      },
    },
  };
});
