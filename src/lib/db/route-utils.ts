import { NextRequest, NextResponse } from "next/server";
import { runWithUser } from "./context";

export function withUser<F extends (...args: never[]) => unknown>(handler: F): F {
  return ((...args: unknown[]) => {
    const req = args[0] as NextRequest;
    const userId = req.headers.get("x-user-id") || "default";
    const projectId = req.headers.get("x-project-id") || userId; // fallback to userId
    return runWithUser(userId, () => {
      // Set project context
      const { setCurrentProject } = require("./context");
      setCurrentProject(projectId);
      return handler(...args as never[]);
    });
  }) as unknown as F;
}
