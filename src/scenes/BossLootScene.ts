import Phaser from "phaser";
import { GameScene } from "@scenes/GameScene";
import { Player } from "@entities/Player";
import bossLootWheelData from "@data/bossLootWheel.json";
import { BossLootDef } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";
import { addPermanentUpgradeTokens, getCheapestLockedWeapon, unlockWeapon } from "@utils/SaveData";

const bossLootWheel = bossLootWheelData as BossLootDef[];
const SLICE_COLORS = [0xfbbf24, 0x8b5cf6, 0x4aa3ff, 0x4ade80, 0xd85a30];
const WHEEL_CENTER_X = 480;
const WHEEL_CENTER_Y = 290;
const WHEEL_RADIUS = 140;
const SPIN_COUNT = 6; // số vòng quay trọn vẹn trước khi dừng, chỉ để animation "đã" mắt — không ảnh hưởng ô dừng cuối cùng

interface WheelSlice {
  entry: BossLootDef;
  startDeg: number; // 0° = 3h, tăng dần theo chiều kim đồng hồ (đúng chiều Phaser.Math.DegToRad + Graphics.slice)
  sliceDeg: number;
}

/**
 * Vòng xoay chiến lợi phẩm — launch song song GameScene (giống LevelUpScene/PauseScene) ngay sau khi player
 * va chạm nhặt Loot Chest (MỌI boss chết đều rơi, xem GameScene.onBossDefeated), tự pause GameScene.
 *
 * QUAN TRỌNG (đúng thứ tự, không đảo ngược): roll kết quả theo trọng số TRƯỚC (rollResult()), rồi mới tính
 * góc quay để kim dừng đúng ô đã roll — KHÔNG random góc dừng rồi suy ngược ra kết quả.
 *
 * QUAN TRỌNG: danh sách ô (slices) chỉ tính đúng 1 LẦN trong rollResult() lúc create() chạy — dùng chung
 * 1 mảng cố định (WheelSlice[]) cho cả việc vẽ vòng tròn lẫn tính góc dừng. Không được đọc lại trạng thái
 * (vd getCheapestLockedWeapon()) hay tính lại danh sách này ở bất kỳ đâu khác trong lúc animation đang chạy.
 */
export class BossLootScene extends Phaser.Scene {
  constructor() {
    super("BossLootScene");
  }

  create(): void {
    this.scene.bringToTop();
    const gameScene = this.scene.get("GameScene") as GameScene;
    gameScene.scene.pause();

    this.add.rectangle(WHEEL_CENTER_X, WHEEL_CENTER_Y, 960, 540, 0x000000, 0.8);
    this.add.text(WHEEL_CENTER_X, 60, "CHIẾN LỢI PHẨM TỪ BOSS", {
      fontSize: "22px", color: "#fbbf24", fontStyle: "bold"
    }).setOrigin(0.5);

    // Roll + xây danh sách ô CHỈ 1 LẦN ở đây — mọi thứ bên dưới (vẽ wheel, tính góc dừng) đều đọc lại từ
    // đúng 2 hằng số cục bộ này, không tính toán lại lần nào khác trong suốt vòng đời scene.
    const { slices, selectedIndex } = this.rollResult();
    const selected = slices[selectedIndex];

    const wheel = this.drawWheel(slices);
    this.drawNeedle();

    const resultText = this.add.text(WHEEL_CENTER_X, 460, "", {
      fontSize: "18px", color: "#4ade80", fontStyle: "bold", align: "center", wordWrap: { width: 500 }
    }).setOrigin(0.5);

    // Slice vẽ bắt đầu từ góc 0° (3h) theo chiều kim đồng hồ — cần xoay wheel sao cho tâm ô đã roll
    // (startDeg + nửa sliceDeg) trùng với vị trí kim cố định ở 270° (12h).
    const midSelectedDeg = selected.startDeg + selected.sliceDeg / 2;
    const targetRotationDeg = 270 - midSelectedDeg;
    const finalAngle = SPIN_COUNT * 360 + (((targetRotationDeg % 360) + 360) % 360);

    this.tweens.add({
      targets: wheel,
      angle: finalAngle,
      duration: 3200,
      ease: "Cubic.easeOut",
      onComplete: () => {
        const bonusCoin = this.applyLoot(selected.entry, gameScene.getPlayer());
        resultText.setText(`Nhận được: ${selected.entry.name}${bonusCoin > 0 ? ` (+${bonusCoin} Coin)` : ""}`);

        const continueButton = this.add.text(WHEEL_CENTER_X, 500, "[ Tiếp tục ]", {
          fontSize: "16px", color: "#8be9fd", fontStyle: "bold"
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        continueButton.on("pointerdown", () => {
          EventBus.emit(GameEvents.BOSS_LOOT_RESOLVED, bonusCoin);
        });
      }
    });
  }

  /**
   * Tính đúng 1 lần: lọc ô hợp lệ theo trạng thái HIỆN TẠI (unlock_weapon bị loại nếu hết vũ khí đặc biệt
   * chưa mở khóa), chia góc theo weight, rồi roll ngẫu nhiên có trọng số ra index ô trúng — TRẢ VỀ kết quả
   * cố định để phần vẽ + phần tính góc dừng dùng chung, tuyệt đối không gọi lại hàm này lần 2.
   */
  private rollResult(): { slices: WheelSlice[]; selectedIndex: number } {
    const entries = bossLootWheel.filter((e) => e.type !== "unlockWeapon" || getCheapestLockedWeapon() !== null);
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

    const slices: WheelSlice[] = [];
    let cursor = 0;
    for (const entry of entries) {
      const sliceDeg = (entry.weight / totalWeight) * 360;
      slices.push({ entry, startDeg: cursor, sliceDeg });
      cursor += sliceDeg;
    }

    const roll = Phaser.Math.FloatBetween(0, totalWeight);
    let cumulativeWeight = 0;
    let selectedIndex = slices.length - 1;
    for (let i = 0; i < entries.length; i++) {
      cumulativeWeight += entries[i].weight;
      if (roll < cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }

    return { slices, selectedIndex };
  }

  /** Vẽ toàn bộ ô vào 1 container xoay chung — chỉ đọc từ mảng `slices` cố định đã roll xong ở rollResult(). */
  private drawWheel(slices: WheelSlice[]): Phaser.GameObjects.Container {
    const wheel = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);

    slices.forEach(({ entry, startDeg, sliceDeg }, i) => {
      const g = this.add.graphics();
      g.fillStyle(SLICE_COLORS[i % SLICE_COLORS.length], 1);
      g.slice(0, 0, WHEEL_RADIUS, Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(startDeg + sliceDeg), false);
      g.fillPath();
      g.lineStyle(2, 0x111827, 1);
      g.strokePath();

      const midDeg = startDeg + sliceDeg / 2;
      const labelX = Math.cos(Phaser.Math.DegToRad(midDeg)) * WHEEL_RADIUS * 0.62;
      const labelY = Math.sin(Phaser.Math.DegToRad(midDeg)) * WHEEL_RADIUS * 0.62;
      const label = this.add.text(labelX, labelY, entry.name, {
        fontSize: "11px", color: "#111827", fontStyle: "bold", align: "center", wordWrap: { width: 68 }
      }).setOrigin(0.5);

      wheel.add([g, label]);
    });

    // Viền + tâm trang trí, không xoay riêng (con của wheel nên xoay theo cùng).
    const rim = this.add.graphics();
    rim.lineStyle(4, 0xfbbf24, 1);
    rim.strokeCircle(0, 0, WHEEL_RADIUS);
    wheel.add(rim);

    return wheel;
  }

  /**
   * Kim chỉ CỐ ĐỊNH tại đỉnh vòng quay (12h, kiểu bánh xe may mắn chuẩn) — vẽ riêng NGOÀI container `wheel`
   * nên không xoay theo, chỉ vòng tròn quay quanh tâm bên dưới kim. Gồm 1 chốt tròn (pivot) phía ngoài rìa
   * + 1 tam giác dài đâm sâu vào rìa vòng quay để rõ ràng đang "chỉ" đúng ô nào.
   */
  private drawNeedle(): void {
    const pivotY = WHEEL_CENTER_Y - WHEEL_RADIUS - 34;
    const tipY = WHEEL_CENTER_Y - WHEEL_RADIUS + 8; // đầu kim đè nhẹ vào rìa vòng tròn

    const needle = this.add.graphics().setDepth(3);
    needle.fillStyle(0xef4444, 1);
    needle.fillTriangle(
      WHEEL_CENTER_X - 8, pivotY,
      WHEEL_CENTER_X + 8, pivotY,
      WHEEL_CENTER_X, tipY
    );
    needle.lineStyle(2, 0x7f1d1d, 1);
    needle.strokeTriangle(
      WHEEL_CENTER_X - 8, pivotY,
      WHEEL_CENTER_X + 8, pivotY,
      WHEEL_CENTER_X, tipY
    );

    needle.fillStyle(0xffffff, 1);
    needle.fillCircle(WHEEL_CENTER_X, pivotY, 10);
    needle.lineStyle(2, 0xef4444, 1);
    needle.strokeCircle(WHEEL_CENTER_X, pivotY, 10);
  }

  /**
   * coin/darkSoul cộng thẳng vào bonusCoin trả về (GameScene cộng vào coinEarned cuối ván qua RunResult);
   * token/heal/unlock là hiệu ứng persistent áp dụng ngay tại đây, không đi qua coinEarned.
   */
  private applyLoot(entry: BossLootDef, player: Player): number {
    switch (entry.type) {
      case "coin":
      case "darkSoul":
        return Phaser.Math.Between(entry.minCoin ?? 0, entry.maxCoin ?? 0);
      case "upgradeToken":
        addPermanentUpgradeTokens(1);
        return 0;
      case "healFull":
        player.heal(player.stats.maxHp);
        return 0;
      case "unlockWeapon": {
        const weapon = getCheapestLockedWeapon();
        if (weapon) unlockWeapon(weapon.id);
        return 0;
      }
      default:
        return 0;
    }
  }
}
