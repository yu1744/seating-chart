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

/** 名簿の 1 人分の付加情報（名前そのものは namesText 側が持つ）。 */
export interface StudentMeta {
  /** 出席番号。 */
  no?: number;
  /** ふりがな。 */
  kana?: string;
  /** 性別（男女交互の配置に使う）。 */
  gender?: "m" | "f";
}

/** 名前をキーにした付加情報。同姓同名は同じ情報を共有する。 */
export type RosterMeta = Record<string, StudentMeta>;

/** 希望する区画。前後と左右はそれぞれ排他。 */
export type SeatZone = "front" | "back" | "left" | "right";

/** 席替えのときに守りたい配慮事項。 */
export interface Accommodations {
  /** 前方の席にしたい人（視力・聴力など）。 */
  front: string[];
  /** 後方の席にしたい人（身長など）。 */
  back: string[];
  /** 左側の席にしたい人（窓側・廊下側は教室によって異なる）。 */
  left: string[];
  /** 右側の席にしたい人。 */
  right: string[];
  /** 隣・前後にしたくない組。 */
  separate: [string, string][];
}

export const emptyAccommodations = (): Accommodations => ({
  front: [],
  back: [],
  left: [],
  right: [],
  separate: [],
});

/** 名簿（名前一覧と、その付加情報・配慮事項）。 */
export interface StudentRoster {
  id: string;
  name: string;
  namesText: string;
  /** v3 以降で追加。旧データには存在しない。 */
  meta?: RosterMeta;
  accommodations?: Accommodations;
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
  meta?: RosterMeta;
  accommodations?: Accommodations;
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
  meta: RosterMeta;
  accommodations: Accommodations;
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
