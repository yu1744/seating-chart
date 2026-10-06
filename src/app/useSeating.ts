"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  Accommodations,
  BackupFile,
  Board,
  RosterMeta,
  SeatZone,
  SeatingPreset,
  SeatingResult,
  StudentRoster,
} from "@/lib/types";
import {
  MAX_DIM,
  MIN_DIM,
  clampDim,
  createId,
  duplicateNames,
  emptyBoard,
  formatStamp,
  normalizeBoard,
  nowStamp,
  parseNames,
  pinnedNames,
  placedNames,
  planSeating,
  seatKey,
  seatNumberMap,
  shuffleArray,
  shuffleTargetKeys,
  subtractNames,
  toggleAisle,
  vacantSeatKeys,
} from "@/lib/seating";
import {
  downloadTextFile,
  extractStudents,
  fileStamp,
  parseDelimited,
  toCsv,
} from "@/lib/csv";
import {
  EMPTY_PRESETS,
  EMPTY_RESULTS,
  EMPTY_ROSTERS,
  clearSession,
  parseBackup,
  savePresets,
  saveResults,
  saveRosters,
  saveSession,
  serverSnapshotSession,
  snapshotPresets,
  snapshotResults,
  snapshotRosters,
  snapshotSession,
  subscribeSaved,
  type SaveOutcome,
} from "@/lib/storage";
import { useHistoryState } from "@/lib/useHistoryState";

export type { SeatingPreset, SeatingResult, StudentRoster, Board } from "@/lib/types";

export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

export interface ConfirmConfig {
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
}

export type DragPayload = { type: "seat"; key: string } | { type: "name"; name: string };

const DEFAULT_TITLE = "本日の席替え";
const SHUFFLE_FRAMES = 18;
const SHUFFLE_INTERVAL_MS = 70;

const FALLBACK_BOARD = emptyBoard();
const EMPTY_ACCOMMODATIONS: Accommodations = {
  front: [],
  back: [],
  left: [],
  right: [],
  separate: [],
};
const EMPTY_META: RosterMeta = {};

export function useSeating() {
  // localStorage は React の外の状態。描画後に読み直されるため、
  // サーバー描画との食い違い（ハイドレーション不一致）を起こさない。
  const savedPresets = useSyncExternalStore(subscribeSaved, snapshotPresets, () => EMPTY_PRESETS);
  const savedRosters = useSyncExternalStore(subscribeSaved, snapshotRosters, () => EMPTY_ROSTERS);
  const savedResults = useSyncExternalStore(subscribeSaved, snapshotResults, () => EMPTY_RESULTS);
  const session = useSyncExternalStore(subscribeSaved, snapshotSession, serverSnapshotSession);

  // 前回の作業内容を初期値として表示し、編集した時点から自分の状態に切り替える。
  const history = useHistoryState<Board>(session?.board ?? FALLBACK_BOARD);
  const board = history.state;
  const { rows, cols, disabled: disabledSeats, pinned: pinnedSeats, aisleCols, aisleRows } = board;

  // null は「まだ編集していない」= 復元値（なければ既定値）をそのまま使う、という意味。
  const [namesOverride, setNamesText] = useState<string | null>(null);
  const [titleOverride, setCustomTitle] = useState<string | null>(null);
  const namesText = namesOverride ?? session?.namesText ?? "";
  const customTitle = titleOverride ?? session?.customTitle ?? DEFAULT_TITLE;

  // 配慮事項と名簿の付加情報も「編集するまでは復元値」の方式に合わせる。
  const [accommodationsOverride, setAccommodations] = useState<Accommodations | null>(null);
  const [metaOverride, setRosterMeta] = useState<RosterMeta | null>(null);
  const accommodations = accommodationsOverride ?? session?.accommodations ?? EMPTY_ACCOMMODATIONS;
  const rosterMeta = metaOverride ?? session?.meta ?? EMPTY_META;

  /** 復元した内容をまだ触っていない状態か。 */
  const isRestored = !!session && history.isPristine && namesOverride === null;
  const isTouched =
    !history.isPristine ||
    namesOverride !== null ||
    titleOverride !== null ||
    accommodationsOverride !== null ||
    metaOverride !== null;

  /** 席表の向き。student = 黒板が上（配付用）、teacher = 教室の前から見た向き。 */
  const [viewMode, setViewMode] = useState<"student" | "teacher">("student");
  /** 席に通し番号を振って表示する（くじ引き方式で席を指定するときに使う）。 */
  const [showSeatNumbers, setShowSeatNumbers] = useState(false);
  /** 発表モード。順番に 1 人ずつ席を明かしていく。 */
  const [reveal, setReveal] = useState<{ order: string[]; index: number } | null>(null);

  const [presetName, setPresetName] = useState("");
  const [rosterName, setRosterName] = useState("");
  const [resultName, setResultName] = useState("");
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [presetTab, setPresetTab] = useState<"layout" | "roster" | "result" | "backup">("layout");

  // 操作・演出の状態
  const [avoidSameSeat, setAvoidSameSeat] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<Record<string, string | null> | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragOverSeatKey, setDragOverSeatKey] = useState<string | null>(null);
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 通知・ダイアログ
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  const notify = useCallback((message: string, kind: ToastKind = "info") => {
    const id = createId();
    setToasts(prev => [...prev.slice(-2), { id, message, kind }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimersRef.current.delete(timer);
    }, 3600);
    toastTimersRef.current.add(timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** 保存の失敗（容量超過・プライベートモード等）は黙って捨てずに知らせる。 */
  const reportSave = useCallback(
    (outcome: SaveOutcome, successMessage: string) => {
      if (outcome.ok) notify(successMessage, "success");
      else setAlertMessage(outcome.message);
      return outcome.ok;
    },
    [notify]
  );

  const confirm = useCallback((config: ConfirmConfig) => setConfirmConfig(config), []);
  const closeConfirm = useCallback(() => setConfirmConfig(null), []);
  const closeAlert = useCallback(() => setAlertMessage(null), []);

  // --- 導出値 ---
  const parsedNames = useMemo(() => parseNames(namesText), [namesText]);
  const duplicates = useMemo(() => duplicateNames(parsedNames), [parsedNames]);
  const displayLayout = previewLayout ?? board.layout;

  const totalSeats = rows * cols;
  const activeSeatsCount = totalSeats - disabledSeats.length;
  const pinnedCount = pinnedSeats.length;
  const shuffleSeatCount = Math.max(0, activeSeatsCount - pinnedCount);
  const studentCount = parsedNames.length;

  const namesOnPinnedSeats = useMemo(() => pinnedNames(board), [board]);
  const shufflePool = useMemo(
    () => subtractNames(parsedNames, namesOnPinnedSeats),
    [parsedNames, namesOnPinnedSeats]
  );
  const seatDeficit = shufflePool.length - shuffleSeatCount;

  const currentlyPlaced = useMemo(() => placedNames(board), [board]);
  const placedCount = currentlyPlaced.length;
  /** 名簿にいるのに、まだどの席にも座っていない人。 */
  const unassignedNames = useMemo(
    () => subtractNames(parsedNames, currentlyPlaced),
    [parsedNames, currentlyPlaced]
  );
  /** 席の通し番号（有効な席だけに前から順に振る）。 */
  const seatNumbers = useMemo(() => seatNumberMap(board), [board]);

  /** 名簿にいる人だけに絞った配慮事項（名前を消しても設定自体は残す）。 */
  const activeAccommodations = useMemo<Accommodations>(() => {
    const roster = new Set(parsedNames);
    return {
      front: accommodations.front.filter(n => roster.has(n)),
      back: accommodations.back.filter(n => roster.has(n)),
      left: accommodations.left.filter(n => roster.has(n)),
      right: accommodations.right.filter(n => roster.has(n)),
      separate: accommodations.separate.filter(([a, b]) => roster.has(a) && roster.has(b)),
    };
  }, [accommodations, parsedNames]);

  const accommodationCount =
    activeAccommodations.front.length +
    activeAccommodations.back.length +
    activeAccommodations.left.length +
    activeAccommodations.right.length +
    activeAccommodations.separate.length;

    /** 席にいるのに名簿から消えている人（名簿を編集したときの取り残し）。 */
  const strayNames = useMemo(
    () => subtractNames(currentlyPlaced, parsedNames),
    [currentlyPlaced, parsedNames]
  );

  // --- 作業内容の自動保存（リロードや誤操作での離脱に備える） ---
  useEffect(() => {
    if (!isTouched) return;
    const timer = setTimeout(() => {
      saveSession({
        board,
        namesText,
        customTitle,
        meta: rosterMeta,
        accommodations,
        savedAt: nowStamp(),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [board, namesText, customTitle, rosterMeta, accommodations, isTouched]);

  useEffect(
    () => () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
      for (const t of toastTimersRef.current) clearTimeout(t);
      toastTimersRef.current.clear();
    },
    []
  );

  // --- 席表のサイズ ---
  const setDim = useCallback(
    (axis: "rows" | "cols", value: number | ((prev: number) => number)) => {
      if (isShuffling) return;
      history.commit(prev => {
        const current = axis === "rows" ? prev.rows : prev.cols;
        const raw = typeof value === "function" ? value(current) : value;
        const next = clampDim(raw);
        if (next === current) return prev;
        return normalizeBoard({ ...prev, [axis]: next });
      }, { tag: `size-${axis}` });
    },
    [history, isShuffling]
  );

  const setRows = useCallback(
    (v: number | ((prev: number) => number)) => setDim("rows", v),
    [setDim]
  );
  const setCols = useCallback(
    (v: number | ((prev: number) => number)) => setDim("cols", v),
    [setDim]
  );

  // --- 座席の操作 ---
  const toggleSeatDisabled = useCallback(
    (r: number, c: number) => {
      if (isShuffling) return;
      const k = seatKey(r, c);
      history.commit(prev => {
        const isDisabled = prev.disabled.includes(k);
        return normalizeBoard({
          ...prev,
          layout: { ...prev.layout, [k]: isDisabled ? prev.layout[k] ?? null : null },
          disabled: isDisabled ? prev.disabled.filter(x => x !== k) : [...prev.disabled, k],
          pinned: prev.pinned.filter(x => x !== k),
        });
      });
    },
    [history, isShuffling]
  );

  /** 列と列（行と行）の間の通路を開け閉めする。席の数は変わらない。 */
  const toggleAisleCol = useCallback(
    (boundary: number) => {
      if (isShuffling) return;
      history.commit(prev => ({ ...prev, aisleCols: toggleAisle(prev.aisleCols, boundary) }));
    },
    [history, isShuffling]
  );

  const toggleAisleRow = useCallback(
    (boundary: number) => {
      if (isShuffling) return;
      history.commit(prev => ({ ...prev, aisleRows: toggleAisle(prev.aisleRows, boundary) }));
    },
    [history, isShuffling]
  );

  const togglePinned = useCallback(
    (key: string) => {
      if (isShuffling) return;
      history.commit(prev => {
        if (!prev.layout[key]) return prev;
        const isPinned = prev.pinned.includes(key);
        return {
          ...prev,
          pinned: isPinned ? prev.pinned.filter(x => x !== key) : [...prev.pinned, key],
        };
      });
    },
    [history, isShuffling]
  );

  const removeFromSeat = useCallback(
    (key: string) => {
      if (isShuffling) return;
      history.commit(prev => {
        if (!prev.layout[key]) return prev;
        return {
          ...prev,
          layout: { ...prev.layout, [key]: null },
          pinned: prev.pinned.filter(x => x !== key),
        };
      });
      setSelectedSeatKey(cur => (cur === key ? null : cur));
    },
    [history, isShuffling]
  );

  /** 席と席を入れ替える（空席へのドロップは移動になる）。固定は席に付いたまま残す。 */
  const swapSeats = useCallback(
    (from: string, to: string) => {
      if (isShuffling || from === to) return;
      history.commit(prev => {
        if (prev.disabled.includes(to) || prev.disabled.includes(from)) return prev;
        const a = prev.layout[from];
        const b = prev.layout[to];
        if (!a && !b) return prev;
        return {
          ...prev,
          layout: { ...prev.layout, [from]: b, [to]: a },
          // 空席になった側の固定は意味を失うので外す。
          pinned: prev.pinned.filter(k => (k === from ? !!b : k === to ? !!a : true)),
        };
      });
    },
    [history, isShuffling]
  );

  /** 未配置リストなどから、名前を特定の席に入れる。 */
  const assignNameToSeat = useCallback(
    (name: string, key: string) => {
      if (isShuffling || !name) return;
      history.commit(prev => {
        if (prev.disabled.includes(key)) return prev;
        return { ...prev, layout: { ...prev.layout, [key]: name } };
      });
    },
    [history, isShuffling]
  );

  /** 未配置の名前を、空いている席のどこかへ入れる。 */
  const placeNameInFirstVacancy = useCallback(
    (name: string) => {
      if (isShuffling) return;
      const vacancies = vacantSeatKeys(board);
      if (!vacancies.length) {
        notify("空いている席がありません。席を増やすか、無効席を解除してください。", "error");
        return;
      }
      assignNameToSeat(name, vacancies[0]);
      notify(`${name} さんを空席に配置しました。`, "success");
    },
    [assignNameToSeat, board, isShuffling, notify]
  );

  // --- クリック（タップ）による入れ替え ---
  const handleSeatActivate = useCallback(
    (key: string) => {
      if (isShuffling) return;
      const occupied = !!board.layout[key];
      const isDisabled = board.disabled.includes(key);
      if (isDisabled) {
        const p = /^r(\d+)-c(\d+)$/.exec(key);
        if (p) toggleSeatDisabled(parseInt(p[1], 10), parseInt(p[2], 10));
        return;
      }
      if (selectedSeatKey) {
        if (selectedSeatKey === key) setSelectedSeatKey(null);
        else {
          swapSeats(selectedSeatKey, key);
          setSelectedSeatKey(null);
        }
        return;
      }
      if (occupied) {
        setSelectedSeatKey(key);
        return;
      }
      // 選択していない状態で空席をクリックしたら、その席を無効化する。
      const p = /^r(\d+)-c(\d+)$/.exec(key);
      if (p) toggleSeatDisabled(parseInt(p[1], 10), parseInt(p[2], 10));
    },
    [board.disabled, board.layout, isShuffling, selectedSeatKey, swapSeats, toggleSeatDisabled]
  );

  const clearSelection = useCallback(() => setSelectedSeatKey(null), []);

  // --- 名前の入力 ---
  const fillSampleNames = useCallback(() => {
    const sample = [
      "佐藤 健", "鈴木 一郎", "高橋 美咲", "田中 太郎", "伊藤 結衣", "渡辺 翔",
      "山本 陽子", "中村 拓海", "小林 莉子", "加藤 蓮", "吉田 葵", "山田 花子",
      "佐々木 陸", "山口 紬", "松本 大輝", "井上 桜", "木村 健太", "林 菜々美",
      "斎藤 陽太", "清水 美羽", "山崎 優", "池田 優斗", "橋本 結菜", "阿部 翔太",
      "森 葵衣", "前田 拓也", "石川 陽菜", "中島 健吾", "小川 芽依", "藤田 颯太",
    ];
    const count = Math.min(activeSeatsCount > 0 ? activeSeatsCount : 24, sample.length);
    setNamesText(sample.slice(0, count).join("\n"));
    notify(`サンプルの名前を ${count} 名分入力しました。`, "info");
  }, [activeSeatsCount, notify]);

  const clearNames = useCallback(() => {
    if (isShuffling || !namesText) return;
    confirm({
      title: "名前の消去",
      message: "入力されている名前一覧をすべて消去します。席に配置されている名前はそのまま残ります。",
      confirmLabel: "消去する",
      tone: "danger",
      onConfirm: () => setNamesText(""),
    });
  }, [confirm, isShuffling, namesText]);

  /** 名簿から消えた人を席からも外す。 */
  const removeStrayNames = useCallback(() => {
    if (isShuffling || !strayNames.length) return;
    history.commit(prev => {
      const layout = { ...prev.layout };
      const remaining = [...strayNames];
      for (const [k, v] of Object.entries(layout)) {
        if (!v) continue;
        const i = remaining.indexOf(v);
        if (i >= 0) {
          remaining.splice(i, 1);
          layout[k] = null;
        }
      }
      return normalizeBoard({ ...prev, layout });
    });
    notify(`名簿にない ${strayNames.length} 名を席から外しました。`, "success");
  }, [history, isShuffling, notify, strayNames]);

  // --- 発表モード（くじ引きのように 1 人ずつ明かす） ---
  const startReveal = useCallback(() => {
    const seats = Object.entries(board.layout)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
    if (!seats.length) {
      setAlertMessage("発表する席配置がありません。先に席替えを実行してください。");
      return;
    }
    setSelectedSeatKey(null);
    setReveal({ order: shuffleArray(seats), index: -1 });
  }, [board.layout]);

  const revealNext = useCallback(() => {
    setReveal(prev => {
      if (!prev) return prev;
      if (prev.index >= prev.order.length - 1) return prev;
      return { ...prev, index: prev.index + 1 };
    });
  }, []);

  const revealAll = useCallback(() => {
    setReveal(prev => (prev ? { ...prev, index: prev.order.length - 1 } : prev));
  }, []);

  const endReveal = useCallback(() => setReveal(null), []);

  /** 発表モードで、まだ明かしていない席かどうか。 */
  const isHidden = useCallback(
    (key: string) => {
      if (!reveal) return false;
      const at = reveal.order.indexOf(key);
      return at < 0 ? false : at > reveal.index;
    },
    [reveal]
  );

  const revealCurrentKey = reveal && reveal.index >= 0 ? reveal.order[reveal.index] : null;
  const revealCurrentName = revealCurrentKey ? board.layout[revealCurrentKey] ?? null : null;

  // --- 配慮事項 ---
  const editAccommodations = useCallback(
    (update: (prev: Accommodations) => Accommodations) => {
      setAccommodations(prev => update(prev ?? accommodations));
    },
    [accommodations]
  );

  /** 希望する区画の切り替え。前後どうし・左右どうしは同時に持てない。 */
  const toggleZone = useCallback(
    (name: string, zone: SeatZone) => {
      const opposite: Record<SeatZone, SeatZone> = {
        front: "back",
        back: "front",
        left: "right",
        right: "left",
      };
      editAccommodations(prev => {
        const other = opposite[zone];
        const has = prev[zone].includes(name);
        return {
          ...prev,
          [zone]: has ? prev[zone].filter(n => n !== name) : [...prev[zone], name],
          [other]: prev[other].filter(n => n !== name),
        } as Accommodations;
      });
    },
    [editAccommodations]
  );

  const addSeparatePair = useCallback(
    (a: string, b: string) => {
      if (!a || !b || a === b) return;
      const exists = accommodations.separate.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a)
      );
      if (exists) {
        notify("その組はすでに登録されています。", "info");
        return;
      }
      editAccommodations(prev => ({ ...prev, separate: [...prev.separate, [a, b]] }));
      notify(`${a} と ${b} を離す組に追加しました。`, "success");
    },
    [accommodations.separate, editAccommodations, notify]
  );

  const removeSeparatePair = useCallback(
    (a: string, b: string) => {
      editAccommodations(prev => ({
        ...prev,
        separate: prev.separate.filter(([x, y]) => !(x === a && y === b)),
      }));
    },
    [editAccommodations]
  );

  const clearAccommodations = useCallback(() => {
    if (!accommodationCount) return;
    confirm({
      title: "配慮事項の消去",
      message: "前方・後方の希望と、離す組の設定をすべて消去します。",
      confirmLabel: "消去する",
      tone: "danger",
      onConfirm: () => {
        setAccommodations(EMPTY_ACCOMMODATIONS);
        notify("配慮事項を消去しました。", "info");
      },
    });
  }, [accommodationCount, confirm, notify]);

  // --- 名簿の CSV 連携 ---
  const safeFileName = useCallback(
    (base: string) => (base.replace(/[\\/:*?"<>|]/g, "_").trim() || "席替え"),
    []
  );

  /** 名前一覧を CSV で書き出す（Excel でそのまま開ける）。 */
  const exportNamesCsv = useCallback(() => {
    if (!parsedNames.length) {
      setAlertMessage("書き出す名前が入力されていません。");
      return;
    }
    const hasKana = parsedNames.some(n => rosterMeta[n]?.kana);
    const hasGender = parsedNames.some(n => rosterMeta[n]?.gender);
    const header = ["番号", "名前", ...(hasKana ? ["ふりがな"] : []), ...(hasGender ? ["性別"] : [])];
    const rows: (string | number)[][] = [
      header,
      ...parsedNames.map((name, i) => {
        const meta = rosterMeta[name];
        const row: (string | number)[] = [meta?.no ?? i + 1, name];
        if (hasKana) row.push(meta?.kana ?? "");
        if (hasGender) row.push(meta?.gender === "m" ? "男" : meta?.gender === "f" ? "女" : "");
        return row;
      }),
    ];
    const label = savedRosters.find(r => r.id === selectedRosterId)?.name ?? "名簿";
    downloadTextFile(`${safeFileName(label)}-${fileStamp()}.csv`, toCsv(rows));
    notify(`名簿 ${parsedNames.length} 名を CSV に書き出しました。`, "success");
  }, [notify, parsedNames, rosterMeta, safeFileName, savedRosters, selectedRosterId]);

  /** CSV / TSV / テキストから名簿を読み込む。番号・ふりがな・性別の列も取り込む。 */
  const importNamesFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const students = extractStudents(parseDelimited(text));
        if (!students.length) {
          setAlertMessage(
            "ファイルから名前を読み取れませんでした。1 列目に名前、または「名前」「氏名」の見出しがある CSV をお試しください。"
          );
          return;
        }
        // 出席番号があれば番号順に並べる（名簿らしい順序になる）
        const ordered = students.every(st => st.no !== undefined)
          ? [...students].sort((a, b) => (a.no ?? 0) - (b.no ?? 0))
          : students;
        const extras = ordered.some(st => st.no !== undefined || st.kana || st.gender);
        const preview = ordered.slice(0, 3).map(st => st.name).join("、");
        confirm({
          title: "名簿の読み込み",
          message: `「${file.name}」から ${ordered.length} 名を読み込みます（${preview}${ordered.length > 3 ? " …" : ""}）。現在の名前入力欄は上書きされます。`,
          confirmLabel: "読み込む",
          onConfirm: () => {
            setNamesText(ordered.map(st => st.name).join("\n"));
            const meta: RosterMeta = {};
            for (const st of ordered) {
              if (st.no === undefined && !st.kana && !st.gender) continue;
              meta[st.name] = { no: st.no, kana: st.kana, gender: st.gender };
            }
            setRosterMeta(meta);
            setSelectedRosterId(null);
            notify(
              `${ordered.length} 名を読み込みました。${extras ? "（番号・ふりがな等も取り込みました）" : ""}`,
              "success"
            );
          },
        });
      } catch {
        setAlertMessage("ファイルの読み込みに失敗しました。");
      }
    },
    [confirm, notify]
  );

  /** 現在の席表をそのままの並びで CSV に書き出す。 */
  const exportSeatingCsv = useCallback(() => {
    if (!placedCount) {
      setAlertMessage("書き出す席配置がありません。先に席替えを実行してください。");
      return;
    }
    // 通路を挟んだ並びのまま書き出し、Excel で開いても教室の形が分かるようにする。
    const colSeq: (number | "aisle")[] = [];
    for (let c = 0; c < cols; c++) {
      if (aisleCols.includes(c)) colSeq.push("aisle");
      colSeq.push(c);
    }
    const header = ["", ...colSeq.map(c => (c === "aisle" ? "通路" : `${c + 1}列`))];
    const body: string[][] = [];
    for (let r = 0; r < rows; r++) {
      if (aisleRows.includes(r)) body.push(["通路", ...colSeq.map(() => "")]);
      body.push([
        `${r + 1}行`,
        ...colSeq.map(c => {
          if (c === "aisle") return "";
          const k = seatKey(r, c);
          if (board.disabled.includes(k)) return "―";
          return board.layout[k] ?? "";
        }),
      ]);
    }
    const rowsOut: (string | number)[][] = [
      [customTitle || DEFAULT_TITLE],
      ["1行目が黒板側です", `配置 ${placedCount} 名`],
      [],
      header,
      ...body,
    ];
    downloadTextFile(`${safeFileName(customTitle || DEFAULT_TITLE)}-席表-${fileStamp()}.csv`, toCsv(rowsOut));
    notify("席表を CSV に書き出しました。", "success");
  }, [
    aisleCols,
    aisleRows,
    board.disabled,
    board.layout,
    cols,
    customTitle,
    notify,
    placedCount,
    rows,
    safeFileName,
  ]);

  // --- 席替えの実行 ---
  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  const startShuffle = useCallback(() => {
    if (isShuffling) return;
    if (!parsedNames.length) {
      setAlertMessage("配置する名前が入力されていません。名前を入力するか、サンプル名を入力してください。");
      return;
    }
    if (seatDeficit > 0) {
      setAlertMessage(
        `有効な席数が ${seatDeficit} 席足りません。席を増やすか、無効席または固定席の設定を見直してください。`
      );
      return;
    }
    if (!shufflePool.length) {
      setAlertMessage("入力されている全員が固定席にいるため、入れ替える人がいません。固定を解除してからお試しください。");
      return;
    }
    setSelectedSeatKey(null);
    const { board: finalBoard, report } = planSeating(board, parsedNames, {
      front: activeAccommodations.front,
      back: activeAccommodations.back,
      left: activeAccommodations.left,
      right: activeAccommodations.right,
      separate: activeAccommodations.separate,
      avoidSame: avoidSameSeat,
    });

    /** 結果の内訳を一言で伝える。 */
    const resultMessage = () => {
      const notes = [
        board.pinned.length ? `固定 ${board.pinned.length}席` : "",
        report.sameSeat > 0 ? `前と同じ席 ${report.sameSeat}名` : "",
      ].filter(Boolean);
      return `${shufflePool.length}名を配置しました${notes.length ? `・${notes.join("・")}` : ""}`;
    };

    /** 満たせなかった配慮事項は、黙って捨てずに知らせる。 */
    const reportUnmet = () => {
      const lines: string[] = [];
      if (report.unmetFront.length) {
        lines.push(`前方にできませんでした: ${report.unmetFront.join("、")}`);
      }
      if (report.unmetBack.length) {
        lines.push(`後方にできませんでした: ${report.unmetBack.join("、")}`);
      }
      if (report.unmetLeft.length) {
        lines.push(`左側にできませんでした: ${report.unmetLeft.join("、")}`);
      }
      if (report.unmetRight.length) {
        lines.push(`右側にできませんでした: ${report.unmetRight.join("、")}`);
      }
      if (report.unmetSeparate.length) {
        lines.push(
          `離せませんでした: ${report.unmetSeparate.map(([a, b]) => `${a}と${b}`).join("、")}`
        );
      }
      if (!lines.length) return;
      setAlertMessage(
        [
          "配置はできましたが、次の配慮事項は満たせませんでした。",
          "",
          ...lines,
          "",
          "席を増やす、通路を開く、固定席を見直すなどで解消できる場合があります。",
        ].join("\n")
      );
    };


    if (prefersReducedMotion()) {
      history.commit(finalBoard);
      notify(resultMessage(), "success");
      reportUnmet();
      return;
    }

    setIsShuffling(true);
    const targets = shuffleTargetKeys(board);
    const pool = shufflePool;
    let frame = 0;
    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    shuffleTimerRef.current = setInterval(() => {
      frame++;
      if (frame >= SHUFFLE_FRAMES) {
        if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
        setPreviewLayout(null);
        setIsShuffling(false);
        history.commit(finalBoard);
        notify(resultMessage(), "success");
        reportUnmet();
        return;
      }
      // 演出用の仮配置。履歴には積まない。
      const frameLayout: Record<string, string | null> = {};
      for (const k of Object.keys(board.layout)) {
        frameLayout[k] = board.pinned.includes(k) ? board.layout[k] ?? null : null;
      }
      const slots = shuffleArray(targets);
      pool.forEach((name, i) => {
        if (slots[i]) frameLayout[slots[i]] = name;
      });
      setPreviewLayout(frameLayout);
    }, SHUFFLE_INTERVAL_MS);
  }, [
    activeAccommodations,
    avoidSameSeat,
    board,
    history,
    isShuffling,
    notify,
    parsedNames,
    seatDeficit,
    shufflePool,
  ]);

  /** 入力順（出席番号順）に前から詰めて配置する。 */
  const assignInOrder = useCallback(() => {
    if (isShuffling) return;
    if (!parsedNames.length) {
      setAlertMessage("配置する名前が入力されていません。");
      return;
    }
    if (seatDeficit > 0) {
      setAlertMessage(`有効な席数が ${seatDeficit} 席足りません。席を増やしてから、もう一度お試しください。`);
      return;
    }
    const targets = shuffleTargetKeys(board);
    // 出席番号が分かっていれば番号順、無ければ入力順に前から詰める。
    const hasNumbers = shufflePool.every(n => typeof rosterMeta[n]?.no === "number");
    const ordered = hasNumbers
      ? [...shufflePool].sort((a, b) => (rosterMeta[a].no ?? 0) - (rosterMeta[b].no ?? 0))
      : shufflePool;
    history.commit(prev => {
      const layout: Record<string, string | null> = {};
      for (const k of Object.keys(prev.layout)) {
        layout[k] = prev.pinned.includes(k) ? prev.layout[k] ?? null : null;
      }
      ordered.forEach((name, i) => {
        if (targets[i]) layout[targets[i]] = name;
      });
      return { ...prev, layout };
    });
    setSelectedSeatKey(null);
    notify(hasNumbers ? "出席番号順に配置しました。" : "入力順に前から配置しました。", "success");
  }, [board, history, isShuffling, notify, parsedNames.length, rosterMeta, seatDeficit, shufflePool]);

  const clearLayout = useCallback(() => {
    if (isShuffling) return;
    const occupied = Object.values(board.layout).some(Boolean);
    if (!occupied) return;
    history.commit(prev => {
      const layout: Record<string, string | null> = {};
      for (const k of Object.keys(prev.layout)) layout[k] = null;
      return { ...prev, layout, pinned: [] };
    });
    setSelectedSeatKey(null);
    notify("席の配置をクリアしました（元に戻すで復元できます）。", "info");
  }, [board.layout, history, isShuffling, notify]);

  const fullReset = useCallback(() => {
    if (isShuffling) return;
    confirm({
      title: "すべて初期化",
      message:
        "席表のサイズ、無効席と固定席の設定、入力された名前、現在の席配置をすべて初期状態に戻します。保存済みのデータは削除されません。",
      confirmLabel: "初期化する",
      tone: "danger",
      onConfirm: () => {
        history.reset(emptyBoard());
        setNamesText("");
        setCustomTitle(DEFAULT_TITLE);
        setAccommodations(EMPTY_ACCOMMODATIONS);
        setRosterMeta(EMPTY_META);
        setReveal(null);
        setSelectedResultId(null);
        setSelectedRosterId(null);
        setSelectedSeatKey(null);
        clearSession();
        notify("初期状態に戻しました。", "info");
      },
    });
  }, [confirm, history, isShuffling, notify]);

  // --- ドラッグ＆ドロップ ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, key: string) => {
      if (isShuffling || !board.layout[key]) {
        e.preventDefault();
        return;
      }
      setDragPayload({ type: "seat", key });
      setSelectedSeatKey(null);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
    },
    [board.layout, isShuffling]
  );

  const handleNameDragStart = useCallback(
    (e: React.DragEvent, name: string) => {
      if (isShuffling) {
        e.preventDefault();
        return;
      }
      setDragPayload({ type: "name", name });
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", name);
    },
    [isShuffling]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, key: string) => {
      if (isShuffling || !dragPayload || board.disabled.includes(key)) return;
      e.preventDefault();
      if (dragPayload.type === "seat" && dragPayload.key === key) return;
      setDragOverSeatKey(key);
    },
    [board.disabled, dragPayload, isShuffling]
  );

  const handleDragLeave = useCallback(() => setDragOverSeatKey(null), []);

  const handleDragEnd = useCallback(() => {
    setDragPayload(null);
    setDragOverSeatKey(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      const payload = dragPayload;
      setDragPayload(null);
      setDragOverSeatKey(null);
      if (isShuffling || !payload || board.disabled.includes(targetKey)) return;
      if (payload.type === "seat") swapSeats(payload.key, targetKey);
      else assignNameToSeat(payload.name, targetKey);
    },
    [assignNameToSeat, board.disabled, dragPayload, isShuffling, swapSeats]
  );

  // --- レイアウト型紙 ---
  const savePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) {
      setAlertMessage("保存するレイアウト名を入力してください。");
      return;
    }
    const preset: SeatingPreset = {
      id: createId(),
      name,
      rows,
      cols,
      disabledSeats: [...disabledSeats],
      aisleCols: [...aisleCols],
      aisleRows: [...aisleRows],
      createdAt: nowStamp(),
    };
    const next = [preset, ...savedPresets];
    reportSave(savePresets(next), `レイアウト「${name}」を保存しました。`);
    setPresetName("");
  }, [aisleCols, aisleRows, cols, disabledSeats, presetName, reportSave, rows, savedPresets]);

  const loadPreset = useCallback(
    (p: SeatingPreset) => {
      if (isShuffling) return;
      confirm({
        title: "レイアウトの読み込み",
        message: `レイアウト「${p.name}」（${p.cols}列×${p.rows}行）を読み込みます。現在の席配置はクリアされます。`,
        confirmLabel: "読み込む",
        onConfirm: () => {
          history.commit(
            normalizeBoard({
              rows: p.rows,
              cols: p.cols,
              layout: {},
              disabled: [...p.disabledSeats],
              pinned: [],
              aisleCols: [...(p.aisleCols ?? [])],
              aisleRows: [...(p.aisleRows ?? [])],
            })
          );
          setSelectedResultId(null);
          setSelectedSeatKey(null);
          notify(`レイアウト「${p.name}」を読み込みました。`, "success");
        },
      });
    },
    [confirm, history, isShuffling, notify]
  );

  const deletePreset = useCallback(
    (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      confirm({
        title: "レイアウトの削除",
        message: `保存されたレイアウト「${name}」を削除します。この操作は取り消せません。`,
        confirmLabel: "削除する",
        tone: "danger",
        onConfirm: () => {
          const next = savedPresets.filter(p => p.id !== id);
          reportSave(savePresets(next), `レイアウト「${name}」を削除しました。`);
        },
      });
    },
    [confirm, reportSave, savedPresets]
  );

  // --- 名簿 ---
  const saveRoster = useCallback(() => {
    const name = rosterName.trim();
    if (!name) {
      setAlertMessage("保存する名簿名を入力してください。");
      return;
    }
    if (!namesText.trim()) {
      setAlertMessage("名前一覧が空欄です。名前を入力してから保存してください。");
      return;
    }
    const roster: StudentRoster = {
      id: createId(),
      name,
      namesText,
      meta: rosterMeta,
      accommodations: activeAccommodations,
      createdAt: nowStamp(),
    };
    const next = [roster, ...savedRosters];
    reportSave(saveRosters(next), `名簿「${name}」を保存しました（${parsedNames.length}名）。`);
    setSelectedRosterId(roster.id);
    setRosterName("");
  }, [
    activeAccommodations,
    namesText,
    parsedNames.length,
    reportSave,
    rosterMeta,
    rosterName,
    savedRosters,
  ]);

  const updateRoster = useCallback(() => {
    const target = savedRosters.find(x => x.id === selectedRosterId);
    if (!target) return;
    confirm({
      title: "名簿の上書き更新",
      message: `現在の名前一覧（${parsedNames.length}名）を名簿「${target.name}」に上書き保存します。`,
      confirmLabel: "上書きする",
      onConfirm: () => {
        const next = savedRosters.map(x =>
          x.id === selectedRosterId
            ? {
                ...x,
                namesText,
                meta: rosterMeta,
                accommodations: activeAccommodations,
                createdAt: nowStamp(),
              }
            : x
        );
        reportSave(saveRosters(next), `名簿「${target.name}」を更新しました。`);
      },
    });
  }, [
    activeAccommodations,
    confirm,
    namesText,
    parsedNames.length,
    reportSave,
    rosterMeta,
    savedRosters,
    selectedRosterId,
  ]);

  const loadRoster = useCallback(
    (r: StudentRoster) => {
      if (isShuffling) return;
      const count = parseNames(r.namesText).length;
      confirm({
        title: "名簿の読み込み",
        message: `名簿「${r.name}」（${count}名）を読み込みます。現在の名前入力欄は上書きされます。`,
        confirmLabel: "読み込む",
        onConfirm: () => {
          setNamesText(r.namesText);
          setRosterMeta(r.meta ?? EMPTY_META);
          if (r.accommodations) setAccommodations(r.accommodations);
          setSelectedRosterId(r.id);
          notify(`名簿「${r.name}」を読み込みました（${count}名）。`, "success");
        },
      });
    },
    [confirm, isShuffling, notify]
  );

  const deleteRoster = useCallback(
    (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      confirm({
        title: "名簿の削除",
        message: `保存された名簿「${name}」を削除します。この操作は取り消せません。`,
        confirmLabel: "削除する",
        tone: "danger",
        onConfirm: () => {
          const next = savedRosters.filter(x => x.id !== id);
          reportSave(saveRosters(next), `名簿「${name}」を削除しました。`);
          if (selectedRosterId === id) setSelectedRosterId(null);
        },
      });
    },
    [confirm, reportSave, savedRosters, selectedRosterId]
  );

  // --- 配置結果 ---
  const saveResult = useCallback(() => {
    const name = resultName.trim();
    if (!name) {
      setAlertMessage("保存する配置結果の名前を入力してください。");
      return;
    }
    const result: SeatingResult = {
      id: createId(),
      name,
      rows,
      cols,
      disabledSeats: [...disabledSeats],
      pinnedSeats: [...pinnedSeats],
      aisleCols: [...aisleCols],
      aisleRows: [...aisleRows],
      meta: rosterMeta,
      accommodations: activeAccommodations,
      seatingLayout: { ...board.layout },
      namesText,
      customTitle,
      createdAt: nowStamp(),
    };
    const next = [result, ...savedResults];
    reportSave(saveResults(next), `配置結果「${name}」を保存しました。`);
    setSelectedResultId(result.id);
    setResultName("");
  }, [
    activeAccommodations,
    aisleCols,
    aisleRows,
    board.layout,
    cols,
    customTitle,
    disabledSeats,
    rosterMeta,
    namesText,
    pinnedSeats,
    reportSave,
    resultName,
    rows,
    savedResults,
  ]);

  const updateResult = useCallback(() => {
    const target = savedResults.find(x => x.id === selectedResultId);
    if (!target) return;
    confirm({
      title: "配置結果の上書き更新",
      message: `現在の席表を配置結果「${target.name}」に上書き保存します。`,
      confirmLabel: "上書きする",
      onConfirm: () => {
        const next = savedResults.map(x =>
          x.id === selectedResultId
            ? {
                ...x,
                rows,
                cols,
                disabledSeats: [...disabledSeats],
                pinnedSeats: [...pinnedSeats],
                aisleCols: [...aisleCols],
                aisleRows: [...aisleRows],
                meta: rosterMeta,
                accommodations: activeAccommodations,
                seatingLayout: { ...board.layout },
                namesText,
                customTitle,
                createdAt: nowStamp(),
              }
            : x
        );
        reportSave(saveResults(next), `配置結果「${target.name}」を更新しました。`);
      },
    });
  }, [
    activeAccommodations,
    aisleCols,
    aisleRows,
    board.layout,
    cols,
    confirm,
    customTitle,
    rosterMeta,
    disabledSeats,
    namesText,
    pinnedSeats,
    reportSave,
    rows,
    savedResults,
    selectedResultId,
  ]);

  const loadResult = useCallback(
    (r: SeatingResult) => {
      if (isShuffling) return;
      confirm({
        title: "配置結果の読み込み",
        message: `配置結果「${r.name}」を読み込みます。現在の席表と名前一覧は上書きされます。`,
        confirmLabel: "読み込む",
        onConfirm: () => {
          history.commit(
            normalizeBoard({
              rows: r.rows,
              cols: r.cols,
              layout: { ...r.seatingLayout },
              disabled: [...r.disabledSeats],
              pinned: [...(r.pinnedSeats ?? [])],
              aisleCols: [...(r.aisleCols ?? [])],
              aisleRows: [...(r.aisleRows ?? [])],
            })
          );
          setNamesText(r.namesText);
          setCustomTitle(r.customTitle || DEFAULT_TITLE);
          setRosterMeta(r.meta ?? EMPTY_META);
          if (r.accommodations) setAccommodations(r.accommodations);
          setSelectedResultId(r.id);
          setSelectedRosterId(null);
          setSelectedSeatKey(null);
          notify(`配置結果「${r.name}」を読み込みました。`, "success");
        },
      });
    },
    [confirm, history, isShuffling, notify]
  );

  const deleteResult = useCallback(
    (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      confirm({
        title: "配置結果の削除",
        message: `保存された配置結果「${name}」を削除します。この操作は取り消せません。`,
        confirmLabel: "削除する",
        tone: "danger",
        onConfirm: () => {
          const next = savedResults.filter(p => p.id !== id);
          reportSave(saveResults(next), `配置結果「${name}」を削除しました。`);
          if (selectedResultId === id) setSelectedResultId(null);
        },
      });
    },
    [confirm, reportSave, savedResults, selectedResultId]
  );

  // --- バックアップ（書き出し・読み込み） ---
  const savedTotal = savedPresets.length + savedRosters.length + savedResults.length;

  const exportBackup = useCallback(() => {
    if (!savedTotal) {
      setAlertMessage("書き出せる保存データがありません。レイアウト・名簿・配置結果のいずれかを保存してからお試しください。");
      return;
    }
    const backup: BackupFile = {
      app: "seating-chart",
      version: 1,
      exportedAt: nowStamp(),
      presets: savedPresets,
      rosters: savedRosters,
      results: savedResults,
    };
    try {
      downloadTextFile(
        `席替えシステム-バックアップ-${fileStamp()}.json`,
        JSON.stringify(backup, null, 2),
        "application/json"
      );
      notify(`保存データ ${savedTotal} 件をファイルに書き出しました。`, "success");
    } catch {
      setAlertMessage("ファイルの書き出しに失敗しました。");
    }
  }, [notify, savedPresets, savedResults, savedRosters, savedTotal]);

  const applyImport = useCallback(
    (data: Omit<BackupFile, "app" | "version" | "exportedAt">, mode: "merge" | "replace") => {
      const merge = <T extends { id: string }>(current: T[], incoming: T[]) => {
        const ids = new Set(current.map(x => x.id));
        return [...incoming.filter(x => !ids.has(x.id)), ...current];
      };
      const presets = mode === "replace" ? data.presets : merge(savedPresets, data.presets);
      const rosters = mode === "replace" ? data.rosters : merge(savedRosters, data.rosters);
      const results = mode === "replace" ? data.results : merge(savedResults, data.results);
      const ok =
        savePresets(presets).ok && saveRosters(rosters).ok && saveResults(results).ok;
      if (ok) {
        notify(
          `読み込みました（レイアウト${presets.length}件・名簿${rosters.length}件・配置結果${results.length}件）。`,
          "success"
        );
      } else {
        setAlertMessage("読み込んだデータの保存に失敗しました。ブラウザの保存容量をご確認ください。");
      }
    },
    [notify, savedPresets, savedResults, savedRosters]
  );

  const importBackup = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = parseBackup(JSON.parse(text));
        if (!parsed) {
          setAlertMessage("このファイルは席替えシステムのバックアップではないようです。書き出した JSON ファイルを選んでください。");
          return;
        }
        const count = parsed.presets.length + parsed.rosters.length + parsed.results.length;
        if (!count) {
          setAlertMessage("ファイルに読み込めるデータが含まれていませんでした。");
          return;
        }
        confirm({
          title: "バックアップの読み込み",
          message: `ファイルから ${count} 件のデータを読み込みます。\n「追加する」を選ぶと、いまの保存データを残したまま追加します。既存のデータを置き換えたい場合は、先に不要なデータを削除してください。`,
          confirmLabel: "追加する",
          onConfirm: () => applyImport(parsed, "merge"),
        });
      } catch {
        setAlertMessage("ファイルの読み込みに失敗しました。JSON ファイルが壊れていないかご確認ください。");
      }
    },
    [applyImport, confirm]
  );

  const clearAllSavedData = useCallback(() => {
    if (!savedTotal) return;
    confirm({
      title: "保存データの全削除",
      message: `保存されているレイアウト・名簿・配置結果 ${savedTotal} 件すべてを削除します。この操作は取り消せません。必要であれば、先にバックアップを書き出してください。`,
      confirmLabel: "すべて削除",
      tone: "danger",
      onConfirm: () => {
        savePresets([]);
        saveRosters([]);
        saveResults([]);
        setSelectedResultId(null);
        setSelectedRosterId(null);
        notify("保存データをすべて削除しました。", "info");
      },
    });
  }, [confirm, notify, savedTotal]);

  // --- 履歴 ---
  const undo = useCallback(() => {
    if (isShuffling || !history.canUndo) return;
    history.undo();
    setSelectedSeatKey(null);
  }, [history, isShuffling]);

  const redo = useCallback(() => {
    if (isShuffling || !history.canRedo) return;
    history.redo();
    setSelectedSeatKey(null);
  }, [history, isShuffling]);

  // --- キーボードショートカット ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Escape") {
        if (reveal) setReveal(null);
        else if (selectedSeatKey) setSelectedSeatKey(null);
        return;
      }
      // 発表中は Space / Enter / → で次の人へ
      if (reveal && !typing && (e.key === " " || e.key === "Enter" || e.key === "ArrowRight")) {
        e.preventDefault();
        revealNext();
        return;
      }
      if (typing || !(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, reveal, revealNext, selectedSeatKey, undo]);

  return {
    // 席表の状態
    board,
    rows,
    cols,
    setRows,
    setCols,
    disabledSeats,
    pinnedSeats,
    aisleCols,
    aisleRows,
    seatingLayout: displayLayout,
    namesText,
    setNamesText,
    customTitle,
    setCustomTitle,
    isRestored,
    viewMode,
    setViewMode,
    showSeatNumbers,
    setShowSeatNumbers,
    seatNumbers,

    // 保存データ
    presetName,
    setPresetName,
    rosterName,
    setRosterName,
    resultName,
    setResultName,
    savedPresets,
    savedRosters,
    savedResults,
    savedTotal,
    selectedResultId,
    setSelectedResultId,
    selectedRosterId,
    setSelectedRosterId,
    presetTab,
    setPresetTab,

    // 操作の状態
    avoidSameSeat,
    setAvoidSameSeat,
    isShuffling,
    dragPayload,
    dragOverSeatKey,
    selectedSeatKey,
    clearSelection,

    // 配慮事項
    accommodations,
    activeAccommodations,
    accommodationCount,
    toggleZone,
    addSeparatePair,
    removeSeparatePair,
    clearAccommodations,
    rosterMeta,

    // 発表モード
    reveal,
    revealCurrentName,
    revealCurrentKey,
    startReveal,
    revealNext,
    revealAll,
    endReveal,
    isHidden,

    // 集計
    parsedNames,
    duplicates,
    totalSeats,
    activeSeatsCount,
    pinnedCount,
    shuffleSeatCount,
    studentCount,
    placedCount,
    unassignedNames,
    strayNames,
    seatDeficit,

    // 通知・ダイアログ
    toasts,
    dismissToast,
    notify,
    alertMessage,
    closeAlert,
    confirmConfig,
    closeConfirm,

    // 操作
    toggleSeatDisabled,
    toggleAisleCol,
    toggleAisleRow,
    togglePinned,
    removeFromSeat,
    swapSeats,
    assignNameToSeat,
    placeNameInFirstVacancy,
    handleSeatActivate,
    fillSampleNames,
    clearNames,
    removeStrayNames,
    startShuffle,
    assignInOrder,
    clearLayout,
    fullReset,

    // ドラッグ＆ドロップ
    handleDragStart,
    handleNameDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,

    // 保存データの操作
    savePreset,
    loadPreset,
    deletePreset,
    saveRoster,
    updateRoster,
    loadRoster,
    deleteRoster,
    saveResult,
    updateResult,
    loadResult,
    deleteResult,
    exportBackup,
    importBackup,
    clearAllSavedData,
    exportNamesCsv,
    importNamesFile,
    exportSeatingCsv,

    // 履歴
    undo,
    redo,
    canUndo: history.canUndo && !isShuffling,
    canRedo: history.canRedo && !isShuffling,

    // 表示ヘルパー
    formatStamp,
    MIN_DIM,
    MAX_DIM,
  };
}

export type SeatingHook = ReturnType<typeof useSeating>;
