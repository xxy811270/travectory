import { NextRequest, NextResponse } from "next/server";
import { runWithUser } from "./context";

export function withUser<F extends (...args: never[]) => unknown>(
  handler: F
): F {
  return ((...args: unknown[]) => {
    const req = args[0] as NextRequest;
    const userId = req.headers.get("x-user-id") || "default";
    return runWithUser(userId, () => handler(...args as never[]));
  }) as unknown as F;
}
