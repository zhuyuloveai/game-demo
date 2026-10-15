import { WEAPONS, type EquippedWeapon, type PlayerAttributes, type RunAttributes, type WeaponId, type WeaponLevel, type WeaponLoadout } from '../shared.ts';
import { composeRunAttributes, RUN_ATTRIBUTE_LIMITS } from './PlayerModel.ts';
import { createStartingLoadout } from './WeaponModel.ts';

export type RunPhase = 'combat' | 'upgrade' | 'shop' | 'reward' | 'won' | 'lost';
export type AttributeBonuses = Partial<RunAttributes>;
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  tier: WeaponLevel;
  price: number;
  maxStacks: number;
  bonuses: AttributeBonuses;
}
export interface RunUpgrade {
  id: string;
  name: string;
  description: string;
  tier: WeaponLevel;
  bonuses: AttributeBonuses;
}
export interface ShopOffer {
  id: string;
  kind: 'item' | 'weapon';
  name: string;
  description: string;
  tier: WeaponLevel;
  price: number;
  locked: boolean;
  itemId?: string;
  weapon?: WeaponId;
  level?: WeaponLevel;
}
export interface InventoryEntry {
  id: string;
  name: string;
  count: number;
  description: string;
  tier: WeaponLevel;
}
export interface RunSnapshot {
  phase: RunPhase;
  wave: number;
  totalWaves: number;
  waveDuration: number;
  waveRemaining: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  materials: number;
  pendingUpgrades: number;
  attributes: RunAttributes;
  upgrades: RunUpgrade[];
  shop: ShopOffer[];
  inventory: InventoryEntry[];
  bossDefeated: boolean;
  bossRewards: RunUpgrade[];
  bossTrophies: { wave: number; name: string }[];
  shopRerollCost: number;
  upgradeRerollCost: number;
  message: string;
}

/** Office keepsakes are original designs; each stack applies the listed bonuses once. */
export const ITEMS: readonly ItemDefinition[] = [
  { id: 'lunchbox', name: '热乎便当', description: '最大生命 +12，移动速度 -2%', tier: 1, price: 16, maxStacks: 5, bonuses: { maxHp: 12, speedBonus: -2 } },
  { id: 'badge', name: '资深工牌', description: '收获 +5，攻击力 -3%', tier: 1, price: 18, maxStacks: 4, bonuses: { harvesting: 5, attackPower: -3 } },
  { id: 'chair', name: '人体工学椅', description: '护甲 +2，闪避 +3%，移动速度 -3%', tier: 2, price: 28, maxStacks: 4, bonuses: { armor: 2, dodge: 3, speedBonus: -3 } },
  { id: 'paid-leave', name: '带薪长假', description: '最大生命 +20，生命再生 +4，闪避 +8%，攻速 -10%', tier: 5, price: 90, maxStacks: 1, bonuses: { maxHp: 20, hpRegen: 4, dodge: 8, attackSpeed: -10 } },
  { id: 'caffeine', name: '浓缩咖啡因', description: '攻速 +8%，生命再生 -1', tier: 1, price: 20, maxStacks: 5, bonuses: { attackSpeed: 8, hpRegen: -1 } },
  { id: 'key-switch', name: '暴躁键盘轴', description: '近战伤害 +4，攻速 +3%，远程伤害 -1', tier: 2, price: 28, maxStacks: 4, bonuses: { meleeDamage: 4, attackSpeed: 3, rangedDamage: -1 } },
  { id: 'bonus', name: '绩效奖金', description: '收获 +10，护甲 -1', tier: 3, price: 42, maxStacks: 3, bonuses: { harvesting: 10, armor: -1 } },
  { id: 'health-card', name: '补充医保卡', description: '生命窃取 +2%，最大生命 +5', tier: 2, price: 30, maxStacks: 4, bonuses: { lifeSteal: 2, maxHp: 5 } },
  { id: 'lucky-pass', name: '幸运工签', description: '幸运 +12，攻击力 -4%', tier: 1, price: 18, maxStacks: 4, bonuses: { luck: 12, attackPower: -4 } },
  { id: 'sneakers', name: '通勤跑鞋', description: '移动速度 +7%，最大生命 -3', tier: 1, price: 20, maxStacks: 4, bonuses: { speedBonus: 7, maxHp: -3 } },
  { id: 'privacy-film', name: '摸鱼防窥膜', description: '闪避 +5%，护甲 -1', tier: 2, price: 26, maxStacks: 4, bonuses: { dodge: 5, armor: -1 } },
  { id: 'pointer', name: '精密瞄准贴', description: '远程伤害 +3，拾取范围 +10%，近战伤害 -1', tier: 2, price: 26, maxStacks: 4, bonuses: { rangedDamage: 3, pickupRange: 10, meleeDamage: -1 } },
  { id: 'thermos', name: '恒温保温杯', description: '元素伤害 +5，生命再生 +1，攻速 -3%', tier: 3, price: 38, maxStacks: 3, bonuses: { elementalDamage: 5, hpRegen: 1, attackSpeed: -3 } },
  { id: 'desk-vacuum', name: '桌面吸尘器', description: '拾取范围 +35%，远程伤害 +1，移动速度 -1%', tier: 1, price: 18, maxStacks: 3, bonuses: { pickupRange: 35, rangedDamage: 1, speedBonus: -1 } },
  { id: 'overtime', name: '加班终结者', description: '攻击力 +24%，近战伤害 +5，生命再生 -2', tier: 4, price: 62, maxStacks: 2, bonuses: { attackPower: 24, meleeDamage: 5, hpRegen: -2 } },
  { id: 'focus', name: '专注耳机', description: '暴击率 +5%，远程伤害 +1，最大生命 -4', tier: 2, price: 28, maxStacks: 4, bonuses: { critChance: 5, rangedDamage: 1, maxHp: -4 } },
];

interface UpgradeDefinition { id: keyof RunAttributes; name: string; amount: number; unit: string; }
export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: 'attackPower', name: '反击底气', amount: 10, unit: '% 攻击力' },
  { id: 'attackSpeed', name: '高速处理', amount: 5, unit: '% 攻速' },
  { id: 'critChance', name: '精准吐槽', amount: 3, unit: '% 暴击率' },
  { id: 'maxHp', name: '身心储备', amount: 8, unit: ' 最大生命' },
  { id: 'hpRegen', name: '工间休息', amount: 1, unit: ' 生命再生' },
  { id: 'lifeSteal', name: '压力回收', amount: 1, unit: '% 生命窃取' },
  { id: 'armor', name: '情绪防线', amount: 2, unit: ' 护甲' },
  { id: 'dodge', name: '灵活应变', amount: 3, unit: '% 闪避' },
  { id: 'speedBonus', name: '准点打卡', amount: 3, unit: '% 移动速度' },
  { id: 'luck', name: '好运加持', amount: 6, unit: ' 幸运' },
  { id: 'harvesting', name: '增收计划', amount: 4, unit: ' 收获' },
  { id: 'meleeDamage', name: '近身维权', amount: 3, unit: ' 近战伤害' },
  { id: 'rangedDamage', name: '远程沟通', amount: 2, unit: ' 远程伤害' },
  { id: 'elementalDamage', name: '情绪升温', amount: 3, unit: ' 元素伤害' },
  { id: 'pickupRange', name: '资源整合', amount: 15, unit: '% 拾取范围' },
];

const TOTAL_WAVES = 20;
const WALLET_CAP = Number.MAX_SAFE_INTEGER;
const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const waveDuration = (wave: number): number => Math.min(60, 20 + (wave - 1) * 3);
export const nextLevelXp = (level: number): number => 20 + 15 * (level - 1) + 2 * (level - 1) ** 2;
export const isBossWave = (wave: number): boolean => wave === 10 || wave === 20;
export const weaponShopPrice = (wave: number, level: WeaponLevel): number =>
  Math.ceil((wave === 1 ? 15 : 16 + wave * 5) * (1 + (level - 1) * 0.9));
export const weaponRecycleValue = (wave: number, level: WeaponLevel): number =>
  Math.max(1, Math.floor(weaponShopPrice(wave, level) * 0.25));

const BOSS_REWARDS: Record<10 | 20, readonly Omit<RunUpgrade, 'id'>[]> = {
  10: [
    { name: '越级晋升函', description: '攻击力 +25%，攻速 +10%，暴击率 +5%', tier: 4,
      bonuses: { attackPower: 25, attackSpeed: 10, critChance: 5 } },
    { name: '拒绝内耗公约', description: '最大生命 +35，护甲 +5，生命再生 +4', tier: 4,
      bonuses: { maxHp: 35, armor: 5, hpRegen: 4 } },
    { name: '自由通勤通行证', description: '移动速度 +10%，生命窃取 +4%，幸运 +25，拾取范围 +35%', tier: 4,
      bonuses: { speedBonus: 10, lifeSteal: 4, luck: 25, pickupRange: 35 } },
  ],
  20: [
    { name: '准点下班金奖', description: '攻击力 +50%，攻速 +20%，暴击率 +10%', tier: 5,
      bonuses: { attackPower: 50, attackSpeed: 20, critChance: 10 } },
    { name: '终身带薪假期', description: '最大生命 +80，护甲 +10，闪避 +10%，生命再生 +8', tier: 5,
      bonuses: { maxHp: 80, armor: 10, dodge: 10, hpRegen: 8 } },
    { name: '全能打工人勋章', description: '近战伤害 +12，远程伤害 +8，元素伤害 +12，生命窃取 +6%', tier: 5,
      bonuses: { meleeDamage: 12, rangedDamage: 8, elementalDamage: 12, lifeSteal: 6 } },
  ],
};

/** Owns one run; scene time, enemy simulation, and rendering stay outside this model. */
export class RunProgress {
  private currentPhase: RunPhase = 'combat';
  private currentWave = 1;
  private level = 1;
  private xp = 0;
  private materials = 0;
  private pendingUpgrades = 0;
  private bonuses: AttributeBonuses = {};
  private base: PlayerAttributes;
  private loadout: WeaponLoadout;
  private upgrades: RunUpgrade[] = [];
  private shop: ShopOffer[] = [];
  private inventory = new Map<string, number>();
  private currentBossDefeated = false;
  private bossRewards: RunUpgrade[] = [];
  private bossTrophies: { wave: number; name: string }[] = [];
  private rewardInventory: InventoryEntry[] = [];
  private shopRerolls = 0;
  private upgradeRerolls = 0;
  private serial = 0;
  private message = '移动收集加班费，在波次结束后升级和购物。';
  private random: () => number;

  constructor(base: PlayerAttributes, loadout: readonly (EquippedWeapon | null)[], random = Math.random) {
    this.base = { attackPower: base.attackPower, attackSpeed: base.attackSpeed, critChance: base.critChance };
    this.loadout = createStartingLoadout(loadout);
    this.random = random;
  }

  get phase(): RunPhase { return this.currentPhase; }
  get wave(): number { return this.currentWave; }
  get bossDefeated(): boolean { return this.currentBossDefeated; }
  get waveDuration(): number { return waveDuration(this.currentWave); }

  getLoadout(): WeaponLoadout { return this.loadout.map(weapon => weapon ? ({ ...weapon }) : null); }
  getAttributes(): RunAttributes { return composeRunAttributes(this.base, this.bonuses); }

  snapshot(waveRemaining = waveDuration(this.currentWave)): RunSnapshot {
    const duration = waveDuration(this.currentWave);
    return {
      phase: this.currentPhase, wave: this.currentWave, totalWaves: TOTAL_WAVES,
      waveDuration: duration,
      waveRemaining: this.currentPhase === 'combat' ? Math.max(0, Math.min(duration, Number.isFinite(waveRemaining) ? waveRemaining : duration)) : 0,
      level: this.level, xp: this.xp, nextLevelXp: nextLevelXp(this.level), materials: this.materials,
      pendingUpgrades: this.pendingUpgrades, attributes: this.getAttributes(),
      upgrades: this.upgrades.map(upgrade => ({ ...upgrade, bonuses: { ...upgrade.bonuses } })),
      shop: this.shop.map(offer => ({ ...offer })),
      inventory: [...this.inventory].map(([id, count]) => {
        const item = ITEMS.find(item => item.id === id)!;
        return { id, name: item.name, count, description: item.description, tier: item.tier };
      }).concat(this.rewardInventory.map(entry => ({ ...entry }))),
      bossDefeated: this.currentBossDefeated,
      bossRewards: this.bossRewards.map(reward => ({ ...reward, bonuses: { ...reward.bonuses } })),
      bossTrophies: this.bossTrophies.map(trophy => ({ ...trophy })),
      shopRerollCost: this.shopRerollCost(), upgradeRerollCost: this.upgradeRerollCost(), message: this.message,
    };
  }

  collect(value: number): void {
    if (this.currentPhase !== 'combat' || !Number.isSafeInteger(value) || value < 1) return;
    this.reward(value);
  }

  finishWave(): boolean {
    if (this.currentPhase !== 'combat' || (isBossWave(this.currentWave) && !this.currentBossDefeated)) return false;
    const harvesting = Math.trunc(this.getAttributes().harvesting);
    if (harvesting > 0) {
      this.reward(harvesting);
      this.addBonuses({ harvesting: Math.ceil(harvesting * 1.05) - harvesting });
    }
    this.message = `第 ${this.currentWave} 波完成 · 收获 ${harvesting >= 0 ? '+' : ''}${harvesting} 加班费`;
    if (isBossWave(this.currentWave)) {
      this.currentPhase = 'reward';
      this.bossRewards = BOSS_REWARDS[this.currentWave as 10 | 20]
        .map(reward => ({ ...reward, id: `boss-reward-${++this.serial}`, bonuses: { ...reward.bonuses } }));
      this.message = `第 ${this.currentWave} 波 Boss 已击败，选择一件${this.currentWave === 10 ? '史诗' : '传说'}战利品`;
    } else if (this.pendingUpgrades > 0) {
      this.currentPhase = 'upgrade';
      this.generateUpgrades();
    } else {
      this.enterShop();
    }
    return true;
  }

  defeatBoss(): boolean {
    if (this.currentPhase !== 'combat' || !isBossWave(this.currentWave) || this.currentBossDefeated) return false;
    this.currentBossDefeated = true;
    const final = this.currentWave === 20;
    const materials = final ? 600 : 200, experience = final ? 200 : 80;
    this.materials = Math.min(WALLET_CAP, this.materials + materials);
    this.gainExperience(experience);
    this.bossTrophies.push({ wave: this.currentWave, name: final ? '终结加班 · 总裁奖杯' : '晋升时刻 · 主管奖杯' });
    this.message = `Boss 击败奖励：+${materials} 加班费，+${experience} 经验`;
    return true;
  }

  chooseBossReward(id: string): boolean {
    if (this.currentPhase !== 'reward') return false;
    const reward = this.bossRewards.find(candidate => candidate.id === id);
    if (!reward) return false;
    this.addBonuses(reward.bonuses);
    this.rewardInventory.push({ id: reward.id, name: reward.name, count: 1, description: reward.description, tier: reward.tier });
    this.bossRewards = [];
    this.message = `获得 ${reward.name}：${reward.description}`;
    if (this.currentWave === TOTAL_WAVES) {
      this.currentPhase = 'won';
      this.upgrades = [];
      this.pendingUpgrades = 0;
      this.message = `20 波挑战完成，获得${reward.name}，今天准点下班！`;
    } else if (this.pendingUpgrades > 0) {
      this.currentPhase = 'upgrade';
      this.generateUpgrades();
    } else this.enterShop();
    return true;
  }

  chooseUpgrade(id: string): boolean {
    if (this.currentPhase !== 'upgrade' || this.pendingUpgrades <= 0) return false;
    const upgrade = this.upgrades.find(candidate => candidate.id === id);
    if (!upgrade) return false;
    this.addBonuses(upgrade.bonuses);
    this.pendingUpgrades--;
    this.message = `获得 ${upgrade.name}：${upgrade.description}`;
    if (this.pendingUpgrades > 0) this.generateUpgrades();
    else this.enterShop();
    return true;
  }

  rerollUpgrades(): boolean {
    if (this.currentPhase !== 'upgrade' || this.pendingUpgrades <= 0) return false;
    const price = this.upgradeRerollCost();
    if (!this.spend(price)) return false;
    this.upgradeRerolls++;
    this.message = `花费 ${price} 加班费刷新升级选项`;
    this.generateUpgrades();
    return true;
  }

  buy(id: string, slot?: number): boolean {
    if (this.currentPhase !== 'shop') return false;
    const offer = this.shop.find(candidate => candidate.id === id);
    if (!offer || this.materials < offer.price) return false;
    if (offer.kind === 'weapon') {
      if (!offer.weapon || !offer.level) return false;
      const matches = (equipped: EquippedWeapon | null) => !!equipped && equipped.weapon === offer.weapon
        && equipped.level === offer.level && equipped.level < 5;
      if (slot === undefined) {
        const empty = this.loadout.findIndex(equipped => equipped === null);
        slot = empty >= 0 ? empty : this.loadout.findIndex(matches);
      }
      if (!Number.isInteger(slot) || slot < 0 || slot >= this.loadout.length) return false;
      const equipped = this.loadout[slot];
      if (equipped && !matches(equipped)) return false;
      this.loadout[slot] = { weapon: offer.weapon, level: equipped ? (equipped.level + 1) as WeaponLevel : offer.level };
      this.message = equipped ? `${offer.name} 合成为 Lv.${equipped.level + 1}` : `${offer.name} 装备至第 ${slot + 1} 只手`;
    } else {
      const item = ITEMS.find(candidate => candidate.id === offer.itemId);
      if (!item || (this.inventory.get(item.id) ?? 0) >= item.maxStacks) return false;
      this.inventory.set(item.id, (this.inventory.get(item.id) ?? 0) + 1);
      this.addBonuses(item.bonuses);
      this.message = `获得 ${item.name}：${item.description}`;
    }
    this.materials -= offer.price;
    this.shop = this.shop.filter(candidate => candidate.id !== id);
    // Other copies can still be locked in an earlier shop, so prune exhausted stacks atomically.
    this.shop = this.shop.filter(candidate => candidate.kind === 'weapon' || this.canBuyItem(candidate.itemId));
    return true;
  }

  combine(slot: number, otherSlot: number): boolean {
    if (this.currentPhase !== 'shop' || !Number.isInteger(slot) || !Number.isInteger(otherSlot)
      || slot < 0 || slot >= 6 || otherSlot < 0 || otherSlot >= 6 || slot === otherSlot) return false;
    const first = this.loadout[slot], second = this.loadout[otherSlot];
    if (!first || !second || first.weapon !== second.weapon || first.level !== second.level || first.level >= 5) return false;
    this.loadout[slot] = { weapon: first.weapon, level: (first.level + 1) as WeaponLevel };
    this.loadout[otherSlot] = null;
    this.message = `两把 ${WEAPONS[first.weapon].name} Lv.${first.level} 合成为 Lv.${first.level + 1}，空出第 ${otherSlot + 1} 只手`;
    return true;
  }

  sell(slot: number): boolean {
    if (this.currentPhase !== 'shop' || !Number.isInteger(slot) || slot < 0 || slot >= 6
      || this.loadout.filter(equipped => equipped !== null).length <= 1) return false;
    const equipped = this.loadout[slot];
    if (!equipped) return false;
    const price = weaponRecycleValue(this.currentWave, equipped.level);
    this.loadout[slot] = null;
    this.materials = Math.min(WALLET_CAP, this.materials + price);
    this.message = `回收 ${WEAPONS[equipped.weapon].name} Lv.${equipped.level}，获得 ${price} 加班费`;
    return true;
  }

  toggleLock(id: string): boolean {
    if (this.currentPhase !== 'shop') return false;
    const offer = this.shop.find(candidate => candidate.id === id);
    if (!offer) return false;
    offer.locked = !offer.locked;
    this.message = offer.locked ? `${offer.name} 已锁定，跨波保留当前价格` : `${offer.name} 已解锁`;
    return true;
  }

  rerollShop(): boolean {
    if (this.currentPhase !== 'shop') return false;
    const price = this.shopRerollCost();
    if (price === 0) return false;
    if (!this.spend(price)) return false;
    this.shopRerolls++;
    this.generateShop();
    this.message = `花费 ${price} 加班费刷新商店，锁定商品已保留`;
    return true;
  }

  nextWave(): boolean {
    if (this.currentPhase !== 'shop' || this.currentWave >= TOTAL_WAVES) return false;
    this.currentWave++;
    this.currentPhase = 'combat';
    this.shopRerolls = 0;
    this.upgradeRerolls = 0;
    this.upgrades = [];
    this.currentBossDefeated = false;
    this.bossRewards = [];
    this.message = `第 ${this.currentWave} 波 · 坚持 ${waveDuration(this.currentWave)} 秒`;
    return true;
  }

  endRun(): void {
    if (this.currentPhase === 'combat') {
      this.currentPhase = 'lost';
      this.message = '本次挑战结束，再来一局吧。';
    }
  }

  private roll(): number {
    const value = this.random();
    return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
  }

  private pick<T>(values: readonly T[]): T { return values[Math.floor(this.roll() * values.length)]; }

  private reward(value: number): void {
    this.materials = Math.min(WALLET_CAP, this.materials + value);
    this.gainExperience(value);
  }

  private gainExperience(value: number): void {
    this.xp = Math.min(Number.MAX_SAFE_INTEGER, this.xp + value);
    while (this.xp >= nextLevelXp(this.level)) {
      this.xp -= nextLevelXp(this.level);
      this.level++;
      this.pendingUpgrades++;
    }
  }

  private spend(price: number): boolean {
    if (this.materials < price) {
      this.message = `还需要 ${price - this.materials} 加班费`;
      return false;
    }
    this.materials -= price;
    return true;
  }

  private addBonuses(bonuses: AttributeBonuses): void {
    for (const key of Object.keys(bonuses) as (keyof RunAttributes)[]) {
      const value = bonuses[key];
      if (typeof value === 'number' && Number.isFinite(value)) this.bonuses[key] = (this.bonuses[key] ?? 0) + value;
    }
    // Store only effective bonuses. A clamped penalty cannot create hidden debt,
    // and a capped benefit cannot silently shield later trade-offs.
    const baseline = composeRunAttributes(this.base);
    const effective = this.getAttributes();
    this.bonuses = Object.fromEntries((Object.keys(effective) as (keyof RunAttributes)[])
      .map(key => [key, effective[key] - baseline[key]]));
  }

  private tier(): WeaponLevel {
    const maxTier = Math.min(5, 2 + Math.floor((this.currentWave - 1) / 4));
    const shift = Math.max(-0.25, Math.min(0.45, this.currentWave * 0.012 + this.getAttributes().luck * 0.0015));
    const roll = this.roll();
    const tier = roll < 0.6 - shift ? 1 : roll < 0.86 - shift * 0.5 ? 2
      : roll < 0.96 - shift * 0.2 ? 3 : roll < 0.995 - shift * 0.05 ? 4 : 5;
    return Math.min(tier, maxTier) as WeaponLevel;
  }

  private generateUpgrades(): void {
    const attributes = this.getAttributes();
    const pool = UPGRADES.filter(definition => attributes[definition.id] < RUN_ATTRIBUTE_LIMITS[definition.id].max);
    if (pool.length === 0) {
      const count = this.pendingUpgrades;
      const previousMaterials = this.materials;
      this.materials = Math.min(WALLET_CAP, this.materials + count * 25);
      this.pendingUpgrades = 0;
      this.message = `人物属性已全部满级，${count} 次升级转换为 ${this.materials - previousMaterials} 加班费。`;
      this.enterShop();
      return;
    }
    this.upgrades = Array.from({ length: Math.min(4, pool.length) }, () => {
      const definition = pool.splice(Math.floor(this.roll() * pool.length), 1)[0];
      const tier = this.tier();
      const rolledAmount = Math.max(1, Math.round(definition.amount * [1, 1.5, 2, 2.75, 3.5][tier - 1]));
      const amount = Math.min(rolledAmount, RUN_ATTRIBUTE_LIMITS[definition.id].max - attributes[definition.id]);
      return {
        id: `upgrade-${++this.serial}`, name: definition.name, description: `+${amount}${definition.unit}`,
        tier, bonuses: { [definition.id]: amount },
      };
    });
  }

  private canBuyItem(id: string | undefined): boolean {
    const item = ITEMS.find(candidate => candidate.id === id);
    return !!item && (this.inventory.get(item.id) ?? 0) < item.maxStacks;
  }

  private enterShop(): void {
    this.currentPhase = 'shop';
    this.upgrades = [];
    this.generateShop();
  }

  private generateShop(): void {
    this.shop = this.shop.filter(offer => offer.locked && (offer.kind === 'weapon' || this.canBuyItem(offer.itemId)));
    while (this.shop.length < 4) {
      const needsWeapon = this.shop.filter(offer => offer.kind === 'weapon').length < (this.currentWave <= 2 ? 2 : 1);
      if (needsWeapon || this.roll() < 0.28) {
        const needsStarter = this.currentWave === 1 && !this.shop.some(offer => offer.kind === 'weapon' && offer.price <= 15);
        this.shop.push(this.makeWeapon(needsStarter));
      }
      else this.shop.push(this.makeItem());
    }
  }

  private makeWeapon(starter = false): ShopOffer {
    const combinable = this.loadout.filter((weapon): weapon is EquippedWeapon => !!weapon && weapon.level < 5);
    const match = combinable.length > 0 && this.roll() < 0.72 ? this.pick(combinable) : null;
    const weapon = match?.weapon ?? this.pick(WEAPON_IDS);
    const level = starter ? 1 : match?.level ?? this.tier();
    return {
      id: `offer-${++this.serial}`, kind: 'weapon', weapon, level, name: WEAPONS[weapon].name,
      description: `${WEAPONS[weapon].description} · 两把同种同级合一，最高 Lv.5`,
      tier: level, price: weaponShopPrice(this.currentWave, level), locked: false,
    };
  }

  private makeItem(): ShopOffer {
    const available = ITEMS.filter(item => this.canBuyItem(item.id));
    if (available.length === 0) return this.makeWeapon();
    const tier = this.tier();
    const eligible = available.filter(item => item.tier <= tier);
    if (eligible.length === 0) return this.makeWeapon();
    const highestTier = Math.max(...eligible.map(item => item.tier));
    const item = this.pick(eligible.filter(item => item.tier === highestTier));
    return {
      id: `offer-${++this.serial}`, kind: 'item', itemId: item.id, name: item.name,
      description: `${item.description} · 最多 ${item.maxStacks} 件`,
      tier: item.tier, price: Math.ceil(item.price * (1 + this.currentWave * 0.06)), locked: false,
    };
  }

  private shopRerollCost(): number {
    return this.shop.length === 4 && this.shop.every(offer => offer.locked) ? 0 : 8 + this.currentWave * 2 + this.shopRerolls * 5;
  }

  private upgradeRerollCost(): number { return 5 + this.currentWave + this.upgradeRerolls * 3; }
}
