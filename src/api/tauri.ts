import { invoke } from "@tauri-apps/api/core";

export const invokeTauri = <T>(command: string, args?: Record<string, unknown>) =>
  invoke<T>(command, args);
