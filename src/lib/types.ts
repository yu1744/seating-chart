/** 席表の寸法・無効席・固定席・配置をまとめた、履歴（元に戻す）の単位となる状態。 */
export interface Board {
  rows: number;
  cols: number;
  /** 座席キー（`r0-c0` 形式）→ 名前。空席は null。 */
  layout: Record<string, string | null>;
  /** 使わない席（教卓の位置など）＝無効席のキー一覧。 */
  disabled: string[];
  /** シャッフルしても動かさない固定席のキー一覧。 */
  pinned: string[];
  /** 縦の通路。値 i は「i 列目と i+1 列目の間」を表す（1 以上 cols-1 以下）。 */
  aisleCols: number[];
  /** 横の通路。値 i は「i 行目と i+1 行目の間」を表す（1 以上 rows-1 以下）。 */
  aisleRows: number[];
}

/** レイアウト型紙（サイズ・無効席・通路の設定のみ）。 */
export interface SeatingPreset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  disabledSeats: string[];
  /** v3 以降で追加。旧データには存在しない。 */
  aisleCols?: number[];
  aisleRows?: number[];
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
  /** v3 以降で追加。旧データには存在しない。 */
  aisleCols?: number[];
  aisleRows?: number[];
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
