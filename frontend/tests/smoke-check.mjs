import fs from "node:fs";

const requiredPaths = [
  "proxy.ts",
  "app/auth/signup/page.tsx",
  "app/profile/setup/page.tsx",
  "app/dashboard/page.tsx",
  "app/request/[id]/page.tsx",
  "app/messages/[id]/page.tsx",
  "lib/api/client.ts",
];

for (const relativePath of requiredPaths) {
  if (!fs.existsSync(new URL(`../${relativePath}`, import.meta.url))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

const proxySrc = fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
if (!/export function proxy\(/.test(proxySrc)) {
  throw new Error("proxy.ts must export function proxy (Next.js 16 network boundary)");
}

const requestPage = fs.readFileSync(new URL("../app/request/[id]/page.tsx", import.meta.url), "utf8");
if (!/\/api\/requests/.test(requestPage)) {
  throw new Error("Request flow is not wired to /api/requests");
}

const chatPage = fs.readFileSync(new URL("../app/messages/[id]/page.tsx", import.meta.url), "utf8");
if (!/\/api\/conversations\/.+\/messages/.test(chatPage)) {
  throw new Error("Chat flow is not wired to /api/conversations/{id}/messages");
}

console.log("frontend smoke checks passed");
