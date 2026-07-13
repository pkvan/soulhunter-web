import Phaser from "phaser";
import { ChallengeMilestoneDef } from "@types/index";
import { ChallengeMilestoneState } from "@systems/Challenge7DaysManager";
import { drawLockIcon, drawCheckIcon, drawStarIcon } from "@ui/ChallengeIcons";

const ICON_SIZE = 28;
const LABEL_GAP = 10; // khoảng cách từ mép icon tới chữ reward
/** Offset X (từ tâm icon) tới điểm bắt đầu label reward — Scene dùng hằng số này để tính đúng bề rộng còn lại tới mép panel, tránh hardcode trùng lặp gây lệch. */
export const MILESTONE_LABEL_OFFSET_X = ICON_SIZE / 2 + LABEL_GAP;
const MAX_LABEL_LINES = 2;

const ICON_COLORS: Record<string, number> = {
  coin: 0xfbbf24,
  weapon: 0x4aa3ff,
  token: 0xa78bfa
};

/** claimed = đã nhận reward trừu tượng (Coin/Token). owned = riêng "weapon_unlock" đã nhận VÀ đang thực sự sở hữu vũ khí đó — viền/màu khác hẳn để người chơi phân biệt ngay. */
const STATE_STYLE: Record<ChallengeMilestoneState, { border: number; text: string; checkColor: number }> = {
  locked: { border: 0x111827, text: "#4b5563", checkColor: 0x000000 },
  available: { border: 0x111827, text: "#e5e7eb", checkColor: 0x000000 },
  claimed: { border: 0x4ade80, text: "#4ade80", checkColor: 0xffffff },
  owned: { border: 0x4aa3ff, text: "#4aa3ff", checkColor: 0xffffff }
};

/** Cắt text về tối đa `maxLines` dòng theo wordWrap hiện có của `textObj`, thêm "..." vào dòng cuối nếu bị cắt — tránh text tràn ra ngoài khung khi reward name dài (vd "Mở Khóa Vũ Khí Đặc Biệt"). */
function clampToLines(textObj: Phaser.GameObjects.Text, fullText: string, maxLines: number): string {
  const wrapped = textObj.getWrappedText(fullText);
  if (wrapped.length <= maxLines) return fullText;

  let lastLine = wrapped[maxLines - 1];
  const build = () => wrapped.slice(0, maxLines - 1).concat(lastLine.trimEnd() + "...").join(" ");
  while (lastLine.length > 1 && textObj.getWrappedText(build()).length > maxLines) {
    lastLine = lastLine.slice(0, -1);
  }
  return build();
}

/**
 * 1 mốc thưởng dọc theo thanh sao ở cột phải popup — icon tròn màu theo `rewardIcon` + khoá/tích vector
 * (ChallengeIcons.ts, không dùng emoji để tránh crop) + nhãn "{requiredStars}⭐" và TÊN/SỐ LƯỢNG reward đầy
 * đủ (`rewardLabel`, do Challenge7DaysManager.getMilestoneRewardLabel() tính sẵn — component không tự suy
 * luận tên reward). `maxLabelWidth` do Scene truyền vào (khoảng trống thật còn lại tới mép panel) — label
 * luôn wordWrap trong khoảng này và bị clamp tối đa `MAX_LABEL_LINES` dòng (thêm "...") để KHÔNG BAO GIỜ
 * tràn ra ngoài panel dù reward name dài cỡ nào. (x,y) là tâm icon — mọi children canh giữa quanh gốc container.
 */
export class ChallengeRewardMilestone {
  public container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: ChallengeMilestoneDef,
    state: ChallengeMilestoneState,
    rewardLabel: string,
    maxLabelWidth: number,
    onClaim: () => void
  ) {
    const elements: Phaser.GameObjects.GameObject[] = [];
    const style = STATE_STYLE[state];

    const glow = scene.add.circle(0, 0, ICON_SIZE / 2 + 6, 0xfacc15, 0.35).setVisible(state === "available");
    elements.push(glow);

    const iconColor = state === "locked" ? 0x374151 : ICON_COLORS[def.rewardIcon] ?? 0x9ca3af;
    const icon = scene.add.circle(0, 0, ICON_SIZE / 2, iconColor, state === "locked" ? 0.35 : 1).setStrokeStyle(2, style.border);
    elements.push(icon);

    if (state === "claimed" || state === "owned") {
      elements.push(drawCheckIcon(scene, 0, 0, 14, style.checkColor));
    } else if (state === "locked") {
      elements.push(drawLockIcon(scene, 0, 0, 13, 0x1f2937));
    }

    const labelX = MILESTONE_LABEL_OFFSET_X;
    const starColor = state === "locked" ? 0x4b5563 : 0xfacc15;
    elements.push(
      scene.add.text(labelX, -12, `${def.requiredStars}`, { fontSize: "12px", color: state === "locked" ? "#4b5563" : "#facc15", fontStyle: "bold" }).setOrigin(0, 0.5)
    );
    elements.push(drawStarIcon(scene, labelX + 22, -12, 12, starColor));

    const labelY = state === "owned" ? 20 : 6;
    if (state === "owned") {
      elements.push(scene.add.text(labelX, 6, "ĐANG SỞ HỮU", { fontSize: "9px", color: "#4aa3ff", fontStyle: "bold" }).setOrigin(0, 0));
    }

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "11px",
      color: style.text,
      fontStyle: "bold",
      wordWrap: { width: maxLabelWidth }
    };
    const labelObj = scene.add.text(labelX, labelY, rewardLabel, labelStyle).setOrigin(0, 0);
    labelObj.setText(clampToLines(labelObj, rewardLabel, MAX_LABEL_LINES));
    elements.push(labelObj);

    this.container = scene.add.container(x, y, elements);

    if (state === "available") {
      const hitW = labelX + maxLabelWidth;
      this.container.setSize(hitW, 50);
      this.container.setInteractive(new Phaser.Geom.Rectangle(0, -20, hitW, 50), Phaser.Geom.Rectangle.Contains);
      this.container.on("pointerdown", onClaim);
      scene.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.75 }, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
