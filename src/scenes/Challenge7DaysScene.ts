import Phaser from "phaser";
import { Challenge7DaysManager } from "@systems/Challenge7DaysManager";
import { ChallengeDayItem } from "@ui/ChallengeDayItem";
import { ChallengeMissionView } from "@ui/ChallengeMissionView";
import { ChallengeProgressBar } from "@ui/ChallengeProgressBar";
import { ChallengeRewardMilestone, MILESTONE_LABEL_OFFSET_X } from "@ui/ChallengeRewardMilestone";
import { drawGiftIcon } from "@ui/ChallengeIcons";
import { EventBus, GameEvents } from "@utils/EventBus";

const PANEL_X = 480;
const PANEL_Y = 270;
const PANEL_W = 900;
const PANEL_H = 500;
const PANEL_LEFT = PANEL_X - PANEL_W / 2;
const PANEL_RIGHT = PANEL_X + PANEL_W / 2;
const PANEL_TOP = PANEL_Y - PANEL_H / 2;
const PANEL_BOTTOM = PANEL_Y + PANEL_H / 2;
const PANEL_MARGIN = 20; // lề an toàn tới mép panel, dùng để tính bề rộng còn lại cho text reward — không bao giờ để text vượt qua

const DIVIDER_A_X = PANEL_LEFT + 200;
const DIVIDER_B_X = PANEL_RIGHT - 230;

const BAR_X = DIVIDER_B_X + 45;
const BAR_TOP = PANEL_TOP + 130;
const BAR_BOTTOM = PANEL_BOTTOM - 35;
const BAR_HEIGHT = BAR_BOTTOM - BAR_TOP;
const BAR_CENTER_Y = (BAR_TOP + BAR_BOTTOM) / 2;
const MILESTONE_ROW_X = BAR_X + 26;
// Bề rộng CÒN LẠI thật sự cho text reward tới mép panel — tính 1 lần, dùng chung cho mọi milestone row,
// đảm bảo word-wrap luôn khớp với không gian thật thay vì hằng số đoán mò dễ gây tràn chữ ra ngoài panel.
const MILESTONE_LABEL_MAX_WIDTH = PANEL_RIGHT - PANEL_MARGIN - (MILESTONE_ROW_X + MILESTONE_LABEL_OFFSET_X);

/**
 * Popup "Thử Thách 7 Ngày" — launch từ MenuScene (this.scene.launch), tự đứng độc lập trên cùng
 * (không pause scene khác vì MenuScene không có gameplay tick cần pause). Đóng bằng nút X hoặc bấm ra
 * ngoài panel. Toàn bộ dữ liệu đọc qua Challenge7DaysManager — scene này không tự tính toán state.
 *
 * Render tách làm 3 layer ĐỘC LẬP để đổi ngày KHÔNG đụng tới cột "Tổng sao" (tránh animate lại thanh sao
 * mỗi lần chọn ngày khác — xem renderDayList/renderMissionPanel vs renderStarPanel):
 * - dayListLayer: danh sách 7 ngày (rebuild khi đổi selectedDay HOẶC dữ liệu ngày đổi)
 * - missionLayer: chi tiết mission của ngày đang chọn (rebuild khi đổi selectedDay HOẶC dữ liệu đổi)
 * - starBar: thanh dọc tổng sao — tạo DUY NHẤT 1 LẦN lúc create(), sau đó chỉ setProgress() khi tổng sao
 *   THỰC SỰ đổi (claim milestone không đổi tổng sao nên không đụng tới bar), KHÔNG BAO GIỜ destroy/recreate
 *   khi chỉ đổi ngày đang xem — đây là lý do bar không bao giờ "chạy lại animation" khi click sang ngày khác.
 * - starInfoLayer: nhãn tổng sao + gift icon + các milestone row (rebuild khi claim/dữ liệu sao đổi, KHÔNG
 *   rebuild khi chỉ đổi ngày).
 */
export class Challenge7DaysScene extends Phaser.Scene {
  private selectedDay = 1;
  private dayListLayer?: Phaser.GameObjects.Container;
  private missionLayer?: Phaser.GameObjects.Container;
  private starInfoLayer?: Phaser.GameObjects.Container;
  private starBar?: ChallengeProgressBar;

  constructor() {
    super("Challenge7DaysScene");
  }

  create(): void {
    this.selectedDay = Challenge7DaysManager.getCurrentDay();
    this.scene.bringToTop();

    const panelBounds = new Phaser.Geom.Rectangle(PANEL_LEFT, PANEL_TOP, PANEL_W, PANEL_H);
    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75).setInteractive();
    overlay.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!Phaser.Geom.Rectangle.Contains(panelBounds, pointer.x, pointer.y)) this.close();
    });

    // Nhiều lớp nền cho panel — outer glow mờ + panel tối + viền phụ, tạo chiều sâu thay vì 1 rect phẳng.
    const outerGlow = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W + 20, PANEL_H + 20, 0xfacc15, 0.08);
    const panel = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x161616, 0.98).setStrokeStyle(2, 0x4b3f1f);
    const innerLine = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W - 12, PANEL_H - 12, 0x000000, 0).setStrokeStyle(1, 0x2c2410);

    const title = this.add
      .text(PANEL_X, PANEL_TOP + 26, "THỬ THÁCH 7 NGÀY", { fontSize: "22px", color: "#facc15", fontStyle: "bold" })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(PANEL_RIGHT - 26, PANEL_TOP + 22, "✕", { fontSize: "20px", color: "#e5e7eb", padding: { top: 4, bottom: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    closeBtn.on("pointerover", () => closeBtn.setColor("#ff6b6b"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#e5e7eb"));

    const dividerA = this.add.rectangle(DIVIDER_A_X, PANEL_Y + 10, 1, PANEL_H - 60, 0x333333);
    const dividerB = this.add.rectangle(DIVIDER_B_X, PANEL_Y + 10, 1, PANEL_H - 60, 0x333333);

    // Entrance animation: panel phóng to nhẹ từ 0.9 -> 1 (Back.easeOut) kèm fade toàn bộ khung tĩnh.
    const staticLayer = [outerGlow, panel, innerLine, title, closeBtn, dividerA, dividerB];
    staticLayer.forEach((el) => el.setAlpha(0));
    this.tweens.add({ targets: staticLayer, alpha: 1, duration: 220, ease: "Cubic.easeOut" });
    panel.setScale(0.9);
    outerGlow.setScale(0.9);
    this.tweens.add({ targets: [panel, outerGlow], scale: 1, duration: 260, ease: "Back.easeOut" });

    this.renderDayList();
    this.renderMissionPanel();
    this.createStarBar();
    this.renderStarInfo();

    EventBus.on(GameEvents.CHALLENGE_PROGRESS_UPDATED, this.onProgressChanged, this);
    EventBus.on(GameEvents.CHALLENGE_REWARD_CLAIMED, this.onRewardClaimed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.CHALLENGE_PROGRESS_UPDATED, this.onProgressChanged, this);
      EventBus.off(GameEvents.CHALLENGE_REWARD_CLAIMED, this.onRewardClaimed, this);
    });
  }

  /** Tiến độ nhiệm vụ đổi (từ gameplay) — có thể đổi cả ngày/mission lẫn tổng sao, nên cập nhật cả 3 phần. */
  private onProgressChanged(): void {
    this.renderDayList();
    this.renderMissionPanel();
    this.starBar?.setProgress(this.getStarRatio(), true);
    this.renderStarInfo();
  }

  /** Claim milestone KHÔNG đổi tổng sao (chỉ đổi trạng thái milestone) — chỉ rebuild info phải, KHÔNG đụng bar. */
  private onRewardClaimed(): void {
    this.renderStarInfo();
  }

  private getStarRatio(): number {
    return Challenge7DaysManager.getTotalStars() / Challenge7DaysManager.getMaxStars();
  }

  private renderDayList(): void {
    this.dayListLayer?.destroy();
    const children: Phaser.GameObjects.GameObject[] = [];

    const leftX = PANEL_LEFT + 100;
    let itemY = PANEL_TOP + 90;
    Challenge7DaysManager.getAllDays().forEach((def) => {
      const state = Challenge7DaysManager.getDayState(def.day);
      const item = new ChallengeDayItem(this, leftX, itemY, def, state, def.day === this.selectedDay, () => {
        this.selectedDay = def.day;
        this.renderDayList();
        this.renderMissionPanel();
      });
      children.push(item.container);
      itemY += 64;
    });

    this.dayListLayer = this.add.container(0, 0, children).setDepth(5);
  }

  private renderMissionPanel(): void {
    this.missionLayer?.destroy();
    const children: Phaser.GameObjects.GameObject[] = [];

    const selectedDef = Challenge7DaysManager.getDayDef(this.selectedDay);
    if (selectedDef) {
      const state = Challenge7DaysManager.getDayState(this.selectedDay);
      const missionView = new ChallengeMissionView(
        this,
        (DIVIDER_A_X + DIVIDER_B_X) / 2,
        PANEL_Y,
        selectedDef,
        state,
        (mission) => Challenge7DaysManager.getMissionProgress(this.selectedDay, mission),
        (mission) => Challenge7DaysManager.isMissionCompleted(mission.id)
      );
      children.push(missionView.container);
    }

    this.missionLayer = this.add.container(0, 0, children).setDepth(5);
  }

  /** Tạo thanh dọc tổng sao DUY NHẤT 1 LẦN — animate entrance ở đây, sau đó chỉ setProgress() qua onProgressChanged(). */
  private createStarBar(): void {
    this.starBar = new ChallengeProgressBar(this, BAR_X, BAR_CENTER_Y, 14, BAR_HEIGHT, { vertical: true, fillColor: 0xfacc15 });
    this.starBar.container.setDepth(5);
    this.starBar.setProgress(this.getStarRatio(), true);
  }

  private renderStarInfo(): void {
    this.starInfoLayer?.destroy();
    const children: Phaser.GameObjects.GameObject[] = [];

    const rightCenterX = (DIVIDER_B_X + PANEL_RIGHT) / 2;
    const totalStars = Challenge7DaysManager.getTotalStars();
    const maxStars = Challenge7DaysManager.getMaxStars();

    children.push(
      this.add
        .text(rightCenterX, PANEL_TOP + 55, `${totalStars} ⭐ / ${maxStars}`, { fontSize: "16px", color: "#facc15", fontStyle: "bold" })
        .setOrigin(0.5)
    );

    children.push(drawGiftIcon(this, BAR_X, BAR_TOP - 26, 26, 0xd85a30));

    Challenge7DaysManager.getMilestones().forEach((milestone) => {
      const ratio = milestone.requiredStars / maxStars;
      const y = BAR_BOTTOM - ratio * BAR_HEIGHT;
      const state = Challenge7DaysManager.getMilestoneState(milestone);
      const rewardLabel = Challenge7DaysManager.getMilestoneRewardLabel(milestone);
      const row = new ChallengeRewardMilestone(this, MILESTONE_ROW_X, y, milestone, state, rewardLabel, MILESTONE_LABEL_MAX_WIDTH, () => {
        if (Challenge7DaysManager.claimMilestone(milestone.requiredStars)) this.onRewardClaimed();
      });
      children.push(row.container);
    });

    this.starInfoLayer = this.add.container(0, 0, children).setDepth(5);
  }

  private close(): void {
    this.scene.stop();
  }
}
