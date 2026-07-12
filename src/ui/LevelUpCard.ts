import Phaser from "phaser";
import { UpgradeDef, FusionDef, WeaponDef, WeaponChoice } from "@types/index";
import { renderWeaponIcon } from "@ui/WeaponIcon";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";

const weapons = weaponsData as WeaponDef[];
const fusionWeapons = fusionWeaponsData as WeaponDef[];
const allWeaponDefs = [...weapons, ...fusionWeapons];

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

const CARD_W = 190;
const CARD_H = 250;

/**
 * Style phân loại theo CardData — dùng chung cho LevelUpCard (màn Level Up) và tray loadout thu nhỏ
 * trong PauseScene, để 2 nơi LUÔN đồng bộ 1 bảng màu, không tách bảng màu riêng dễ lệch nhau khi sửa sau này.
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

/**
 * 1 thẻ lựa chọn trong màn Level Up — Icon + Tên + Level (nếu có) + Rarity (nếu data có field, hiện chưa
 * data nào set) + Description (tối đa 2 dòng, luôn đọc từ data — weapons.json/fusionWeapons.json/upgrades.json
 * đều có sẵn description, KHÔNG hardcode text theo id trong file này). Hover phóng to nhẹ + glow viền để
 * "nổi bật" khi người chơi rê chuột cân nhắc chọn.
 */
export class LevelUpCard {
  public container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    data: CardData,
    onSelect: () => void
  ) {
    const style = getCardStyle(data);
    const elements: Phaser.GameObjects.GameObject[] = [];

    // Glow viền phía sau bg — ẩn mặc định, chỉ hiện khi hover (xem cuối constructor).
    const glow = scene.add.rectangle(0, 0, CARD_W + 14, CARD_H + 14, style.border, 0.35).setVisible(false);
    elements.push(glow);

    const bg = scene.add.rectangle(0, 0, CARD_W, CARD_H, style.bg).setStrokeStyle(style.borderWidth, style.border);
    elements.push(bg);

    let cursorY = -CARD_H / 2 + 34;

    const iconSize = 44;
    elements.push(this.renderIcon(scene, cursorY, data, style));
    cursorY += iconSize + 14;

    const rarity = this.getRarity(data);
    if (rarity) {
      elements.push(scene.add.text(0, -CARD_H / 2 + 10, rarity.toUpperCase(), {
        fontSize: "9px", color: "#fbbf24", fontStyle: "bold"
      }).setOrigin(0.5));
    }

    if (style.label) {
      elements.push(scene.add.text(0, cursorY, style.label, {
        fontSize: "10px", color: style.labelColor ?? "#ffffff", fontStyle: "bold"
      }).setOrigin(0.5));
      cursorY += 16;
    }

    elements.push(scene.add.text(0, cursorY, this.getTitle(data), {
      fontSize: "15px", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: CARD_W - 16 }
    }).setOrigin(0.5));
    cursorY += 22;

    const levelText = this.getLevelText(data);
    if (levelText) {
      elements.push(scene.add.text(0, cursorY, levelText, {
        fontSize: "12px", color: "#9ca3af"
      }).setOrigin(0.5));
      cursorY += 18;
    }

    cursorY += 10;
    elements.push(scene.add.text(0, cursorY, this.getDescription(data), {
      fontSize: "12px", color: "#d1d5db", align: "center", lineSpacing: 3,
      wordWrap: { width: CARD_W - 24 }
    }).setOrigin(0.5, 0));

    this.container = scene.add.container(x, y, elements);
    this.container.setSize(CARD_W, CARD_H);
    // Container mặc định origin (0.5, 0.5) -> Phaser tự cộng thêm displayOriginX/Y vào tọa độ trước khi so
    // khớp hitArea, nên hitArea phải khai báo từ (0,0) chứ không phải tâm.
    this.container.setInteractive(new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains);

    this.container.on("pointerover", () => {
      glow.setVisible(true);
      this.container.setScale(1.05);
    });
    this.container.on("pointerout", () => {
      glow.setVisible(false);
      this.container.setScale(1);
    });
    this.container.on("pointerdown", onSelect);
  }

  private renderIcon(scene: Phaser.Scene, y: number, data: CardData, style: CardStyle): Phaser.GameObjects.GameObject {
    const iconSize = 44;
    if ("fusion" in data && data.fusion) {
      const weaponDef = allWeaponDefs.find((w) => w.id === data.fusionId);
      if (weaponDef) return renderWeaponIcon(scene, 0, y + iconSize / 2, weaponDef, iconSize);
    }
    if ("weapon" in data && data.weapon) {
      const weaponDef = allWeaponDefs.find((w) => w.id === data.weaponId);
      if (weaponDef) return renderWeaponIcon(scene, 0, y + iconSize / 2, weaponDef, iconSize);
    }
    // Stat upgrade: không có weapon icon riêng — chấm tròn trung tính theo màu viền của card.
    return scene.add.circle(0, y + iconSize / 2, iconSize / 2, style.border, 0.9);
  }

  private getTitle(data: CardData): string {
    if ("fusion" in data && data.fusion) {
      return data.def.name;
    }
    if ("weapon" in data && data.weapon) {
      const weaponDef = allWeaponDefs.find((w) => w.id === data.weaponId);
      return weaponDef?.name ?? data.weaponId;
    }
    return (data as UpgradeDef).name;
  }

  private getDescription(data: CardData): string {
    if ("fusion" in data && data.fusion) {
      const weaponDef = allWeaponDefs.find((w) => w.id === data.fusionId);
      return weaponDef?.description ?? data.def.effect;
    }
    if ("weapon" in data && data.weapon) {
      const weaponDef = allWeaponDefs.find((w) => w.id === data.weaponId);
      return weaponDef?.description ?? "";
    }
    return (data as UpgradeDef).description ?? "";
  }

  private getLevelText(data: CardData): string | null {
    if ("fusion" in data && data.fusion) return null; // fusion luôn max level 1, không cần hiện
    if ("weapon" in data && data.weapon) {
      if (data.isNew) return "Lv. 1";
      const current = data.currentLevel ?? 1;
      return `Lv. ${current} → ${current + 1}`;
    }
    const stack = (data as UpgradeDef & { currentStack?: number }).currentStack;
    return stack && stack > 0 ? `Đã có: x${stack} → x${stack + 1}` : null;
  }

  private getRarity(data: CardData): string | undefined {
    if ("fusion" in data && data.fusion) return undefined; // FusionDef chưa có field rarity
    if ("weapon" in data && data.weapon) {
      return allWeaponDefs.find((w) => w.id === data.weaponId)?.rarity;
    }
    return (data as UpgradeDef).rarity;
  }

  destroy(): void {
    this.container.destroy();
  }
}
