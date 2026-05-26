"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPage() {
  const { setUser } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    setError("");

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setUser(data);
      // Reload to pick up user data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-80 bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-xl font-bold text-center mb-1">Travectory</h1>
        <p className="text-xs text-text-muted text-center mb-4">路书规划</p>

        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:border-primary"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <input
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:border-primary"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {error && (
            <div className="text-xs text-danger bg-red-50 p-2 rounded">{error}</div>
          )}
          <button
            className="w-full py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "处理中..." : isSignup ? "注册" : "登录"}
          </button>
        </div>

        <div className="text-center mt-3">
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => { setIsSignup(!isSignup); setError(""); }}
          >
            {isSignup ? "已有账号？点此登录" : "没有账号？点此注册"}
          </button>
        </div>
      </div>
    </div>
  );
}
