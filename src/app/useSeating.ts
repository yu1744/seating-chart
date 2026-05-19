"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export interface SeatingPreset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  disabledSeats: string[];
  createdAt: string;
}

export interface StudentRoster {
  id: string;
  name: string;
  namesText: string;
  createdAt: string;
}

export interface SeatingResult {
  id: string;
  name: string;
  rows: number;
  cols: number;
  disabledSeats: string[];
  seatingLayout: Record<string, string | null>;
  namesText: string;
  customTitle: string;
  createdAt: string;
}

export function useSeating() {
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(6);
  const [namesText, setNamesText] = useState("");
  const [seatingLayout, setSeatingLayout] = useState<Record<string, string | null>>({});
  const [disabledSeats, setDisabledSeats] = useState<string[]>([]);
  const [presetName, setPresetName] = useState("");
  const [rosterName, setRosterName] = useState("");
  const [resultName, setResultName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SeatingPreset[]>([]);
  const [savedRosters, setSavedRosters] = useState<StudentRoster[]>([]);
  const [savedResults, setSavedResults] = useState<SeatingResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [presetTab, setPresetTab] = useState<"layout" | "roster" | "result">("layout");

  // Interaction/Animation states
  const [isShuffling, setIsShuffling] = useState(false);
  const [draggedSeatKey, setDraggedSeatKey] = useState<string | null>(null);
  const [dragOverSeatKey, setDragOverSeatKey] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("本日の席替え");
  const shuffleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom Modal States
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const parsedNames = useMemo(() => {
    if (!namesText.trim()) return [];
    return namesText.split(/[\n,、\s]+/).map(n => n.trim()).filter(n => n.length > 0);
  }, [namesText]);

  const activeSeatsCount = rows * cols - disabledSeats.length;
  const studentCount = parsedNames.length;
  const seatDeficit = studentCount - activeSeatsCount;

  // Grid initialization / adjustment
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

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPresets = localStorage.getItem("seating-presets");
      if (storedPresets) {
        try { setSavedPresets(JSON.parse(storedPresets)); } catch (e) { console.error(e); }
      }
      const storedRosters = localStorage.getItem("seating-rosters");
      if (storedRosters) {
        try { setSavedRosters(JSON.parse(storedRosters)); } catch (e) { console.error(e); }
      }
      const storedResults = localStorage.getItem("seating-results");
      if (storedResults) {
        try { setSavedResults(JSON.parse(storedResults)); } catch (e) { console.error(e); }
      }
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
    if (!parsedNames.length) {
      setAlertMessage("配置する名前が入力されていません。名前を入力するか、サンプル入力を押してください。");
      return;
    }
    if (seatDeficit > 0) {
      setAlertMessage(`有効な席数が足りません。さらに ${seatDeficit} 個の席を増やすか、無効席（通路など）の設定を解除してください。`);
      return;
    }
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
    setConfirmConfig({
      message: "席表のサイズ、無効席（通路）の設定、入力された名前、および現在の席配置をすべて初期化します。よろしいですか？",
      onConfirm: () => {
        setRows(6); setCols(6); setDisabledSeats([]); setNamesText(""); setSelectedResultId(null); setSelectedRosterId(null);
        const e: Record<string, string | null> = {};
        for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) e[`r${r}-c${c}`] = null;
        setSeatingLayout(e);
        setConfirmConfig(null);
      }
    });
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

  // --- PRESET (LAYOUT ONLY) FUNCTIONS ---
  const savePreset = () => {
    if (!presetName.trim()) {
      setAlertMessage("保存するレイアウト名を入力してください。");
      return;
    }
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
    setConfirmConfig({
      message: `レイアウト「${p.name}」を読み込みます。現在の席配置はリセットされます。よろしいですか？`,
      onConfirm: () => {
        setRows(p.rows); setCols(p.cols); setDisabledSeats(p.disabledSeats); setSelectedResultId(null);
        const f: Record<string, string | null> = {};
        for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) f[`r${r}-c${c}`] = null;
        setSeatingLayout(f);
        setConfirmConfig(null);
      }
    });
  };

  const deletePreset = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      message: `保存されたレイアウト「${name}」を完全に削除します。よろしいですか？`,
      onConfirm: () => {
        const next = savedPresets.filter(p => p.id !== id);
        setSavedPresets(next);
        localStorage.setItem("seating-presets", JSON.stringify(next));
        setConfirmConfig(null);
      }
    });
  };

  // --- STUDENT ROSTER (名簿) FUNCTIONS ---
  const saveRoster = () => {
    if (!rosterName.trim()) {
      setAlertMessage("保存する名簿名を入力してください。");
      return;
    }
    if (!namesText.trim()) {
      setAlertMessage("保存する名簿（名前一覧）が空欄です。名前を入力してください。");
      return;
    }
    const r: StudentRoster = {
      id: Date.now().toString(),
      name: rosterName.trim(),
      namesText,
      createdAt: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    const next = [r, ...savedRosters];
    setSavedRosters(next);
    localStorage.setItem("seating-rosters", JSON.stringify(next));
    setSelectedRosterId(r.id);
    setRosterName("");
  };

  const updateRoster = () => {
    if (!selectedRosterId) return;
    const target = savedRosters.find(x => x.id === selectedRosterId);
    if (!target) return;

    setConfirmConfig({
      message: `現在の名簿データ（名前一覧）を「${target.name}」に上書き保存（更新）します。よろしいですか？`,
      onConfirm: () => {
        const next = savedRosters.map(x => {
          if (x.id === selectedRosterId) {
            return {
              ...x,
              namesText,
              createdAt: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
            };
          }
          return x;
        });
        setSavedRosters(next);
        localStorage.setItem("seating-rosters", JSON.stringify(next));
        setConfirmConfig(null);
      }
    });
  };

  const loadRoster = (r: StudentRoster) => {
    if (isShuffling) return;
    setConfirmConfig({
      message: `名簿「${r.name}」を読み込みます。現在の名前入力エリアは上書きされますが、よろしいですか？`,
      onConfirm: () => {
        setNamesText(r.namesText);
        setSelectedRosterId(r.id);
        setConfirmConfig(null);
      }
    });
  };

  const deleteRoster = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      message: `保存された名簿「${name}」を完全に削除します。よろしいですか？`,
      onConfirm: () => {
        const next = savedRosters.filter(x => x.id !== id);
        setSavedRosters(next);
        localStorage.setItem("seating-rosters", JSON.stringify(next));
        if (selectedRosterId === id) setSelectedRosterId(null);
        setConfirmConfig(null);
      }
    });
  };

  // --- SEATING RESULT FUNCTIONS ---
  const saveResult = () => {
    if (!resultName.trim()) {
      setAlertMessage("保存する配置結果の名前を入力してください。");
      return;
    }
    const r: SeatingResult = {
      id: Date.now().toString(),
      name: resultName.trim(),
      rows, cols,
      disabledSeats: [...disabledSeats],
      seatingLayout: { ...seatingLayout },
      namesText,
      customTitle,
      createdAt: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    const next = [r, ...savedResults];
    setSavedResults(next);
    localStorage.setItem("seating-results", JSON.stringify(next));
    setSelectedResultId(r.id);
    setResultName("");
  };

  const updateResult = () => {
    if (!selectedResultId) return;
    const target = savedResults.find(x => x.id === selectedResultId);
    if (!target) return;

    setConfirmConfig({
      message: `現在の席配置を「${target.name}」に上書き保存（更新）します。よろしいですか？`,
      onConfirm: () => {
        const next = savedResults.map(x => {
          if (x.id === selectedResultId) {
            return {
              ...x,
              rows, cols,
              disabledSeats: [...disabledSeats],
              seatingLayout: { ...seatingLayout },
              namesText,
              customTitle,
              createdAt: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
            };
          }
          return x;
        });
        setSavedResults(next);
        localStorage.setItem("seating-results", JSON.stringify(next));
        setConfirmConfig(null);
      }
    });
  };

  const loadResult = (r: SeatingResult) => {
    if (isShuffling) return;
    setConfirmConfig({
      message: `配置結果「${r.name}」を読み込みます。現在の席表および入力された名前一覧が上書きされます。よろしいですか？`,
      onConfirm: () => {
        setRows(r.rows); setCols(r.cols); setDisabledSeats(r.disabledSeats);
        setNamesText(r.namesText); setSeatingLayout(r.seatingLayout);
        setCustomTitle(r.customTitle); setSelectedResultId(r.id);
        // Find if this loaded namesText matches an existing Roster to set selectedRosterId, or just null out.
        setSelectedRosterId(null);
        setConfirmConfig(null);
      }
    });
  };

  const deleteResult = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      message: `保存された配置結果「${name}」を完全に削除します。よろしいですか？`,
      onConfirm: () => {
        const next = savedResults.filter(p => p.id !== id);
        setSavedResults(next);
        localStorage.setItem("seating-results", JSON.stringify(next));
        if (selectedResultId === id) setSelectedResultId(null);
        setConfirmConfig(null);
      }
    });
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
    disabledSeats, presetName, setPresetName, rosterName, setRosterName, resultName, setResultName,
    savedPresets, savedRosters, savedResults,
    selectedResultId, setSelectedResultId, selectedRosterId, setSelectedRosterId,
    presetTab, setPresetTab, isShuffling,
    draggedSeatKey, dragOverSeatKey, customTitle, setCustomTitle,
    parsedNames, activeSeatsCount, studentCount, seatDeficit,
    alertMessage, setAlertMessage, confirmConfig, setConfirmConfig,
    toggleSeatDisabled, fillSampleNames, startShuffle, clearLayout, fullReset,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    savePreset, loadPreset, deletePreset,
    saveRoster, updateRoster, loadRoster, deleteRoster,
    saveResult, updateResult, loadResult, deleteResult,
    getAvatarColors, getInitial,
  };
}

export type SeatingHook = ReturnType<typeof useSeating>;
