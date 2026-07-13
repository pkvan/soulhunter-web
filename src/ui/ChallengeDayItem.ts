import Phaser from "phaser";
import { ChallengeDayDef } from "@types/index";
import { ChallengeDayState } from "@systems/Challenge7DaysManager";
import { drawLockIcon, drawCheckIcon, drawStarIcon } from "@ui/ChallengeIcons";

const ITEM_W = 176;
const ITEM_H = 56;
const HIT_PADDING = 8; // vùng bấm rộng hơn khung nhìn thấy — dễ trúng hơn ở rìa item

/**
 * 1 hàng "Ngày N" trong cột trái popup Thử Thách 7 Ngày. `state`/`isSelected` chỉ quyết định CÁCH VẼ —
 * dữ liệu unlock/progress luôn lấy từ Challenge7DaysManager, component này không tự đọc localStorage.
 * Icon trạng thái (khoá/tích/sao) dùng vector (ChallengeIcons.ts) thay vì ký tự Unicode để không bị crop.
 * Chọn ngày kích hoạt lúc pointerup (không phải pointerdown) để có hiệu ứng "nhấn" (scale nhỏ lại) hiện rõ
 * trước khi cả popup render lại — hành vi giống nút bấm chuẩn thay vì phản hồi tức thời không rõ ràng.
 */
export class ChallengeDayItem {
  public container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: ChallengeDayDef,
    state: ChallengeDayState,
    isSelected: boolean,
    onSelect: () => void
  ) {
    const elements: Phaser.GameObjects.GameObject[] = [];
    const isLocked = state === "locked";
    const iconCx = ITEM_W - 24;
    const iconCy = ITEM_H / 2;

    // Glow nền phía sau — chỉ hiện khi được chọn, tạo chiều sâu rõ rệt hơn 1 viền mỏng đơn thuần.
    if (isSelected) {
      elements.push(scene.add.rectangle(ITEM_W / 2, ITEM_H / 2, ITEM_W + 16, ITEM_H + 16, 0xfacc15, 0.22));
    }

    const bgColor = state === "current" ? 0x14532d : state === "completed" ? 0x1f2937 : 0x111827;
    const borderColor = isSelected ? 0xfacc15 : state === "current" ? 0x4ade80 : state === "completed" ? 0x4b5563 : 0x27272a;

    this.bg = scene.add
      .rectangle(ITEM_W / 2, ITEM_H / 2, ITEM_W, ITEM_H, bgColor)
      .setStrokeStyle(isSelected ? 3 : state === "current" ? 3 : 1, borderColor);
    elements.push(this.bg);

    elements.push(
      scene.add
        .text(16, ITEM_H / 2, `Ngày ${def.day}`, {
          fontSize: "13px",
          color: isLocked ? "#4b5563" : "#ffffff",
          fontStyle: state === "current" || isSelected ? "bold" : "normal"
        })
        .setOrigin(0, 0.5)
    );

    if (state === "completed") {
      elements.push(drawCheckIcon(scene, iconCx, iconCy, 20, 0x4ade80));
    } else if (isLocked) {
      elements.push(scene.add.rectangle(ITEM_W / 2, ITEM_H / 2, ITEM_W, ITEM_H, 0x000000, 0.5)); // overlay tối
      elements.push(drawLockIcon(scene, iconCx, iconCy, 18, 0x6b7280));
    } else if (state === "current") {
      elements.push(drawStarIcon(scene, iconCx, iconCy, 20, 0xfacc15));
    }

    this.container = scene.add.container(x - ITEM_W / 2, y - ITEM_H / 2, elements);

    if (!isLocked) {
      this.container.setSize(ITEM_W, ITEM_H);
      this.container.setInteractive(
        new Phaser.Geom.Rectangle(-HIT_PADDING, -HIT_PADDING, ITEM_W + HIT_PADDING * 2, ITEM_H + HIT_PADDING * 2),
        Phaser.Geom.Rectangle.Contains
      );
      this.container.on("pointerover", () => this.bg.setAlpha(0.85));
      this.container.on("pointerout", () => {
        this.bg.setAlpha(1);
        this.container.setScale(1);
      });
      this.container.on("pointerdown", () => this.container.setScale(0.96));
      this.container.on("pointerup", () => {
        this.container.setScale(1);
        onSelect();
      });
    }

    if (state === "current" && !isSelected) {
      scene.tweens.add({ targets: this.bg, alpha: { from: 1, to: 0.7 }, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
