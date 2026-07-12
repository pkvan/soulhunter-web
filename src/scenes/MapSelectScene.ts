import Phaser from "phaser";
import { MapRenderer, MapNodeViewData, MapNodeState } from "@ui/MapRenderer";
import { MapDef } from "@types/index";
import {
  getAllMaps,
  isMapUnlocked,
  isMapCleared,
  getLatestUnlockedMap,
  getEnemyDataForMap,
  getBossForMap
} from "@utils/MapData";
import { getSelectedCharacterId } from "@utils/SaveData";

const ISLAND_ORIGIN_X = 150;
const ISLAND_ORIGIN_Y = 130;
const PANEL_X = 760;

/**
 * Màn "World Map" chọn map — bên trái là đảo liên kết (MapRenderer lo phần vẽ, scene này chỉ lo dữ liệu +
 * input), bên phải là panel chi tiết map đang chọn. Click node chỉ đổi panel, không chuyển scene ngay —
 * chỉ nút "Bắt đầu" mới start GameScene(mapId). Trạng thái locked/unlocked/cleared đọc từ utils/MapData.ts
 * (không tự đọc localStorage ở đây, giữ đúng ranh giới data/logic tách khỏi UI).
 */
export class MapSelectScene extends Phaser.Scene {
  private mapRenderer!: MapRenderer;
  private maps: MapDef[] = [];
  private selectedMapId!: string;
  private panelElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("MapSelectScene");
  }

  create(data?: { preselectMapId?: string }): void {
    this.add.rectangle(480, 270, 960, 540, 0x111827);
    this.add.text(150, 40, "CHỌN MAP", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold"
    });

    const backButton = this.add.text(870, 30, "[ Menu ]", {
      fontSize: "14px",
      color: "#9ca3af"
    }).setInteractive({ useHandCursor: true });
    backButton.on("pointerdown", () => this.scene.start("MenuScene"));

    this.maps = getAllMaps();
    // VictoryScene "Map tiếp theo" truyền preselectMapId (map vừa mở khóa) — chỉ dùng nếu map đó thật sự
    // tồn tại và đã unlock, tránh chọn nhầm map khóa nếu dữ liệu truyền vào sai. Không có/không hợp lệ thì
    // fallback về map unlock gần nhất như hành vi mặc định trước đây.
    const preselect = data?.preselectMapId ? this.maps.find((m) => m.id === data.preselectMapId) : undefined;
    this.selectedMapId = preselect && isMapUnlocked(preselect) ? preselect.id : getLatestUnlockedMap().id;

    this.mapRenderer = new MapRenderer(this, ISLAND_ORIGIN_X, ISLAND_ORIGIN_Y);
    this.mapRenderer.render(this.buildNodeViewData(), this.selectedMapId, (id) => this.onSelectMap(id));

    this.renderPanel();
  }

  private buildNodeViewData(): MapNodeViewData[] {
    return this.maps.map((map) => ({
      id: map.id,
      name: map.name,
      order: map.order,
      themeColor: Number(map.theme_color),
      state: this.getMapState(map)
    }));
  }

  private getMapState(map: MapDef): MapNodeState {
    if (isMapCleared(map.id)) return "cleared";
    if (isMapUnlocked(map)) return "unlocked";
    return "locked";
  }

  private onSelectMap(id: string): void {
    this.selectedMapId = id;
    this.mapRenderer.setSelected(id);
    this.renderPanel();
  }

  private renderPanel(): void {
    this.panelElements.forEach((el) => el.destroy());
    this.panelElements = [];

    const map = this.maps.find((m) => m.id === this.selectedMapId);
    if (!map) return;

    const state = this.getMapState(map);
    const enemyCount = getEnemyDataForMap(map).length;
    const boss = getBossForMap(map);
    const difficultyPercent = Math.round((map.difficultyMultiplier - 1) * 100);

    const box = this.add.rectangle(PANEL_X, 220, 320, 320, 0x1f2937, 0.95).setStrokeStyle(2, Number(map.theme_color));
    this.panelElements.push(box);

    this.panelElements.push(
      this.add.text(PANEL_X, 100, map.name, {
        fontSize: "22px", color: "#ffffff", fontStyle: "bold"
      }).setOrigin(0.5)
    );

    this.panelElements.push(
      this.add.text(PANEL_X, 135, `Độ khó: ${difficultyPercent >= 0 ? "+" : ""}${difficultyPercent}%`, {
        fontSize: "14px", color: "#facc15"
      }).setOrigin(0.5)
    );

    this.panelElements.push(
      this.add.text(PANEL_X, 180, `Quái: ${enemyCount} loại`, {
        fontSize: "13px", color: "#9ca3af"
      }).setOrigin(0.5)
    );

    this.panelElements.push(
      this.add.text(PANEL_X, 205, `Boss: ${boss?.name ?? "?"}`, {
        fontSize: "13px", color: "#9ca3af"
      }).setOrigin(0.5)
    );

    if (state === "cleared") {
      this.panelElements.push(
        this.add.text(PANEL_X, 240, "Đã chinh phục", { fontSize: "13px", color: "#4ade80" }).setOrigin(0.5)
      );
    }

    const startButton = this.add.text(PANEL_X, 320, "[ Bắt đầu ]", {
      fontSize: "20px",
      color: "#4ade80",
      fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startButton.on("pointerdown", () => {
      this.scene.start("GameScene", { characterId: getSelectedCharacterId(), mapId: map.id });
    });
    this.panelElements.push(startButton);
  }
}
