/** 席表の寸法・無効席・固定席・配置をまとめた、履歴（元に戻す）の単位となる状態。 */
export interface Board {
  rows: number;
  cols: number;
  /** 座席キー（`r0-c0` 形式）→ 名前。空席は null。 */
  layout: Record<string, string | null>;
  /** 通路などに使う無効席のキー一覧。 */
  disabled: string[];
  /** シャッフルしても動かさない固定席のキー一覧。 */
  pinned: string[];
}

/** レイアウト型紙（サイズと通路設定のみ）。 */
export interface SeatingPreset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  disabledSeats: string[];
  createdAt: string;
}

/** 名簿（名前一覧のみ）。 */
export interface StudentRoster {
  id: string;
  name: string;
  namesText: string;
  createdAt: string;
}

/** 配置結果（だれがどこに座っているかを含む全体）。 */
export interface SeatingResult {
  id: string;
  name: string;
  rows: number;
  cols: number;
  disabledSeats: string[];
  /** v2 以降で追加。旧データには存在しない。 */
  pinnedSeats?: string[];
  seatingLayout: Record<string, string | null>;
  namesText: string;
  customTitle: string;
  createdAt: string;
}

/** 作業中の内容（リロードしても復元できるようにする自動保存）。 */
export interface SessionSnapshot {
  board: Board;
  namesText: string;
  customTitle: string;
  savedAt: string;
}

/** 書き出し／読み込みで扱うバックアップファイルの形式。 */
export interface BackupFile {
  app: "seating-chart";
  version: 1;
  exportedAt: string;
  presets: SeatingPreset[];
  rosters: StudentRoster[];
  results: SeatingResult[];
}
