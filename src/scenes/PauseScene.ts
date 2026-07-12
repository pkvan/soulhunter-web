import Phaser from "phaser";
import { GameScene } from "@scenes/GameScene";
import { Player } from "@entities/Player";
import { getCardStyle, CardStyle, CardData } from "@ui/LevelUpCard";
import weaponsData from "@data/weapons.json";
import upgradesData from "@data/upgrades.json";
import fusionsData from "@data/fusions.json";
import { WeaponDef, UpgradeDef, FusionDef } from "@types/index";
import { getMapById } from "@utils/MapData";

const weapons = weaponsData as WeaponDef[];
const upgrades = upgradesData as UpgradeDef[];
const fusions = fusionsData as FusionDef[];

interface LoadoutItem {
  title: string;
  style: CardStyle;
  badge?: string;
}

/**
 * Overlay Pause — launch() song song GameScene (giống LevelUpScene) rồi tự pause GameScene, KHÔNG dùng
 * text button, toàn bộ hành động qua icon vẽ bằng Graphics (chưa có asset icon thật). Launch/stop lại
 * mỗi lần mở/đóng (khác LevelUpScene chạy nền suốt ván) vì không cần lắng nghe event liên tục.
 */
export class PauseScene extends Phaser.Scene {
  private confirmDialog?: Phaser.GameObjects.Container;

  constructor() {
    super("PauseScene");
  }

  create(): void {
    this.scene.bringToTop(); // đảm bảo overlay luôn render/nhận input trên GameScene đã pause

    const gameScene = this.scene.get("GameScene") as GameScene;
    const player = gameScene.getPlayer();

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7);

    const mapName = getMapById(gameScene.getActiveMapId())?.name ?? "";
    this.add.text(480, 18, mapName, { fontSize: "14px", color: "#9ca3af", fontStyle: "bold" }).setOrigin(0.5);

    this.renderLoadoutTray(player);

    const buttonY = 450;
    this.createIconButton(480 - 110, buttonY, 0x4ade80, (g) => this.drawPlayIcon(g), () => this.resumeGame(gameScene));
    this.createIconButton(480, buttonY, 0x60a5fa, (g) => this.drawRestartIcon(g), () => this.restartGame(gameScene));
    this.createIconButton(480 + 110, buttonY, 0xef4444, (g) => this.drawHomeIcon(g), () => this.showHomeConfirm(gameScene));
  }

  private resumeGame(gameScene: GameScene): void {
    gameScene.scene.resume();
    this.scene.stop();
  }

  private restartGame(gameScene: GameScene): void {
    const characterId = gameScene.getPlayer().characterId;
    const dailyChallengeId = gameScene.getActiveChallengeId();
    const mapId = gameScene.getActiveMapId();
    this.scene.stop();
    gameScene.scene.start("GameScene", { characterId, dailyChallengeId, mapId });
  }

  /** Thoát ván giữa chừng KHÔNG cộng Coin (chỉ GameOverScene tự nhiên mới cộng) — cần xác nhận trước vì mất tiến trình. */
  private showHomeConfirm(gameScene: GameScene): void {
    if (this.confirmDialog) return; // đã hiện rồi, tránh mở chồng nếu bấm Home nhiều lần

    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.4);
    const box = this.add.rectangle(480, 270, 340, 150, 0x1f2937, 0.97).setStrokeStyle(2, 0xef4444);
    const message = this.add.text(480, 240, "Thoát ván này? Sẽ không tính Coin", {
      fontSize: "14px", color: "#ffffff", align: "center", wordWrap: { width: 280 }
    }).setOrigin(0.5);

    this.confirmDialog = this.add.container(0, 0, [overlay, box, message]);

    const confirmBtn = this.createIconButton(480 - 44, 300, 0x4ade80, (g) => this.drawCheckIcon(g), () => {
      gameScene.scene.stop(); // thoát hẳn ván hiện tại, không chỉ resume
      this.scene.start("MenuScene"); // tự dừng PauseScene rồi chuyển scene
    }, 22);
    const cancelBtn = this.createIconButton(480 + 44, 300, 0x6b7280, (g) => this.drawXIcon(g), () => this.closeHomeConfirm(), 22);
    this.confirmDialog.add([confirmBtn, cancelBtn]);
  }

  private closeHomeConfirm(): void {
    this.confirmDialog?.destroy(true);
    this.confirmDialog = undefined;
  }

  /**
   * Grid mini-card (bản thu nhỏ của LevelUpCard, dùng chung getCardStyle nên LUÔN khớp màu/style với
   * màn Level Up — fusion viền coral, vũ khí nâng cấp viền xanh lá, stat upgrade trung tính) đại diện
   * vũ khí đang equip (badge Lv.) + upgrade đã chọn (gom nhóm theo id, badge xN nếu chọn nhiều lần).
   * Grid wrap theo chiều ngang, giới hạn chiều cao qua mask, cuộn bằng wheel nếu nội dung vượt quá.
   */
  private renderLoadoutTray(player: Player): void {
    const items: LoadoutItem[] = [];

    for (const eq of player.equippedWeapons) {
      // LƯU Ý: FusionSystem.applyFusion() XÓA hẳn 2 vũ khí gốc khỏi mảng (không giữ lại kèm fusedInto trỏ
      // sang chỗ khác) rồi push vũ khí fusion mới với fusedInto = chính id của nó — nên KHÔNG được skip
      // theo fusedInto ở đây, nếu không vũ khí fusion sẽ biến mất hoàn toàn khỏi tray.
      const fusionDef = fusions.find((f) => f.id === eq.weaponId);
      if (fusionDef) {
        const cardData: CardData = { fusion: true, fusionId: fusionDef.id, def: fusionDef };
        items.push({ title: fusionDef.name, style: getCardStyle(cardData), badge: `Lv${eq.level}` });
        continue;
      }

      const def = weapons.find((w) => w.id === eq.weaponId);
      if (!def) continue;
      // Cùng 1 tiêu chí "mới" với LevelUpCard: còn nguyên level 1 (chưa từng chọn card "nâng cấp" lần nào)
      // vẫn hiện viền xanh dương "VŨ KHÍ MỚI" y hệt lúc vừa chọn ở Level Up — tránh lệch màu ngay khi mở
      // Pause Menu liền sau khi vừa pick 1 vũ khí mới. Level >= 2 (đã nâng cấp ít nhất 1 lần) mới đổi sang
      // xanh lá "NÂNG CẤP".
      const cardData: CardData = { weapon: true, weaponId: eq.weaponId, isNew: eq.level === 1 };
      items.push({ title: def.name, style: getCardStyle(cardData), badge: `Lv${eq.level}` });
    }

    const upgradeCounts = new Map<string, number>();
    for (const id of player.appliedUpgrades) {
      upgradeCounts.set(id, (upgradeCounts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of upgradeCounts) {
      const def = upgrades.find((u) => u.id === id);
      if (!def) continue;
      items.push({ title: def.name, style: getCardStyle(def), badge: count > 1 ? `x${count}` : undefined });
    }

    if (items.length === 0) return;

    const cardW = 80;
    const cardH = 100;
    const gapX = 10;
    const gapY = 12;
    const areaX = 60;
    const areaY = 70;
    const areaW = 840;
    const areaH = 300; // giới hạn chiều cao container ~280-320px theo yêu cầu
    const columns = Math.max(1, Math.floor((areaW + gapX) / (cardW + gapX)));

    const gridContainer = this.add.container(areaX, areaY);
    items.forEach((item, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = row * (cardH + gapY) + cardH / 2;
      gridContainer.add(this.createLoadoutCard(x, y, item.title, item.style, item.badge, cardW, cardH));
    });

    const totalRows = Math.ceil(items.length / columns);
    const contentHeight = totalRows * (cardH + gapY) - gapY;

    // Mask giới hạn vùng nhìn thấy đúng bằng areaH — grid vẫn chứa đủ toàn bộ card, chỉ ẩn phần tràn ra ngoài.
    const maskShape = this.make.graphics({}).fillStyle(0xffffff).fillRect(areaX, areaY, areaW, areaH);
    gridContainer.setMask(maskShape.createGeometryMask());

    if (contentHeight > areaH) {
      const maxScrollUp = contentHeight - areaH;
      this.input.off("wheel"); // tránh đăng ký trùng nếu PauseScene mở lại nhiều lần (scene instance tái sử dụng)
      this.input.on("wheel", (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
        if (pointer.x < areaX || pointer.x > areaX + areaW || pointer.y < areaY || pointer.y > areaY + areaH) return;
        gridContainer.y = Phaser.Math.Clamp(gridContainer.y - dy * 0.5, areaY - maxScrollUp, areaY);
      });
    }
  }

  /** 1 card nhỏ (80x100 mặc định) — bản thu gọn của LevelUpCard, giữ nguyên style theo getCardStyle() + badge số lượng/level góc trên-phải. */
  private createLoadoutCard(
    x: number, y: number, title: string, style: CardStyle, badge: string | undefined,
    w: number, h: number
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, style.bg).setStrokeStyle(style.borderWidth, style.border);
    const titleText = this.add.text(0, 0, title, {
      fontSize: "10px", color: "#ffffff", align: "center", wordWrap: { width: w - 10 }
    }).setOrigin(0.5);

    const elements: Phaser.GameObjects.GameObject[] = [bg, titleText];
    if (badge) {
      const badgeBg = this.add.circle(w / 2 - 10, -h / 2 + 10, 10, 0xef4444);
      const badgeText = this.add.text(w / 2 - 10, -h / 2 + 10, badge, {
        fontSize: "9px", color: "#ffffff", fontStyle: "bold"
      }).setOrigin(0.5);
      elements.push(badgeBg, badgeText);
    }

    return this.add.container(x, y, elements);
  }

  /** Nút tròn icon-only, tối thiểu 48px đường kính (radius mặc định 28) — hover phóng to nhẹ, press thu nhỏ để phân biệt state rõ ràng dù không có label chữ. */
  private createIconButton(
    x: number, y: number, color: number,
    drawIcon: (g: Phaser.GameObjects.Graphics) => void,
    onClick: () => void,
    radius = 28
  ): Phaser.GameObjects.Container {
    const bg = this.add.circle(0, 0, radius, color, 1).setStrokeStyle(2, 0xffffff, 0.5);
    const icon = this.add.graphics();
    drawIcon(icon);

    const container = this.add.container(x, y, [bg, icon]);
    bg.setInteractive({ useHandCursor: true });

    bg.on("pointerover", () => container.setScale(1.08));
    bg.on("pointerout", () => container.setScale(1));
    bg.on("pointerdown", () => container.setScale(0.92));
    bg.on("pointerup", () => {
      container.setScale(1.08);
      onClick();
    });

    return container;
  }

  private drawPlayIcon(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-8, -12, -8, 12, 12, 0);
  }

  private drawRestartIcon(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.arc(0, 0, 10, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(220), false);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(9, -9, 16, -4, 6, -1); // mũi tên ở đầu hở của cung tròn
  }

  private drawHomeIcon(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-12, 0, 12, 0, 0, -14);
    g.fillRect(-8, 0, 16, 12);
  }

  private drawCheckIcon(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(-8, 0);
    g.lineTo(-2, 6);
    g.lineTo(9, -8);
    g.strokePath();
  }

  private drawXIcon(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(-7, -7);
    g.lineTo(7, 7);
    g.moveTo(7, -7);
    g.lineTo(-7, 7);
    g.strokePath();
  }
}
