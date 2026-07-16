"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import QRCode from "qrcode";
import { Camera, Copy, Check, ScanLine, User as UserIcon } from "lucide-react";
import { RootState } from "../store/store";
import { api, getFullImageUrl } from "../services/api";
import Avatar from "../components/Avatar";

export default function QrPage() {
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [tab, setTab] = useState<"mine" | "scan">("mine");

  // --- My code tab ---
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab !== "mine" || !currentUser) return;
    api.profile
      .getShareLink(currentUser.id)
      .then(async (link) => {
        const url = link?.webUrl || `${window.location.origin}/u/${currentUser.id}`;
        setWebUrl(url);
        setQrDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#000000", light: "#ffffff" } }));
      })
      .catch(async () => {
        const url = `${window.location.origin}/u/${currentUser.id}`;
        setWebUrl(url);
        setQrDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1 }));
      });
  }, [tab, currentUser]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: webUrl, title: currentUser?.username });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  // --- Scan tab ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanSupported, setScanSupported] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "scan") return;
    if (!("BarcodeDetector" in window)) {
      setScanSupported(false);
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // @ts-expect-error -- BarcodeDetector isn't in the default TS DOM lib yet
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              handleResolveCode(codes[0].rawValue);
              return;
            }
          } catch {
            // keep trying
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setScanError("Не удалось получить доступ к камере. Введите код вручную.");
      }
    };

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleResolveCode = async (code: string) => {
    if (resolving || !code.trim()) return;
    setResolving(true);
    setResolveError(null);
    try {
      const res = await api.following.followViaQr(code.trim());
      const targetId = res?.userId || res?.id || res?.followingUserId;
      router.push(targetId ? `/u/${targetId}` : "/");
    } catch (err: any) {
      setResolveError(err?.message || "Не удалось распознать код.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col gap-6 text-black dark:text-white">
      <h1 className="text-xl font-bold text-center">QR-код</h1>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-3 text-sm font-semibold cursor-pointer border-b-2 transition ${
            tab === "mine" ? "border-current" : "border-transparent text-zinc-450"
          }`}
        >
          Мой код
        </button>
        <button
          onClick={() => setTab("scan")}
          className={`flex-1 py-3 text-sm font-semibold cursor-pointer border-b-2 transition ${
            tab === "scan" ? "border-current" : "border-transparent text-zinc-450"
          }`}
        >
          Сканировать
        </button>
      </div>

      {tab === "mine" ? (
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-3xl p-6 card flex flex-col items-center gap-4">
            <Avatar src={getFullImageUrl(currentUser?.avatar)} name={currentUser?.username} className="w-14 h-14" />
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- locally generated data: URL
              <img src={qrDataUrl} alt="QR code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 rounded-xl shimmer" />
            )}
            <span className="font-semibold text-sm">@{currentUser?.username}</span>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={handleCopy} className="btn-secondary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Скопировано" : "Копировать ссылку"}
            </button>
            <button onClick={handleShare} className="btn-primary flex-1 py-2.5 text-sm cursor-pointer">
              Поделиться
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {scanSupported ? (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-8 border-2 border-white/80 rounded-2xl pointer-events-none flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-white/70 animate-pulse" />
              </div>
              {scanError && (
                <div className="absolute inset-x-0 bottom-3 text-center text-xs text-white bg-black/60 mx-3 rounded-lg py-2 px-3">
                  {scanError}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center gap-3 text-center px-6">
              <Camera className="w-10 h-10 text-zinc-400" />
              <p className="text-sm text-zinc-500">
                Сканирование камерой не поддерживается в этом браузере. Введите код или @имя пользователя вручную.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Код, ссылка или @имя пользователя
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="@username или ссылка"
                className="flex-1 bg-transparent border border-zinc-300 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleResolveCode(manualCode)}
                disabled={!manualCode.trim() || resolving}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {resolving ? "..." : "Найти"}
              </button>
            </div>
            {resolveError && <span className="text-xs text-red-500">{resolveError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
