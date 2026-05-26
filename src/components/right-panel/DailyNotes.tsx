"use client";

import { useRef, useState, useCallback } from "react";
import { usePoiStore, useUiStore, useScheduleStore } from "@/stores";

interface DailyNotesProps {
  dayId: string;
  content: string;
}

export function DailyNotes({ dayId, content }: DailyNotesProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(content || "");
  const pois = usePoiStore((s) => s.pois);
  const updateDay = useScheduleStore((s) => s.updateDay);
  const setDirty = useUiStore((s) => s.setDirty);
  const [showPoiList, setShowPoiList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const currentHtml = editorRef.current?.innerHTML || html;
    setHtml(currentHtml);

    // Extract @mentions
    const mentionRegex = /@(\{poi:([^}]+)\})/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(currentHtml)) !== null) {
      mentions.push(match[2]);
    }

    updateDay(dayId, {
      notesContent: currentHtml,
      notesMentions: mentions,
    });
    setDirty(true);
    setSaving(false);
  }, [dayId, html, updateDay, setDirty]);

  const handleInsertMention = (poiId: string, poiName: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const mentionSpan = `<span contenteditable="false" style="background:#3b82f6;color:white;padding:1px 4px;border-radius:3px;font-size:11px;cursor:pointer;" data-poi-id="${poiId}" title="点击定位">@${poiName}</span>&nbsp;`;
    document.execCommand("insertHTML", false, mentionSpan);
    setShowPoiList(false);
    setMentionFilter("");
    editor.focus();
  };

  const filteredPois = pois.filter((p) =>
    p.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Formatting toolbar: bold, italic, list, link
  const execCmd = (cmd: string, val?: string) => {
    if (cmd === "createLink") {
      const url = prompt("输入链接 URL:");
      if (url) document.execCommand(cmd, false, url);
    } else if (cmd === "insertUnorderedList") {
      document.execCommand(cmd, false);
    } else {
      document.execCommand(cmd, false, val);
    }
    editorRef.current?.focus();
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">每日备注</span>
        <button
          className="text-[10px] px-2 py-0.5 bg-primary text-white rounded hover:bg-primary-dark"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 mb-1 flex-wrap">
        <button className="w-6 h-6 text-xs border rounded hover:bg-gray-50 font-bold" onClick={() => execCmd("bold")} title="加粗">B</button>
        <button className="w-6 h-6 text-xs border rounded hover:bg-gray-50 italic" onClick={() => execCmd("italic")} title="斜体">I</button>
        <button className="w-6 h-6 text-xs border rounded hover:bg-gray-50 underline" onClick={() => execCmd("underline")} title="下划线">U</button>
        <span className="w-px h-4 bg-border mx-0.5" />
        <button className="w-6 h-6 text-xs border rounded hover:bg-gray-50" onClick={() => execCmd("insertUnorderedList")} title="列表">•≡</button>
        <button className="w-6 h-6 text-xs border rounded hover:bg-gray-50" onClick={() => execCmd("createLink")} title="链接">🔗</button>
        <span className="w-px h-4 bg-border mx-0.5" />
        <div className="relative">
          <button
            className="px-2 h-6 text-xs border rounded hover:bg-gray-50"
            onClick={() => setShowPoiList(!showPoiList)}
            title="@提及 POI"
          >
            @POI
          </button>
          {showPoiList && (
            <div className="absolute bottom-full left-0 mb-1 w-40 max-h-32 overflow-y-auto bg-surface border border-border rounded shadow-lg">
              <input
                className="w-full px-2 py-1 text-xs border-b"
                placeholder="搜索 POI..."
                value={mentionFilter}
                onChange={(e) => setMentionFilter(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {filteredPois.slice(0, 10).map((poi) => (
                <div
                  key={poi.id}
                  className="px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertMention(poi.id, poi.name);
                  }}
                >
                  {poi.tag === "hotel" ? "🏨 " : "📍 "}
                  {poi.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        className="min-h-[80px] max-h-[200px] overflow-y-auto border border-border rounded p-2 text-xs focus:outline-none focus:border-primary"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        onBlur={handleSave}
        onClick={() => setShowPoiList(false)}
        data-placeholder="记录餐厅推荐、门票信息、电话... 输入 @ 可提及 POI"
        style={{ outline: "none" }}
      />
    </div>
  );
}
