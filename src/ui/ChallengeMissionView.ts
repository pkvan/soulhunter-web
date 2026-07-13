import Phaser from "phaser";
import { ChallengeDayDef, ChallengeMissionDef } from "@types/index";
import { ChallengeDayState } from "@systems/Challenge7DaysManager";
import { ChallengeProgressBar } from "@ui/ChallengeProgressBar";
import { drawCheckIcon, drawStarIcon } from "@ui/ChallengeIcons";

const CARD_W = 380;
const CARD_H = 78;
const CARD_GAP = 16;

/**
 * Cột giữa popup — danh sách 3-4 mission của ngày đang chọn ở cột trái, mỗi mission 1 "card" riêng (tên +
 * badge "+N⭐" + progress bar hoặc trạng thái Hoàn thành). Chỉ nhận data/callback đã tính sẵn từ
 * Challenge7DaysManager qua Challenge7DaysScene — không tự đọc Manager.
 */
export class ChallengeMissionView {
  public container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: ChallengeDayDef,
    state: ChallengeDayState,
    getMissionProgress: (mission: ChallengeMissionDef) => number,
    isMissionCompleted: (mission: ChallengeMissionDef) => boolean
  ) {
    const elements: Phaser.GameObjects.GameObject[] = [];
    const totalH = def.missions.length * CARD_H + (def.missions.length - 1) * CARD_GAP;
    const listTop = -totalH / 2;

    elements.push(
      scene.add.text(0, listTop - 34, `NGÀY ${def.day}`, { fontSize: "13px", color: "#9ca3af", fontStyle: "bold" }).setOrigin(0.5)
    );

    if (state === "locked") {
      elements.push(
        scene.add
          .text(0, listTop + totalH / 2, "Hoàn thành ngày trước để mở khóa", {
            fontSize: "13px",
            color: "#6b7280",
            align: "center",
            wordWrap: { width: 300 }
          })
          .setOrigin(0.5)
      );
      this.container = scene.add.container(x, y, elements);
      return;
    }

    def.missions.forEach((mission, index) => {
      const cardTop = listTop + index * (CARD_H + CARD_GAP);
      const completed = isMissionCompleted(mission);

      const cardBg = scene.add
        .rectangle(0, cardTop + CARD_H / 2, CARD_W, CARD_H, completed ? 0x143621 : 0x1f2937, 0.92)
        .setStrokeStyle(1, completed ? 0x2f6b45 : 0x374151);
      elements.push(cardBg);

      elements.push(
        scene.add
          .text(-CARD_W / 2 + 18, cardTop + 20, mission.name, { fontSize: "14px", color: "#ffffff", fontStyle: "bold" })
          .setOrigin(0, 0.5)
      );

      // Badge phần thưởng "+N⭐" dạng pill, góc phải mỗi card.
      const pillLabel = `+${mission.rewardStars}`;
      const pillW = 54;
      const pillCx = CARD_W / 2 - 18 - pillW / 2;
      const pillCy = cardTop + 20;
      elements.push(scene.add.rectangle(pillCx, pillCy, pillW, 24, 0x3a2f0a, 1).setStrokeStyle(1, 0xfacc15));
      elements.push(drawStarIcon(scene, pillCx - pillW / 2 + 15, pillCy, 15, 0xfacc15));
      elements.push(
        scene.add.text(pillCx - pillW / 2 + 26, pillCy, pillLabel, { fontSize: "12px", color: "#facc15", fontStyle: "bold" }).setOrigin(0, 0.5)
      );

      if (completed) {
        elements.push(drawCheckIcon(scene, -CARD_W / 2 + 22, cardTop + 54, 18, 0x4ade80));
        elements.push(
          scene.add.text(-CARD_W / 2 + 40, cardTop + 54, "Đã hoàn thành", { fontSize: "12px", color: "#4ade80", fontStyle: "bold" }).setOrigin(0, 0.5)
        );
      } else {
        const progress = getMissionProgress(mission);
        const bar = new ChallengeProgressBar(scene, 0, cardTop + 48, CARD_W - 36, 14, { fillColor: 0x4ade80 });
        bar.setProgress(progress / mission.targetValue, true);
        elements.push(bar.container);

        elements.push(
          scene.add.text(0, cardTop + 66, `${progress}/${mission.targetValue}`, { fontSize: "11px", color: "#9ca3af" }).setOrigin(0.5)
        );
      }
    });

    this.container = scene.add.container(x, y, elements);
  }

  destroy(): void {
    this.container.destroy();
  }
}
