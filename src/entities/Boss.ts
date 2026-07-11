import Phaser from "phaser";

/**
 * Boss: Giant Skeleton (xem GDD mục 8). Không dùng PoolManager vì chỉ có 1 instance/trận.
 * 3 kỹ năng: Dash, Summon, Ground Slam — luân phiên theo cooldown riêng, không cần state machine phức tạp ở MVP.
 */
export class Boss {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public maxHp = 2000; // TODO: tune theo thời điểm phút thứ 5
  public currentHp = this.maxHp;

  private lastDashAt = 0;
  private lastSummonAt = 0;
  private lastSlamAt = 0;

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "boss_placeholder");
  }

  update(time: number, playerX: number, playerY: number): void {
    // TODO: di chuyển hướng player chậm hơn quái thường
    // TODO: nếu time - lastDashAt > DASH_COOLDOWN -> thực hiện Dash (lao nhanh về hướng player)
    // TODO: nếu time - lastSummonAt > SUMMON_COOLDOWN -> gọi SpawnSystem spawn thêm vài quái thường quanh boss
    // TODO: nếu time - lastSlamAt > SLAM_COOLDOWN -> Ground Slam (gây damage diện rộng quanh boss, có telegraph trước 0.5-1s)
  }

  takeDamage(amount: number): boolean {
    this.currentHp -= amount;
    return this.currentHp <= 0;
  }
}
