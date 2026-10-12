import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { request, type FullConfig } from "@playwright/test";

export const USERS = ["demo_admin", "demo_manager", "demo_employee"] as const;
export const authFile = (user: string) => path.join(__dirname, ".auth", `${user}.json`);

export default async function globalSetup(config: FullConfig) {
  const backend = process.env.E2E_BACKEND_DIR;
  if (backend) {
    const python = process.env.E2E_PYTHON ?? ".venv/bin/python";
    execSync(`DJANGO_DEBUG=1 ${python} manage.py seed_demo --reset`, { cwd: backend, stdio: "inherit" });
  }
  fs.mkdirSync(path.join(__dirname, ".auth"), { recursive: true });
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3040";
  for (const user of USERS) {
    const context = await request.newContext({ baseURL });
    const response = await context.post("/auth/login", { data: { username: user, password: "demo-pass-123" } });
    if (!response.ok()) throw new Error(`Could not sign in ${user}: ${response.status()}`);
    await context.storageState({ path: authFile(user) });
    await context.dispose();
  }
}
