import Phaser from "phaser";
import { CollectionManager, MonsterEntry, WeaponEntry, BossEntry, CardEntry, CollectionUnlockedPayload } from "@systems/CollectionManager";
import { CollectionCard, CardContent, CARD_W, CARD_H, RARITY_COLORS, TITLE_FONT } from "@ui/CollectionCard";
import { CollectionTab, TAB_W, TAB_H } from "@ui/CollectionTab";
import { renderWeaponIcon } from "@ui/WeaponIcon";
import { renderEntityIcon } from "@ui/EntityIcon";
import { CollectionTabId } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";

const PANEL_X = 480;
const PANEL_Y = 270;
const PANEL_W = 880;
const PANEL_H = 500;
const PANEL_LEFT = PANEL_X - PANEL_W / 2;
const PANEL_RIGHT = PANEL_X + PANEL_W / 2;
const PANEL_TOP = PANEL_Y - PANEL_H / 2;
const PANEL_BOTTOM = PANEL_Y + PANEL_H / 2;

const TAB_X = PANEL_LEFT + 12 + TAB_W / 2;
const TAB_START_Y = PANEL_TOP + 78;
const TAB_GAP = 62;
const DIVIDER_X = PANEL_LEFT + TAB_W + 40;

const GRID_LEFT = DIVIDER_X + 20;
const GRID_RIGHT = PANEL_RIGHT - 30;
const GRID_TOP = PANEL_TOP + 62;
const GRID_BOTTOM = PANEL_BOTTOM - 16;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const GRID_H = GRID_BOTTOM - GRID_TOP;
const SCROLLBAR_X = PANEL_RIGHT - 14;

const GRID_SCALE = 0.62;
const GRID_GAP_X = 12;
const GRID_GAP_Y = 16;
const CELL_W = CARD_W * GRID_SCALE + GRID_GAP_X;
const CELL_H = CARD_H * GRID_SCALE + GRID_GAP_Y;

const TABS: { id: CollectionTabId; label: string }[] = [
  { id: "monsters", label: "Monsters" },
  { id: "weapons", label: "Weapons" },
  { id: "bosses", label: "Bosses" },
  { id: "cards", label: "Cards" }
];

/**
 * Màn Collection — launch từ MenuScene (this.scene.launch), popup độc lập giống Challenge7DaysScene (không
 * pause scene khác vì MenuScene không có gameplay tick). Trái: 4 tab dọc (CollectionTab, tạo 1 LẦN DUY NHẤT
 * trong create() rồi chỉ update tại chỗ qua setSelected() khi đổi tab — KHÔNG destroy/recreate, tránh bug
 * "tab không phản hồi" do trước đây destroy chính tab đang được click ngay giữa lúc xử lý pointerdown).
 * Phải: grid CollectionCard scale nhỏ (GRID_SCALE) — DÙNG CHUNG đúng 1 component CollectionCard với
 * LevelUpScene, chỉ khác là ở đây KHÔNG truyền onSelect (chỉ xem, không chọn được) và card bị scale để
 * nhét vừa lưới. Dữ liệu luôn đọc qua CollectionManager — scene này không tự tính unlock state, và lắng
 * nghe GameEvents.COLLECTION_UNLOCKED để tự refresh grid nếu tab đang mở trùng loại vừa unlock (không cần
 * đóng/mở lại popup) — hữu ích nếu sau này Collection mở được cả lúc có luồng gameplay chạy song song.
 */
export class CollectionScene extends Phaser.Scene {
  private selectedTab: CollectionTabId = "monsters";
  private tabs: CollectionTab[] = [];
  private gridLayer?: Phaser.GameObjects.Container;
  private gridContent?: Phaser.GameObjects.Container;
  private gridMask?: Phaser.GameObjects.Graphics;
  private scrollbarLayer?: Phaser.GameObjects.Container;
  private gridScrollY = 0;
  private gridContentHeight = 0;
  private wheelHandler?: (pointer: Phaser.Input.Pointer, gameObjects: unknown, deltaX: number, deltaY: number) => void;

  constructor() {
    super("CollectionScene");
  }

  create(): void {
    this.selectedTab = "monsters";
    this.tabs = [];
    this.gridScrollY = 0;
    this.scene.bringToTop();

    const panelBounds = new Phaser.Geom.Rectangle(PANEL_LEFT, PANEL_TOP, PANEL_W, PANEL_H);
    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75).setInteractive();
    overlay.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!Phaser.Geom.Rectangle.Contains(panelBounds, pointer.x, pointer.y)) this.close();
    });

    const outerGlow = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W + 20, PANEL_H + 20, 0x8b5cf6, 0.08);
    const panel = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x161616, 0.98).setStrokeStyle(2, 0x3a3450);
    const innerLine = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W - 12, PANEL_H - 12, 0x000000, 0).setStrokeStyle(1, 0x241f36);

    const title = this.add
      .text(PANEL_X, PANEL_TOP + 26, "COLLECTION", {
        fontFamily: TITLE_FONT,
        fontSize: "26px",
        color: "#e9d9ff",
        fontStyle: "bold",
        letterSpacing: 2,
        stroke: "#1a0f2e",
        strokeThickness: 4,
        shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 8, fill: true }
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(PANEL_RIGHT - 26, PANEL_TOP + 22, "✕", { fontSize: "20px", color: "#e5e7eb", padding: { top: 4, bottom: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    closeBtn.on("pointerover", () => closeBtn.setColor("#ff6b6b"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#e5e7eb"));

    const divider = this.add.rectangle(DIVIDER_X, PANEL_Y + 10, 1, PANEL_H - 60, 0x333333);

    const staticLayer = [outerGlow, panel, innerLine, title, closeBtn, divider];
    staticLayer.forEach((el) => el.setAlpha(0));
    this.tweens.add({ targets: staticLayer, alpha: 1, duration: 220, ease: "Cubic.easeOut" });
    panel.setScale(0.9);
    outerGlow.setScale(0.9);
    this.tweens.add({ targets: [panel, outerGlow], scale: 1, duration: 260, ease: "Back.easeOut" });

    this.renderTabs();
    this.renderGrid();

    this.wheelHandler = (pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.gridContent) return;
      if (pointer.x < GRID_LEFT || pointer.x > GRID_RIGHT || pointer.y < GRID_TOP || pointer.y > GRID_BOTTOM) return;
      const maxScroll = Math.max(0, this.gridContentHeight - GRID_H);
      this.gridScrollY = Phaser.Math.Clamp(this.gridScrollY + deltaY * 0.5, 0, maxScroll);
      this.gridContent.y = GRID_TOP - this.gridScrollY;
      this.updateScrollbar();
    };
    this.input.on("wheel", this.wheelHandler);

    EventBus.off(GameEvents.COLLECTION_UNLOCKED, this.onCollectionUnlocked, this);
    EventBus.on(GameEvents.COLLECTION_UNLOCKED, this.onCollectionUnlocked, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.wheelHandler) this.input.off("wheel", this.wheelHandler);
      EventBus.off(GameEvents.COLLECTION_UNLOCKED, this.onCollectionUnlocked, this);
      this.gridMask?.destroy();
    });
  }

  /** Có gì đó vừa unlock (từ gameplay, qua CollectionManager) trong lúc popup đang mở — chỉ refresh grid nếu trùng tab đang xem, giữ nguyên vị trí scroll, KHÔNG đụng tab/reload toàn màn hình. */
  private onCollectionUnlocked(payload: CollectionUnlockedPayload): void {
    if (payload.type === this.selectedTab) this.renderGrid();
  }

  private selectTab(tab: CollectionTabId): void {
    this.selectedTab = tab;
    this.gridScrollY = 0;
    this.tabs.forEach((t, index) => t.setSelected(TABS[index].id === tab));
    this.renderGrid();
  }

  private renderTabs(): void {
    const children: Phaser.GameObjects.GameObject[] = [];

    this.tabs = TABS.map((tab, index) => {
      const y = TAB_START_Y + index * TAB_GAP + TAB_H / 2;
      const item = new CollectionTab(this, TAB_X, y, tab.label, tab.id === this.selectedTab, () => this.selectTab(tab.id));
      children.push(item.container);
      return item;
    });

    this.add.container(0, 0, children).setDepth(5);
  }

  private renderGrid(): void {
    this.gridLayer?.destroy();
    this.scrollbarLayer?.destroy();
    this.gridMask?.destroy();

    const items = this.getCardContentsForTab();
    const cols = Math.max(1, Math.floor((GRID_W + GRID_GAP_X) / CELL_W));

    const content = this.add.container(GRID_LEFT, GRID_TOP - this.gridScrollY);
    items.forEach((cardContent, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = new CollectionCard(this, col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, cardContent);
      card.setBaseScale(GRID_SCALE);
      content.add(card.container);
    });

    const totalRows = Math.ceil(items.length / cols);
    this.gridContentHeight = totalRows * CELL_H;
    this.gridContent = content;

    this.gridMask = this.make.graphics({}, false);
    this.gridMask.fillStyle(0xffffff, 1);
    this.gridMask.fillRect(GRID_LEFT, GRID_TOP, GRID_W, GRID_H);
    content.setMask(this.gridMask.createGeometryMask());

    this.gridLayer = this.add.container(0, 0, [content]).setDepth(5);
    this.updateScrollbar();
  }

  private updateScrollbar(): void {
    this.scrollbarLayer?.destroy();
    if (this.gridContentHeight <= GRID_H) {
      this.scrollbarLayer = this.add.container(0, 0);
      return;
    }

    const track = this.add.rectangle(SCROLLBAR_X, (GRID_TOP + GRID_BOTTOM) / 2, 4, GRID_H, 0x27272a);
    const thumbH = Math.max(24, (GRID_H / this.gridContentHeight) * GRID_H);
    const maxScroll = this.gridContentHeight - GRID_H;
    const ratio = maxScroll > 0 ? this.gridScrollY / maxScroll : 0;
    const thumbY = GRID_TOP + thumbH / 2 + ratio * (GRID_H - thumbH);
    const thumb = this.add.rectangle(SCROLLBAR_X, thumbY, 4, thumbH, 0x8b5cf6);

    this.scrollbarLayer = this.add.container(0, 0, [track, thumb]).setDepth(5);
  }

  private getCardContentsForTab(): CardContent[] {
    switch (this.selectedTab) {
      case "monsters":
        return CollectionManager.getMonsterEntries().map((entry) => this.buildMonsterContent(entry));
      case "weapons":
        return CollectionManager.getWeaponEntries().map((entry) => this.buildWeaponContent(entry));
      case "bosses":
        return CollectionManager.getBossEntries().map((entry) => this.buildBossContent(entry));
      case "cards":
        return CollectionManager.getCardEntries().map((entry) => this.buildUpgradeContent(entry));
    }
  }

  private buildMonsterContent(entry: MonsterEntry): CardContent {
    const def = entry.def;
    return {
      title: def.name,
      description: def.description ?? "",
      locked: !entry.unlocked,
      renderIcon: (scene, x, y, size) => renderEntityIcon(scene, x, y, def.tintColor, size),
      statLines: [`HP: ${def.hp}`, `Damage: ${def.damage}`, `Speed: ${def.moveSpeed}`]
    };
  }

  private buildWeaponContent(entry: WeaponEntry): CardContent {
    const def = entry.def;
    return {
      title: def.name,
      description: def.description,
      rarity: def.rarity,
      locked: !entry.unlocked,
      renderIcon: (scene, x, y, size) => renderWeaponIcon(scene, x, y, def, size),
      statLines: [`Damage: ${def.baseDamage}`, `Cooldown: ${(def.baseCooldownMs / 1000).toFixed(1)}s`]
    };
  }

  private buildBossContent(entry: BossEntry): CardContent {
    const def = entry.def;
    return {
      title: def.name,
      description: def.description ?? "",
      locked: !entry.unlocked,
      renderIcon: (scene, x, y, size) => renderEntityIcon(scene, x, y, def.color, size),
      statLines: [`HP: ${def.hp}`, `Skill: ${entry.skillNames.join(", ")}`]
    };
  }

  private buildUpgradeContent(entry: CardEntry): CardContent {
    const def = entry.def;
    const color = def.rarity ? RARITY_COLORS[def.rarity] : 0x9ca3af;
    return {
      title: def.name,
      description: def.description ?? "",
      rarity: def.rarity,
      locked: !entry.unlocked,
      renderIcon: (scene, x, y, size) => scene.add.circle(x, y, size / 2, color, 0.9)
    };
  }

  private close(): void {
    this.scene.stop();
  }
}
