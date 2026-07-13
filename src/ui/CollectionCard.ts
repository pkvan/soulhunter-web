import Phaser from "phaser";
import { Rarity } from "@types/index";

export const CARD_W = 190;
export const CARD_H = 250;

/**
 * Font dùng chung cho mọi Card + toàn bộ UI Collection — không dùng font mặc định của Phaser (Courier,
 * monospace, khó đọc) nữa. TITLE_FONT (serif) cho Title/Header mang cảm giác fantasy/Codex, BODY_FONT
 * (sans-serif rõ nét) cho Description/stat để dễ đọc ở size nhỏ. Đều là font hệ thống có sẵn (không tải
 * mạng, không thêm dependency) nên luôn sẵn sàng ngay khi vẽ, không có rủi ro FOUT trên canvas.
 */
export const TITLE_FONT = "Georgia, 'Times New Roman', serif";
export const BODY_FONT = "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";

const HEADER_H = 34;
const ICON_SIZE = 64;
const NEUTRAL_BORDER = 0x5f5e5a;
const NEUTRAL_BG = 0x232320;
const TEXT_SHADOW = { offsetX: 0, offsetY: 1, color: "#000000", blur: 3, fill: true };

/** Màu viền theo rarity — dùng CHUNG cho mọi nơi hiện Card (Collection grid + LevelUpScene), 1 bảng màu duy nhất. */
export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9ca3af,
  rare: 0x4aa3ff,
  epic: 0xa78bfa,
  legendary: 0xfacc15
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY"
};

/**
 * Nội dung hiển thị của 1 Card — KHÔNG biết gì về nguồn dữ liệu gốc (Weapon/Enemy/Boss/Upgrade/Fusion),
 * chỉ nhận đúng những gì cần vẽ. Đây là "hợp đồng" duy nhất giữa mọi nơi TẠO card (CollectionScene 4 tab,
 * LevelUpScene) và CollectionCard (nơi VẼ card) — nhờ vậy toàn game chỉ có 1 hệ thống Card thống nhất.
 */
export interface CardContent {
  title: string;
  description: string;
  rarity?: Rarity; // không có -> viền màu trung tính (vd Monster/Boss hiện chưa gán rarity)
  locked?: boolean; // true -> ẩn hết thông tin thật, hiện "?????" / silhouette / "Chưa khám phá."
  renderIcon: (scene: Phaser.Scene, x: number, y: number, size: number) => Phaser.GameObjects.GameObject;
  statLines?: string[]; // vd ["HP: 120", "Damage: 12", "Speed: 60"] hoặc ["Lv. 1 → 2"] — tối đa 3 dòng cho vừa layout
  badgeLabel?: string; // vd "VŨ KHÍ MỚI" / "FUSION KHẢ DỤNG" — tuỳ chọn, KHÔNG phải rarity
  badgeColor?: string;
}

function renderLockedIcon(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.GameObject {
  const g = scene.add.graphics();
  g.fillStyle(0x1f1f1d, 1);
  g.fillCircle(x, y, size / 2);
  g.lineStyle(2, 0x3f3f3a, 1);
  g.strokeCircle(x, y, size / 2);
  const container = scene.add.container(0, 0, [g, scene.add.text(x, y, "?", { fontFamily: TITLE_FONT, fontSize: `${size * 0.55}px`, color: "#5a5a55", fontStyle: "bold" }).setOrigin(0.5)]);
  return container;
}

/**
 * Card fantasy/roguelite dùng chung cho Collection (4 tab, read-only) và LevelUpScene (chọn Upgrade khi
 * nhặt Soul, có onSelect). Cấu trúc: Header (title) / Image lớn / stat lines / Description — nền nhiều lớp
 * (shadow + viền rarity + fill tối + line phân cách header) vẽ bằng Graphics để bo góc thật, không phải
 * 1 Rectangle phẳng. Hover (phóng to nhẹ + glow) luôn bật nếu unlocked; click animation (bounce trước khi
 * gọi onSelect ở pointerup) chỉ bật nếu có onSelect — Collection chỉ xem, không chọn được.
 */
export class CollectionCard {
  public container: Phaser.GameObjects.Container;
  private baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, content: CardContent, onSelect?: () => void) {
    const elements: Phaser.GameObjects.GameObject[] = [];
    const isLocked = content.locked === true;
    const borderColor = isLocked ? 0x2a2a27 : content.rarity ? RARITY_COLORS[content.rarity] : NEUTRAL_BORDER;

    // Glow phía sau — ẩn mặc định, chỉ hiện khi hover (xem cuối constructor). Không hiện cho card khoá.
    const glow = scene.add.rectangle(0, 0, CARD_W + 16, CARD_H + 16, borderColor, 0.3).setVisible(false);
    elements.push(glow);

    const bg = scene.add.graphics();
    // Shadow đổ lệch xuống-phải, tạo chiều sâu thay vì 1 panel phẳng.
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 6, CARD_W, CARD_H, 10);
    // Fill chính + viền theo rarity.
    bg.fillStyle(isLocked ? 0x181816 : NEUTRAL_BG, 1);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    bg.lineStyle(isLocked ? 1 : 2, borderColor, isLocked ? 0.5 : 1);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    // Header: nền hơi sáng hơn phần thân + line phân cách.
    bg.fillStyle(0xffffff, isLocked ? 0.02 : 0.05);
    bg.fillRoundedRect(-CARD_W / 2 + 2, -CARD_H / 2 + 2, CARD_W - 4, HEADER_H, { tl: 8, tr: 8, bl: 0, br: 0 });
    bg.lineStyle(1, borderColor, isLocked ? 0.25 : 0.5);
    bg.lineBetween(-CARD_W / 2 + 2, -CARD_H / 2 + HEADER_H, CARD_W / 2 - 2, -CARD_H / 2 + HEADER_H);
    elements.push(bg);

    const top = -CARD_H / 2;

    if (!isLocked && content.rarity) {
      elements.push(
        scene.add
          .text(CARD_W / 2 - 10, top + 9, RARITY_LABEL[content.rarity], {
            fontFamily: BODY_FONT,
            fontSize: "9px",
            color: `#${RARITY_COLORS[content.rarity].toString(16).padStart(6, "0")}`,
            fontStyle: "bold",
            letterSpacing: 0.5,
            shadow: TEXT_SHADOW
          })
          .setOrigin(1, 0.5)
      );
    }

    // Title: font serif riêng (TITLE_FONT) + stroke/shadow để nổi hẳn trên nền tối, đúng cảm giác Codex/Bestiary thay vì UI debug.
    elements.push(
      scene.add
        .text(-CARD_W / 2 + 12, top + HEADER_H / 2 + 2, isLocked ? "?????" : content.title, {
          fontFamily: TITLE_FONT,
          fontSize: "16px",
          color: isLocked ? "#4b5563" : "#fff3d6",
          fontStyle: "bold",
          stroke: isLocked ? undefined : "#1a1408",
          strokeThickness: isLocked ? 0 : 3,
          shadow: TEXT_SHADOW,
          wordWrap: { width: CARD_W - 44 }
        })
        .setOrigin(0, 0.5)
    );

    let cursorY = top + HEADER_H + 11;

    if (!isLocked && content.badgeLabel) {
      elements.push(
        scene.add
          .text(0, cursorY, content.badgeLabel, {
            fontFamily: BODY_FONT,
            fontSize: "11px",
            color: content.badgeColor ?? "#ffffff",
            fontStyle: "bold",
            letterSpacing: 0.3,
            shadow: TEXT_SHADOW
          })
          .setOrigin(0.5)
      );
      cursorY += 16;
    }

    const iconY = cursorY + ICON_SIZE / 2 + 2;
    elements.push(isLocked ? renderLockedIcon(scene, 0, iconY, ICON_SIZE) : content.renderIcon(scene, 0, iconY, ICON_SIZE));
    cursorY = iconY + ICON_SIZE / 2 + 10;

    if (!isLocked && content.statLines && content.statLines.length > 0) {
      elements.push(
        scene.add
          .text(0, cursorY, content.statLines.join("\n"), {
            fontFamily: BODY_FONT,
            fontSize: "12px",
            color: "#eef0f3",
            align: "center",
            lineSpacing: 6
          })
          .setOrigin(0.5, 0)
      );
      cursorY += content.statLines.length * 18 + 8;
    } else {
      cursorY += 4;
    }

    elements.push(
      scene.add
        .text(0, cursorY, isLocked ? "Chưa khám phá." : content.description, {
          fontFamily: BODY_FONT,
          fontSize: "12px",
          color: isLocked ? "#4b5563" : "#c7cad1",
          align: "center",
          lineSpacing: 6,
          wordWrap: { width: CARD_W - 22 }
        })
        .setOrigin(0.5, 0)
    );

    // Vùng click riêng — Rectangle THẬT (alpha 0) phủ đúng CARD_W x CARD_H, dùng setInteractive() KHÔNG
    // truyền shape thủ công để Phaser tự tính hit area theo width/height/origin thật. Trước đây interactive
    // gắn thẳng vào Container kèm `new Phaser.Geom.Rectangle(...)` tính tay — đã xác nhận qua test Browser
    // rằng cách đó chỉ ăn click ở khoảng nửa diện tích, phần còn lại không phản hồi dù đúng toán trên giấy.
    const hitZone = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0.001);
    elements.push(hitZone);

    this.container = scene.add.container(x, y, elements);
    this.container.setSize(CARD_W, CARD_H);

    if (isLocked) return;

    hitZone.setInteractive({ useHandCursor: !!onSelect });

    hitZone.on("pointerover", () => {
      glow.setVisible(true);
      scene.tweens.add({ targets: this.container, scale: this.baseScale * 1.05, duration: 120, ease: "Cubic.easeOut" });
    });
    hitZone.on("pointerout", () => {
      glow.setVisible(false);
      scene.tweens.add({ targets: this.container, scale: this.baseScale, duration: 120, ease: "Cubic.easeOut" });
    });

    if (onSelect) {
      // Chọn ngay lúc pointerdown (không chờ pointerup) — bấm xong LevelUpScene destroy toàn bộ card ngay,
      // gating theo pointerup không cần thiết và rủi ro miss-click nếu down/up rơi trên 2 target khác nhau.
      // Hiệu ứng "nổi bật khi được chọn" vẫn chạy (bung to nhanh) nhưng KHÔNG trì hoãn việc gọi onSelect().
      hitZone.on("pointerdown", () => {
        scene.tweens.add({ targets: this.container, scale: this.baseScale * 1.15, duration: 90, ease: "Back.easeOut" });
        onSelect();
      });
    }
  }

  /** Tỉ lệ "nghỉ" của card (vd GRID_SCALE trong CollectionScene) — hover/click animate quanh mốc này thay vì đè scale tuyệt đối 1, tránh card bung về full size khi đang bị thu nhỏ trong grid. */
  setBaseScale(scale: number): void {
    this.baseScale = scale;
    this.container.setScale(scale);
  }

  destroy(): void {
    this.container.destroy();
  }
}
