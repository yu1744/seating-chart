"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export interface SeatingPreset {
  id: string; name: string; rows: number; cols: number;
  disabledSeats: string[]; createdAt: string;
}

export function useSeating() {
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(6);
  const [namesText, setNamesText] = useState("");
  const [seatingLayout, setSeatingLayout] = useState<Record<string, string | null>>({});
  const [disabledSeats, setDisabledSeats] = useState<string[]>([]);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SeatingPreset[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [draggedSeatKey, setDraggedSeatKey] = useState<string | null>(null);
  const [dragOverSeatKey, setDragOverSeatKey] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("本日の席替え");
  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const parsedNames = useMemo(() => {
    if (!namesText.trim()) return [];
    return namesText.split(/[\n,、\s]+/).map(n => n.trim()).filter(n => n.length > 0);
  }, [namesText]);

  const activeSeatsCount = rows * cols - disabledSeats.length;
  const studentCount = parsedNames.length;
  const seatDeficit = studentCount - activeSeatsCount;

  useEffect(() => {
    setSeatingLayout(prev => {
      const next: Record<string, string | null> = {};
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const k = `r${r}-c${c}`;
          next[k] = prev[k] !== undefined ? prev[k] : null;
        }
      return next;
    });
    setDisabledSeats(prev => prev.filter(k => {
      const m = k.match(/^r(\d+)-c(\d+)$/);
      return m ? parseInt(m[1]) < rows && parseInt(m[2]) < cols : false;
    }));
  }, [rows, cols]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("seating-presets");
      if (s) try { setSavedPresets(JSON.parse(s)); } catch {}
    }
  }, []);

  useEffect(() => () => { if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current); }, []);

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const toggleSeatDisabled = (r: number, c: number) => {
    if (isShuffling) return;
    const k = `r${r}-c${c}`;
    if (seatingLayout[k]) setSeatingLayout(p => ({ ...p, [k]: null }));
    setDisabledSeats(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);
  };

  const fillSampleNames = () => {
    const s = ["佐藤 健","鈴木 一郎","高橋 美咲","田中 太郎","伊藤 結衣","渡辺 翔","山本 陽子","中村 拓海","小林 莉子","加藤 蓮","吉田 葵","山田 花子","佐々木 陸","山口 紬","松本 大輝","井上 桜","木村 健太","林 菜々美","斎藤 陽太","清水 美羽","山崎 優","池田 優斗","橋本 結菜","阿部 翔太","森 葵衣","前田 拓也","石川 陽菜","中島 健吾","小川 芽依","藤田 颯太"];
    setNamesText(s.slice(0, Math.min(activeSeatsCount > 0 ? activeSeatsCount : 24, s.length)).join("\n"));
  };

  const startShuffle = () => {
    if (!parsedNames.length) { alert("名前を入力してください。"); return; }
    if (seatDeficit > 0) { alert(`席が ${seatDeficit} 個不足しています。`); return; }
    setIsShuffling(true);
    let cycle = 0;
    const total = 20;
    const activeKeys: string[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const k = `r${r}-c${c}`;
        if (!disabledSeats.includes(k)) activeKeys.push(k);
      }
    const finalLayout: Record<string, string | null> = {};
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) finalLayout[`r${r}-c${c}`] = null;
    const sk = shuffleArray(activeKeys);
    shuffleArray(parsedNames).forEach((name, i) => { if (sk[i]) finalLayout[sk[i]] = name; });
    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    shuffleTimerRef.current = setInterval(() => {
      cycle++;
      const tmp: Record<string, string | null> = {};
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) tmp[`r${r}-c${c}`] = null;
      const rk = shuffleArray(activeKeys);
      parsedNames.forEach((name, i) => { if (rk[i]) tmp[rk[i]] = name; });
      setSeatingLayout(tmp);
      if (cycle >= total) {
        clearInterval(shuffleTimerRef.current!);
        shuffleTimerRef.current = null;
        setSeatingLayout(finalLayout);
        setIsShuffling(false);
      }
    }, 75);
  };

  const clearLayout = () => {
    if (isShuffling) return;
    setSeatingLayout(p => { const n = { ...p }; Object.keys(n).forEach(k => n[k] = null); return n; });
  };

  const fullReset = () => {
    if (isShuffling) return;
    if (!confirm("サイズ・無効席・名前をすべて初期化しますか？")) return;
    setRows(6); setCols(6); setDisabledSeats([]); setNamesText("");
    const e: Record<string, string | null> = {};
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) e[`r${r}-c${c}`] = null;
    setSeatingLayout(e);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    if (isShuffling) return;
    if (!seatingLayout[key]) { e.preventDefault(); return; }
    setDraggedSeatKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (isShuffling || disabledSeats.includes(key) || draggedSeatKey === key) return;
    setDragOverSeatKey(key);
  };
  const handleDragLeave = () => setDragOverSeatKey(null);
  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (isShuffling || disabledSeats.includes(targetKey)) { setDraggedSeatKey(null); setDragOverSeatKey(null); return; }
    const src = draggedSeatKey;
    if (!src || src === targetKey) { setDraggedSeatKey(null); setDragOverSeatKey(null); return; }
    setSeatingLayout(p => {
      const n = { ...p }; const a = n[src]; n[src] = n[targetKey]; n[targetKey] = a; return n;
    });
    setDraggedSeatKey(null); setDragOverSeatKey(null);
  };

  const savePreset = () => {
    if (!presetName.trim()) { alert("名前を入力してください。"); return; }
    const p: SeatingPreset = {
      id: Date.now().toString(), name: presetName.trim(), rows, cols,
      disabledSeats: [...disabledSeats],
      createdAt: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    const next = [p, ...savedPresets];
    setSavedPresets(next);
    localStorage.setItem("seating-presets", JSON.stringify(next));
    setPresetName("");
  };

  const loadPreset = (p: SeatingPreset) => {
    if (isShuffling) return;
    if (!confirm(`「${p.name}」を読み込みますか？現在の配置はリセットされます。`)) return;
    setRows(p.rows); setCols(p.cols); setDisabledSeats(p.disabledSeats);
    const f: Record<string, string | null> = {};
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) f[`r${r}-c${c}`] = null;
    setSeatingLayout(f);
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("削除しますか？")) return;
    const next = savedPresets.filter(p => p.id !== id);
    setSavedPresets(next);
    localStorage.setItem("seating-presets", JSON.stringify(next));
  };

  const getAvatarColors = (name: string): { bg: string; text: string } => {
    if (!name) return { bg: "bg-slate-100", text: "text-slate-700" };
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    const c = [
      { bg: "bg-blue-100", text: "text-blue-700" }, { bg: "bg-indigo-100", text: "text-indigo-700" },
      { bg: "bg-emerald-100", text: "text-emerald-700" }, { bg: "bg-violet-100", text: "text-violet-700" },
      { bg: "bg-amber-100", text: "text-amber-700" }, { bg: "bg-sky-100", text: "text-sky-700" },
      { bg: "bg-slate-100", text: "text-slate-700" }
    ];
    return c[Math.abs(h) % c.length];
  };

  const getInitial = (name: string) => name ? name.replace(/\s+/g, "").charAt(0) : "";

  return {
    rows, setRows, cols, setCols, namesText, setNamesText, seatingLayout, setSeatingLayout,
    disabledSeats, presetName, setPresetName, savedPresets, isShuffling,
    draggedSeatKey, dragOverSeatKey, customTitle, setCustomTitle,
    parsedNames, activeSeatsCount, studentCount, seatDeficit,
    toggleSeatDisabled, fillSampleNames, startShuffle, clearLayout, fullReset,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    savePreset, loadPreset, deletePreset, getAvatarColors, getInitial,
  };
}
