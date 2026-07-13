import Phaser from "phaser";
import { BODY_FONT } from "@ui/CollectionCard";

export const TAB_W = 148;
export const TAB_H = 50;

/**
 * 1 tab dọc trong menu trái CollectionScene (Monsters/Weapons/Bosses/Cards).
 *
 * HIT AREA: interactive gắn trực tiếp vào `this.bg` (Rectangle nền) bằng `setInteractive()` KHÔNG truyền
 * shape thủ công — để Phaser tự tính hit area theo đúng width/height/origin thật của Rectangle. Bản trước
 * gắn interactive vào Container kèm `new Phaser.Geom.Rectangle(0,0,TAB_W,TAB_H)` tính tay: tọa độ trên giấy
 * đúng nhưng thực tế chỉ ăn click ở khoảng nửa trái của tab (đã xác nhận qua test Browser — click bên phải
 * tab hoàn toàn không phản hồi dù vẫn nằm trong khung nhìn thấy). Toàn bộ hover/press/selected style vẫn
 * áp dụng cho `bg` nên style luôn khớp với vùng thực sự nhận click — không có object con nào khác chặn input
 * (glow chỉ là hiệu ứng thị giác, không set interactive; labelText cũng vậy).
 *
 * Chọn ngay lúc pointerdown (khớp pattern nút bấm còn lại của game — MenuScene/nút đóng popup) thay vì chờ
 * pointerup: đã xác nhận qua test Browser rằng pointerup không nhận event ổn định trong 1 số môi trường.
 *
 * QUAN TRỌNG: instance này SỐNG SUỐT vòng đời CollectionScene, KHÔNG bị destroy/recreate khi đổi tab —
 * CollectionScene chỉ gọi setSelected() để cập nhật màu/viền tại chỗ.
 */
export class CollectionTab {
  public container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private isSelected: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, isSelected: boolean, onSelect: () => void) {
    this.isSelected = isSelected;
    const elements: Phaser.GameObjects.GameObject[] = [];

    this.glow = scene.add.rectangle(TAB_W / 2, TAB_H / 2, TAB_W + 14, TAB_H + 14, 0xfacc15, 0.2).setVisible(isSelected);
    elements.push(this.glow);

    this.bg = scene.add
      .rectangle(TAB_W / 2, TAB_H / 2, TAB_W, TAB_H, isSelected ? 0x2c2410 : 0x18181b)
      .setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xfacc15 : 0x3f3f46);
    elements.push(this.bg);

    this.labelText = scene.add
      .text(TAB_W / 2, TAB_H / 2, label, {
        fontFamily: BODY_FONT,
        fontSize: "15px",
        color: isSelected ? "#facc15" : "#d1d5db",
        fontStyle: isSelected ? "bold" : "normal",
        letterSpacing: 0.5,
        shadow: { offsetX: 0, offsetY: 1, color: "#000000", blur: 3, fill: true }
      })
      .setOrigin(0.5);
    elements.push(this.labelText);

    this.container = scene.add.container(x - TAB_W / 2, y - TAB_H / 2, elements);

    // Toàn bộ diện tích bg (TAB_W x TAB_H, origin 0.5 mặc định) là vùng click — Phaser tự tính hit area
    // đúng theo kích thước thật, không cần Geom.Rectangle thủ công.
    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on("pointerover", () => {
      if (!this.isSelected) this.bg.setFillStyle(0x27272a);
    });
    this.bg.on("pointerout", () => {
      if (!this.isSelected) this.bg.setFillStyle(0x18181b);
    });
    this.bg.on("pointerdown", () => {
      if (!this.isSelected) onSelect();
    });
  }

  /** Cập nhật màu/viền/glow TẠI CHỖ, không destroy/recreate — dùng khi CollectionScene đổi tab. */
  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.glow.setVisible(selected);
    this.bg.setFillStyle(selected ? 0x2c2410 : 0x18181b);
    this.bg.setStrokeStyle(selected ? 3 : 1, selected ? 0xfacc15 : 0x3f3f46);
    this.labelText.setColor(selected ? "#facc15" : "#d1d5db");
    this.labelText.setFontStyle(selected ? "bold" : "normal");
  }

  destroy(): void {
    this.container.destroy();
  }
}
