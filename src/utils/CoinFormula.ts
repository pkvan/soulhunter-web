/**
 * Công thức tính Coin nhận được cuối ván — đặt riêng 1 chỗ để dễ tune sau, không rải hardcode
 * trong GameScene. GDD mục 12: dựa trên kills + survivalTime + có/không hạ được boss cuối cùng.
 */
export function calculateCoinEarned(
  kills: number,
  survivalTimeMs: number,
  victory: boolean,
  coinRewardMultiplier = 1 // Daily Challenge modifier (GDD mục 15) — mặc định 1 khi chơi ván thường
): number {
  const killBonus = kills / 10;
  const survivalBonus = survivalTimeMs / 10000;
  const victoryBonus = victory ? 50 : 0;
  return Math.floor((killBonus + survivalBonus + victoryBonus) * coinRewardMultiplier);
}
