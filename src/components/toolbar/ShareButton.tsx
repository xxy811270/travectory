"use client";

import { useState } from "react";

export function ShareButton() {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateShare = async () => {
    setCreating(true);
    const res = await fetch("/api/share", { method: "POST" });
    const link = await res.json();
    setShareUrl(`${window.location.origin}/share/${link.id}`);
    setCreating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("链接已复制到剪贴板");
  };

  const handleRevoke = async () => {
    if (!shareUrl) return;
    const id = shareUrl.split("/").pop();
    await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setShareUrl("");
  };

  return (
    <div className="relative">
      <button
        className="px-3 py-1 text-xs border border-border rounded hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        分享
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-surface border border-border rounded shadow-lg z-50 p-3">
          <div className="text-sm font-medium mb-2">分享路书</div>
          {shareUrl ? (
            <div className="space-y-2">
              <div className="text-xs text-text-muted">只读分享链接（任何人可查看）：</div>
              <input
                className="w-full px-2 py-1 text-xs border border-border rounded bg-gray-50"
                value={shareUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark"
                  onClick={handleCopy}
                >
                  复制链接
                </button>
                <button
                  className="px-3 py-1 text-xs text-danger border border-danger/30 rounded hover:bg-red-50"
                  onClick={handleRevoke}
                >
                  关闭分享
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-text-muted">
                创建只读分享链接，访问者可查看完整路书但无法编辑。
              </div>
              <button
                className="w-full py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                onClick={handleCreateShare}
                disabled={creating}
              >
                {creating ? "创建中..." : "生成分享链接"}
              </button>
            </div>
          )}
          <button
            className="w-full mt-2 py-1 text-xs text-text-muted hover:text-text"
            onClick={() => setOpen(false)}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
