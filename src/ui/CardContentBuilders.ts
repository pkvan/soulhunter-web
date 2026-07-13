import Phaser from "phaser";
import { CardData, getCardStyle } from "@ui/CardStyle";
import { CardContent } from "@ui/CollectionCard";
import { renderWeaponIcon } from "@ui/WeaponIcon";
import { WeaponDef, UpgradeDef, Rarity } from "@types/index";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";

const weapons = weaponsData as WeaponDef[];
const fusionWeapons = fusionWeaponsData as WeaponDef[];
const allWeaponDefs = [...weapons, ...fusionWeapons];

function weaponOrFallbackIcon(weaponDef: WeaponDef | undefined, fallbackColor: number) {
  return (scene: Phaser.Scene, x: number, y: number, size: number) =>
    weaponDef ? renderWeaponIcon(scene, x, y, weaponDef, size) : scene.add.circle(x, y, size / 2, fallbackColor, 0.9);
}

/**
 * Chuyển CardData (gameplay: fusion/weapon-choice/upgrade, xem UpgradeSystem/FusionSystem) thành CardContent
 * để CollectionCard vẽ — dùng ở LevelUpScene. Đây là ĐIỂM DUY NHẤT map dữ liệu gameplay sang Card, tách khỏi
 * cách CollectionScene tự build CardContent cho 4 tab Collection (dữ liệu khác hẳn: Enemy/Boss/Weapon/Upgrade
 * đọc thẳng qua CollectionManager) — nhưng cả 2 nơi cùng render ra bằng đúng 1 class CollectionCard.
 */
export function buildGameplayCardContent(data: CardData): CardContent {
  const style = getCardStyle(data);

  if ("fusion" in data && data.fusion) {
    const weaponDef = allWeaponDefs.find((w) => w.id === data.fusionId);
    return {
      title: data.def.name,
      description: weaponDef?.description ?? data.def.effect,
      rarity: weaponDef?.rarity as Rarity | undefined,
      renderIcon: weaponOrFallbackIcon(weaponDef, style.border),
      badgeLabel: style.label,
      badgeColor: style.labelColor
    };
  }

  if ("weapon" in data && data.weapon) {
    const weaponDef = allWeaponDefs.find((w) => w.id === data.weaponId);
    const current = data.currentLevel ?? 1;
    const levelText = data.isNew ? "Lv. 1" : `Lv. ${current} → ${current + 1}`;
    return {
      title: weaponDef?.name ?? data.weaponId,
      description: weaponDef?.description ?? "",
      rarity: weaponDef?.rarity as Rarity | undefined,
      renderIcon: weaponOrFallbackIcon(weaponDef, style.border),
      statLines: [levelText],
      badgeLabel: style.label,
      badgeColor: style.labelColor
    };
  }

  const upgrade = data as UpgradeDef & { currentStack?: number };
  const stack = upgrade.currentStack;
  return {
    title: upgrade.name,
    description: upgrade.description ?? "",
    rarity: upgrade.rarity,
    renderIcon: weaponOrFallbackIcon(undefined, style.border),
    statLines: stack && stack > 0 ? [`Đã có: x${stack} → x${stack + 1}`] : undefined,
    badgeLabel: style.label,
    badgeColor: style.labelColor
  };
}
