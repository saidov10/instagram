"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ShieldAlert, Flag, MessageSquareWarning, BadgeCheck, Search } from "lucide-react";
import { RootState } from "../../store/store";
import { api } from "../../services/api";

/**
 * Internal-only moderation dashboard. The backend does not role-gate get-reports/
 * resolve-report/get-appeals/resolve-appeal, so access is gated here with a hardcoded
 * allow-list — add trusted usernames below. Never link this route from consumer nav.
 */
const ADMIN_USERNAMES: string[] = [
  // "your-admin-username",
];

interface QueueItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  resolutionNote: string | null;
  createAt: string;
  reporterId?: string;
  userId?: string;
}

function QueueTab({
  kind,
  fetchFn,
  resolveFn,
}: {
  kind: "report" | "appeal";
  fetchFn: (status?: string) => Promise<any[]>;
  resolveFn: (id: string, status: string, note?: string) => Promise<any>;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetchFn(statusFilter || undefined)
      .then((list) => setItems(list || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleResolve = async (id: string, status: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await resolveFn(id, status, notes[id] || undefined);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(`Failed to resolve ${kind}:`, err);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const resolveOptions = kind === "report" ? ["RESOLVED", "DISMISSED"] : ["APPROVED", "REJECTED"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {["PENDING", "RESOLVED", "DISMISSED", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer ${
              statusFilter === s ? "bg-black text-white dark:bg-white dark:text-black" : "glass hover:shadow-soft"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full h-24 rounded-xl shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">Очередь пуста.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-zinc-500">
                  {item.targetType} #{item.targetId}
                </span>
                <span className="text-xs text-zinc-500">{new Date(item.createAt).toLocaleString()}</span>
              </div>
              <p className="text-sm font-semibold">{item.reason}</p>
              {item.resolutionNote && <p className="text-xs text-zinc-500">Note: {item.resolutionNote}</p>}
              {item.status === "PENDING" && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={notes[item.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    placeholder="Заметка о решении (необязательно)"
                    className="flex-1 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                  {resolveOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleResolve(item.id, opt)}
                      disabled={busy[item.id]}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Internal verified-badge tool. The backend does not admin-gate set-verified-badge — this is gated here. */
function VerifyTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const search = async () => {
    const q = query.trim().replace(/^@/, "");
    if (!q) return;
    setLoading(true);
    try {
      const list = await api.user.getUsers({ userName: q, pageSize: 10 });
      setResults(list || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBadge = async (u: any) => {
    const id = u.id || u.userId;
    const next = !u.isVerified;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.user.setVerifiedBadge(id, next);
      setResults((prev) => prev.map((x) => ((x.id || x.userId) === id ? { ...x, isVerified: next } : x)));
    } catch (err) {
      console.error("Failed to set verified badge:", err);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Имя пользователя"
          className="flex-1 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button onClick={search} className="btn-primary text-sm px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5">
          <Search className="w-4 h-4" /> Найти
        </button>
      </div>
      {loading ? (
        <div className="w-full h-16 rounded-xl shimmer" />
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">Введите имя пользователя, чтобы найти аккаунт.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((u) => {
            const id = u.id || u.userId;
            return (
              <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {u.userName || u.username}
                  {u.isVerified && <BadgeCheck className="w-4 h-4 text-[#3897F0]" />}
                </span>
                <button
                  onClick={() => toggleBadge(u)}
                  disabled={busy[id]}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer disabled:opacity-50"
                >
                  {u.isVerified ? "Снять галочку" : "Верифицировать"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ModerationDashboard() {
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [tab, setTab] = useState<"reports" | "appeals" | "verify">("reports");

  const isAllowed = !!currentUser && ADMIN_USERNAMES.includes(currentUser.username);

  if (!currentUser) return null;

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-black dark:text-white">
        <ShieldAlert className="w-10 h-10 text-zinc-400" />
        <h2 className="text-lg font-bold">Доступ запрещён</h2>
        <p className="text-sm text-zinc-500 max-w-xs">Эта панель доступна только внутренней команде модерации.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 text-black dark:text-white">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" /> Модерация (внутренний инструмент)
      </h1>
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <button
          onClick={() => setTab("reports")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer ${
            tab === "reports" ? "border-current" : "border-transparent text-zinc-500"
          }`}
        >
          <Flag className="w-4 h-4" /> Жалобы
        </button>
        <button
          onClick={() => setTab("appeals")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer ${
            tab === "appeals" ? "border-current" : "border-transparent text-zinc-500"
          }`}
        >
          <MessageSquareWarning className="w-4 h-4" /> Апелляции
        </button>
        <button
          onClick={() => setTab("verify")}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer ${
            tab === "verify" ? "border-current" : "border-transparent text-zinc-500"
          }`}
        >
          <BadgeCheck className="w-4 h-4" /> Верификация
        </button>
      </div>

      {tab === "reports" ? (
        <QueueTab kind="report" fetchFn={api.report.getReports} resolveFn={api.report.resolveReport} />
      ) : tab === "appeals" ? (
        <QueueTab kind="appeal" fetchFn={api.report.getAppeals} resolveFn={api.report.resolveAppeal} />
      ) : (
        <VerifyTab />
      )}
    </div>
  );
}
