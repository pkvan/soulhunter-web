import Phaser from "phaser";

export type MapNodeState = "locked" | "unlocked" | "cleared";

/**
 * Dữ liệu THUẦN để vẽ 1 node — MapRenderer không tự tính toán trạng thái (locked/unlocked/cleared) và
 * không đọc localStorage/JSON, tất cả phải được MapSelectScene chuẩn bị sẵn rồi truyền vào qua render().
 * Giữ interface này tối giản để sau này thay Graphics bằng sprite chỉ cần sửa trong MapRenderer.
 */
export interface MapNodeViewData {
  id: string;
  name: string;
  order: number;
  themeColor: number; // đã Number(theme_color) sẵn từ bên ngoài
  state: MapNodeState;
}

const NODE_SIZE = 64;
const COLS = 3;
const COL_GAP = 140;
const ROW_GAP = 100;
const LOCKED_COLOR = 0x4b5563;

/**
 * Vẽ khu vực "đảo liên kết" cho Map Selection: mỗi map là 1 vùng địa hình (blob bo tròn màu theme_color)
 * nối với map kế tiếp bằng đường path, không phải danh sách/tree. Thuần RENDER — không chứa logic
 * gameplay, không đọc localStorage; nhận toàn bộ dữ liệu + trạng thái từ bên ngoài (MapSelectScene) qua
 * render(). Vị trí node tính theo công thức từ `order` (zigzag nhiều hàng, jitter xác định theo seed cố
 * định) nên map thứ 11 tự có vị trí hợp lý mà không cần sửa file này.
 *
 * Ở giai đoạn prototype, MapRegion/MapNode chưa tách file riêng — 2 khái niệm này chỉ là 2 method vẽ nội
 * bộ (drawRegion/drawNode) không có state/lifecycle riêng, tách file lúc này là over-engineering. Nếu sau
 * này số lượng map/độ phức tạp UI tăng, có thể tách drawRegion/drawNode ra 2 class riêng mà không đổi API
 * public của MapRenderer (render/setSelected/destroy).
 */
export class MapRenderer {
  private nodes = new Map<string, {
    container: Phaser.GameObjects.Container;
    ring: Phaser.GameObjects.Arc;
    ringTween: Phaser.Tweens.Tween;
    state: MapNodeState;
  }>();
  private pathGraphics?: Phaser.GameObjects.Graphics;
  private selectedId: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private originX: number,
    private originY: number
  ) {}

  /** Vẽ lại toàn bộ đảo. Gọi lại khi danh sách map hoặc trạng thái locked/unlocked/cleared thay đổi (vd sau khi clear map). */
  render(nodesData: MapNodeViewData[], selectedId: string | null, onSelect: (id: string) => void): void {
    this.destroy();
    this.selectedId = selectedId;

    const sorted = [...nodesData].sort((a, b) => a.order - b.order);
    const positions = new Map(sorted.map((n) => [n.id, this.getPosition(n.order)]));

    this.pathGraphics = this.scene.add.graphics();
    this.drawPaths(sorted, positions);

    for (const data of sorted) {
      const pos = positions.get(data.id)!;
      this.drawNode(data, pos, onSelect);
    }
  }

  /** Chỉ đổi node nào đang SELECTED (viền glow + pulse) — không vẽ lại toàn bộ đảo. */
  setSelected(id: string): void {
    this.selectedId = id;
    for (const [nodeId, entry] of this.nodes) {
      entry.ring.setVisible(nodeId === id);
    }
  }

  destroy(): void {
    for (const entry of this.nodes.values()) {
      entry.ringTween.stop();
      entry.container.destroy();
    }
    this.nodes.clear();
    this.pathGraphics?.destroy();
    this.pathGraphics = undefined;
  }

  /** Zigzag nhiều hàng theo `order` (không phụ thuộc mapId cụ thể) + jitter xác định (không random mỗi lần vẽ) để trông tự nhiên như địa hình đảo. */
  private getPosition(order: number): { x: number; y: number } {
    const index = order - 1;
    const row = Math.floor(index / COLS);
    const colInRow = index % COLS;
    const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow; // boustrophedon: hàng chẵn trái->phải, hàng lẻ phải->trái

    const jitterX = (this.seededRandom(order, 1) - 0.5) * 24;
    const jitterY = (this.seededRandom(order, 2) - 0.5) * 24;

    return {
      x: this.originX + col * COL_GAP + jitterX,
      y: this.originY + row * ROW_GAP + jitterY
    };
  }

  private seededRandom(seed: number, salt: number): number {
    const v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  private drawPaths(sorted: MapNodeViewData[], positions: Map<string, { x: number; y: number }>): void {
    if (!this.pathGraphics) return;
    this.pathGraphics.lineStyle(6, 0xffffff, 0.25);
    for (let i = 1; i < sorted.length; i++) {
      const a = positions.get(sorted[i - 1].id)!;
      const b = positions.get(sorted[i].id)!;
      this.pathGraphics.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private drawNode(data: MapNodeViewData, pos: { x: number; y: number }, onSelect: (id: string) => void): void {
    const container = this.scene.add.container(pos.x, pos.y);

    const isLocked = data.state === "locked";
    const fillColor = isLocked ? LOCKED_COLOR : data.themeColor;
    const fillAlpha = isLocked ? 0.5 : 1;

    const region = this.scene.add.graphics();
    region.fillStyle(fillColor, fillAlpha);
    region.fillRoundedRect(-NODE_SIZE / 2, -NODE_SIZE / 2, NODE_SIZE, NODE_SIZE, 16);
    region.lineStyle(2, 0xffffff, isLocked ? 0.15 : 0.4);
    region.strokeRoundedRect(-NODE_SIZE / 2, -NODE_SIZE / 2, NODE_SIZE, NODE_SIZE, 16);
    container.add(region);

    const label = this.scene.add.text(0, NODE_SIZE / 2 + 12, data.name, {
      fontSize: "11px",
      color: isLocked ? "#6b7280" : "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    container.add(label);

    if (isLocked) {
      container.add(this.drawLockIcon());
    } else if (data.state === "cleared") {
      container.add(this.drawCheckBadge());
    }

    // Ring glow+pulse cho trạng thái SELECTED — luôn tạo sẵn tween, chỉ setVisible theo selectedId hiện tại (tránh tạo/huỷ tween liên tục).
    const ring = this.scene.add.circle(0, 0, NODE_SIZE / 2 + 8); // không truyền fillColor -> chỉ có viền (isFilled = false)
    ring.setStrokeStyle(3, 0xfbbf24, 0.9);
    ring.setVisible(data.id === this.selectedId);
    container.add(ring);
    const ringTween = this.scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 1.12 },
      alpha: { from: 0.9, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    if (!isLocked) {
      container.setSize(NODE_SIZE, NODE_SIZE);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", () => onSelect(data.id));
    }

    this.nodes.set(data.id, { container, ring, ringTween, state: data.state });
  }

  private drawLockIcon(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(0xd1d5db, 0.9);
    g.fillRoundedRect(-8, -2, 16, 12, 3);
    g.lineStyle(3, 0xd1d5db, 0.9);
    g.beginPath();
    g.arc(0, -2, 7, Math.PI, 0, false);
    g.strokePath();
    return g;
  }

  private drawCheckBadge(): Phaser.GameObjects.Container {
    const badge = this.scene.add.container(NODE_SIZE / 2 - 6, -NODE_SIZE / 2 + 6);
    const bg = this.scene.add.circle(0, 0, 9, 0x16a34a, 1);
    const check = this.scene.add.text(0, 0, "✓", { fontSize: "12px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    badge.add([bg, check]);
    return badge;
  }
}
