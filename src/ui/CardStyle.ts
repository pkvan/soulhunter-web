import { UpgradeDef, FusionDef, WeaponChoice } from "@types/index";

export type CardData =
  | (UpgradeDef & { currentStack?: number })
  | (WeaponChoice & { currentLevel?: number })
  | { fusion: true; fusionId: string; def: FusionDef };

export interface CardStyle {
  bg: number;
  border: number;
  borderWidth: number;
  label?: string;
  labelColor?: string;
}

/**
 * Style phân loại theo CardData ("mới nhặt" / "nâng cấp" / "fusion khả dụng") — dùng cho badge label +
 * màu nền trong CollectionCard (LevelUpScene) và tray loadout thu nhỏ trong PauseScene, để 2 nơi LUÔN
 * đồng bộ 1 bảng màu trạng thái, khác với màu VIỀN theo rarity (xem ui/CollectionCard.ts RARITY_COLORS).
 */
export function getCardStyle(data: CardData): CardStyle {
  if ("fusion" in data && data.fusion) {
    return { bg: 0x4a1b0c, border: 0xd85a30, borderWidth: 2, label: "FUSION KHẢ DỤNG", labelColor: "#d85a30" };
  }
  if ("weapon" in data && data.weapon) {
    return data.isNew
      ? { bg: 0x0c2a4a, border: 0x4aa3ff, borderWidth: 2, label: "VŨ KHÍ MỚI", labelColor: "#4aa3ff" }
      : { bg: 0x123317, border: 0x4ade80, borderWidth: 2, label: "NÂNG CẤP", labelColor: "#4ade80" };
  }
  return { bg: 0x2c2c2a, border: 0x5f5e5a, borderWidth: 1 };
}
