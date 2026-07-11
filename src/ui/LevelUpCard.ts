import Phaser from "phaser";
import { UpgradeDef, FusionDef, WeaponDef, UpgradeChoice } from "@types/index";
import weaponsData from "@data/weapons.json";

const weapons = weaponsData as WeaponDef[];

type CardData = UpgradeChoice | { fusion: true; fusionId: string; def: FusionDef };

interface CardStyle {
  bg: number;
  border: number;
  borderWidth: number;
  label?: string;
  labelColor?: string;
}

/**
 * 1 thẻ lựa chọn trong màn Level Up. 4 loại thẻ có style khác biệt rõ rệt để phân biệt bằng mắt:
 * stat upgrade thường (trung tính), vũ khí mới (xanh dương), nâng cấp level vũ khí (xanh lá), fusion (cam/đỏ).
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
    const style = this.getStyle(data);
    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.rectangle(0, 0, 180, 220, style.bg).setStrokeStyle(style.borderWidth, style.border);
    elements.push(bg);

    const title = scene.add.text(0, -80, this.getTitle(data), {
      fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 160 }
    }).setOrigin(0.5);
    elements.push(title);

    if (style.label) {
      const badge = scene.add.text(0, -100, style.label, {
        fontSize: "11px", color: style.labelColor ?? "#ffffff", fontStyle: "bold"
      }).setOrigin(0.5);
      elements.push(badge);
    }

    // TODO: thêm icon Tabler-style hoặc sprite icon riêng cho từng upgrade/vũ khí/fusion

    this.container = scene.add.container(x, y, elements);
    this.container.setSize(180, 220);
    // Container mặc định origin (0.5, 0.5) -> Phaser tự cộng thêm displayOriginX/Y (90, 110) vào tọa độ
    // trước khi so khớp hitArea, nên hitArea phải khai báo từ (0,0) chứ không phải tâm (-90,-110)
    // (khai báo tâm sẽ khiến vùng click ăn thực tế bị lệch hẳn ra góc trên-trái của card).
    this.container.setInteractive(new Phaser.Geom.Rectangle(0, 0, 180, 220), Phaser.Geom.Rectangle.Contains);
    this.container.on("pointerdown", onSelect);
  }

  private getStyle(data: CardData): CardStyle {
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

  private getTitle(data: CardData): string {
    if ("fusion" in data && data.fusion) {
      return data.def.name;
    }
    if ("weapon" in data && data.weapon) {
      const weaponDef = weapons.find((w) => w.id === data.weaponId);
      const name = weaponDef?.name ?? data.weaponId;
      return data.isNew ? name : `${name}\nLv. Up`;
    }
    return (data as UpgradeDef).name;
  }

  destroy(): void {
    this.container.destroy();
  }
}
