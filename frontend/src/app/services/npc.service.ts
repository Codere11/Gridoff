import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { CombatService } from './combat.service';

// --- Interfaces ---

/** Defines the types of NPCs in the game. */
export type NpcType = 'villager' | 'seller' | 'gunSeller' | 'enemy' | 'smuggler' | 'warlord' | 'soldier';

/** Represents an NPC with properties like position, type, and health. */
export interface NPC {
  id: number;
  type: NpcType;
  name?: string;
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down';
  animationFrame: number;
  health?: number;
  sprite?: string;
  faction?: number;
  smugglerState?: SmugglerState;
  smugglerData?: SmugglerData;
}

/** Represents a tent with faction and type information. */
export interface Tent {
  x: number;
  y: number;
  faction: number;
  type: 'hq' | 'regular';
}

/** Data specific to smuggler NPCs, including inventory and state tracking. */
export interface SmugglerData {
  inventory: { tobacco: number };
  ammo: number;
  transformedCount: number;
  targetTobacco?: { x: number; y: number };
  lastBulletTime?: number;
}

/** Interface for smuggler state machine states. */
export interface SmugglerState {
  name: string;
  update(npc: NPC, service: NpcService, data: SmugglerData): void;
}

/**
 * Service responsible for managing NPCs, including spawning, movement,
 * and state-based behavior.
 */
@Injectable({
  providedIn: 'root'
})
export class NpcService {
  npcs: NPC[] = [];
  private _frameCounter: number = 0;
  public gameState = inject(GameStateService);
  private _processedHouseIndices: Set<number> = new Set<number>();
  private _processedGunsellerIndices: Set<number> = new Set<number>();
  private _processedTobaccoIndices: Set<number> = new Set<number>();
  private _processedTentIndices: Set<number> = new Set<number>();
  public combatService = inject(CombatService);

  private namePool = [
    'Janez', 'Jaka', 'Andrej', 'Oliver', 'Mujo', 'Albert', 'Matevz', 'Viktor',
    'Mason', 'Maks', 'Zdravko', 'Marko', 'Luka', 'Charles', 'Yuri', 'Arnold'
  ];

  constructor() {
    this.initializeNpcs();
  }

  // --- Initialization and Spawning ---

  /** Initializes the game with 10 random NPCs. */
  private initializeNpcs(): void {
    const types: NpcType[] = ['warlord', 'villager', 'soldier', 'smuggler'];
    this.npcs = Array.from({ length: 10 }, (_, i) => this.spawnNpc({
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      health: Math.floor(Math.random() * 100) + 50
    }));
  }

  /** Spawns a new NPC with the given initial properties. */
  private spawnNpc(initial: Partial<NPC>): NPC {
    const npc: NPC = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: initial.type || 'villager',
      name: `${this.namePool[Math.floor(Math.random() * this.namePool.length)]} - ${initial.type ? initial.type.charAt(0).toUpperCase() + initial.type.slice(1) : 'NPC'}`,
      x: initial.x ?? 20,
      y: initial.y ?? 20,
      direction: initial.direction || 'right',
      animationFrame: initial.animationFrame ?? 0,
      health: initial.health ?? 100,
      ...initial
    };
    this.npcs.push(npc);
    console.log('NPC spawned in spawnNpc:', npc);
    return npc;
  }

  /** Spawns villagers at house coordinates (every 10th house). */
  spawnVillagersForHouses(): void {
    this.gameState.houseCoordinates.forEach((coord, index) => {
      if (index % 10 === 0 && !this._processedHouseIndices.has(index)) {
        const spawnedNpc = this.spawnNpc({
          type: 'villager',
          x: coord.x,
          y: coord.y,
          direction: 'right',
          animationFrame: 0,
          health: 100
        });
        this._processedHouseIndices.add(index);
        if (this.npcs.length > 0) {
          console.log('Villager spawned:', this.npcs[this.npcs.length - 1]);
        } else {
          console.warn('No NPCs spawned unexpectedly.');
        }
      }
    });
  }

  /** Spawns gunsellers at gunseller table coordinates. */
  spawnGunsellersForTables(): void {
    if (this.gameState.gunsellerTableCoordinates && this.gameState.gunsellerTableCoordinates.length > 0) {
      this.gameState.gunsellerTableCoordinates.forEach(coord => {
        this.spawnNpc({
          type: 'gunSeller',
          name: 'Gun Trader',
          x: coord.x,
          y: coord.y,
          direction: 'right',
          animationFrame: 0,
          health: 100
        });
      });
    }
  }

  /** Spawns smugglers at tobacco table coordinates within render distance. */
  spawnSmugglersAtTobaccoTables(): void {
    const renderDistance = 12;
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;

    this.gameState.tobaccoTableCoordinates.forEach((coord, index) => {
      if (!this._processedTobaccoIndices.has(index)) {
        const dx = coord.x - playerX;
        const dy = coord.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= renderDistance) {
          this.spawnNpc({
            type: 'smuggler',
            name: 'Smuggler',
            x: coord.x + 0.5,
            y: coord.y + 0.5,
            direction: 'left',
            animationFrame: 0,
            health: 100
          });
          this._processedTobaccoIndices.add(index);
        }
      }
    });
  }

  /** Spawns soldiers at tent positions based on proximity and faction. */
  spawnSoldiersAtTents(): void {
    const renderDistance = 12;
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;

    this.gameState.tentPositions.forEach((tent, index) => {
      if (!this._processedTentIndices.has(index)) {
        const dx = tent.x - playerX;
        const dy = tent.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= renderDistance) {
          const tile = this.gameState.map[tent.y][tent.x];
          const isHQ = tile.type.startsWith('hq-');
          const soldierCount = isHQ ? 3 : 1;
          for (let i = 0; i < soldierCount; i++) {
            this.spawnNpc({
              type: 'soldier',
              name: `${this.namePool[Math.floor(Math.random() * this.namePool.length)]} - Soldier`,
              x: tent.x + (i - (soldierCount - 1) / 2) * 0.3,
              y: tent.y,
              direction: 'right',
              animationFrame: 0,
              health: 100,
              faction: tent.faction
            });
            console.log(`Spawned soldier ${i + 1} at (${tent.x + (i - (soldierCount - 1) / 2) * 0.3}, ${tent.y}) for faction ${tent.faction}`);
          }
          this._processedTentIndices.add(index);
        }
      }
    });
  }

  /** Spawns warlords at faction HQ coordinates. */
  spawnWarlords(): void {
    const seeds = [
      { faction: 0, x: 500, y: 350, hqType: 'hq-ak' },
      { faction: 1, x: 1300, y: 800, hqType: 'hq-coin' },
      { faction: 2, x: 1500, y: 2500, hqType: 'hq-sword' },
      { faction: 3, x: 800, y: 1500, hqType: 'hq-tobacco' },
      { faction: 4, x: 2200, y: 1500, hqType: 'hq-wolf' }
    ];

    seeds.forEach(seed => {
      const factionName = seed.hqType.replace('hq-', '');
      this.spawnNpc({
        type: 'warlord',
        name: `${this.namePool[Math.floor(Math.random() * this.namePool.length)]} - Warlord`,
        x: seed.x,
        y: seed.y,
        direction: 'right',
        animationFrame: 0,
        health: 100,
        faction: seed.faction,
        sprite: `assets/sprites/warlord-${factionName}-gun.png`
      });
    });
  }

  // --- Movement and Updates ---

  /** Updates NPC positions and behaviors every 50 frames. */
  updateNpcs(): void {
    this._frameCounter++;
    if (this._frameCounter % 50 !== 0) return;

    const directions = ['left', 'right', 'up', 'down', 'none'];
    const movement = 0.5;

    this.npcs.forEach(npc => {
      if (npc.type === 'smuggler') {
        this.updateSmugglerBehavior(npc);
      } else {
        const chosenDirection = directions[Math.floor(Math.random() * directions.length)];
        this.moveNpcRandomly(npc, chosenDirection, movement);
      }
    });
  }

  /** Moves an NPC randomly based on the chosen direction. */
  private moveNpcRandomly(npc: NPC, direction: string, movement: number): void {
    let candidateX = npc.x;
    let candidateY = npc.y;
    switch (direction) {
      case 'left': candidateX -= movement; break;
      case 'right': candidateX += movement; break;
      case 'up': candidateY -= movement; break;
      case 'down': candidateY += movement; break;
      case 'none': break;
    }
    const targetTile = this.gameState.map[Math.floor(candidateY)]?.[Math.floor(candidateX)];
    const nonWalkable = ['tree-tile', 'house-1'];
    if (!targetTile || nonWalkable.includes(targetTile.type)) return;
    npc.x = candidateX;
    npc.y = candidateY;
    if (direction !== 'none') {
      npc.direction = direction as 'left' | 'right' | 'up' | 'down';
      if (direction === 'up' || direction === 'down') {
        npc.animationFrame = npc.animationFrame === 0 ? 1 : 0;
      }
    }
  }

  /** Updates visible NPCs based on proximity to the player. */
  updateVisibleNPCs(): void {
    const renderDistance = 10;
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;

    this.gameState.houseCoordinates.forEach((house, index) => {
      if (index % 10 !== 0 || this._processedHouseIndices.has(index)) return;
      const dx = house.x - playerX;
      const dy = house.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= renderDistance) {
        const alreadySpawned = this.npcs.some(npc =>
          npc.type === 'villager' &&
          Math.abs(npc.x - house.x) < 0.5 &&
          Math.abs(npc.y - house.y) < 0.5
        );
        if (!alreadySpawned) {
          this.spawnNpc({
            type: 'villager',
            name: `${this.namePool[Math.floor(Math.random() * this.namePool.length)]} - Villager`,
            x: house.x,
            y: house.y,
            direction: 'right',
            animationFrame: 0,
            health: 100
          });
          this._processedHouseIndices.add(index);
        }
      }
    });
  }

  /** Updates visible gunseller tables and spawns gunsellers. */
  updateVisibleGunsellerTables(): void {
    const renderDistance = 12;
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;

    this.gameState.gunsellerTableCoordinates.forEach((table, index) => {
      if (!this._processedGunsellerIndices.has(index)) {
        const dx = table.x - playerX;
        const dy = table.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= renderDistance) {
          this.spawnNpc({
            type: 'gunSeller',
            name: 'Gun Trader',
            x: table.x,
            y: table.y,
            direction: 'right',
            animationFrame: 0,
            health: 100
          });
          this._processedGunsellerIndices.add(index);
        }
      }
    });
  }

  // --- Smuggler State Machine ---

  /** Updates the behavior of smuggler NPCs based on their state machine. */
  private updateSmugglerBehavior(npc: NPC): void {
    const tileX = Math.floor(npc.x);
    const tileY = Math.floor(npc.y);
    if (tileX < 0 || tileX >= this.gameState.worldSize || tileY < 0 || tileY >= this.gameState.worldSize) return;

    const data: SmugglerData = npc.smugglerData || (npc.smugglerData = { inventory: { tobacco: 0 }, ammo: 0, transformedCount: 0 });
    if (data.inventory.tobacco >= 50) {
      if (!(npc.smugglerState instanceof TradingState) &&
          !(npc.smugglerState instanceof GunsellerTradingState) &&
          !(npc.smugglerState instanceof CombatState)) {
        npc.smugglerState = new TradingState();
        console.log("Smuggler has 50 tobacco; transitioning to TradingState.");
      }
      npc.smugglerState.update(npc, this, data);
      return;
    }
    npc.smugglerState = npc.smugglerState || new GrassToFarmlandState();
    npc.smugglerState.update(npc, this, data);
  }

  // --- Helper Methods ---

  /** Finds the nearest tile matching a predicate using A* pathfinding. */
  public findNearestTile(startX: number, startY: number, worldSize: number, predicate: (tile: any) => boolean): { x: number; y: number } | null {
    const maxRadius = 15;
    interface Node { x: number; y: number; dist: number; }
    const queue: Node[] = [];
    const visited: boolean[][] = Array.from({ length: worldSize }, () => []);
    queue.push({ x: startX, y: startY, dist: 0 });
    visited[startY][startX] = true;
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node.dist > maxRadius) break;
      if (node.dist > 0 && predicate(this.gameState.map[node.y][node.x])) {
        return { x: node.x, y: node.y };
      }
      const moves = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];
      for (const move of moves) {
        const nx = node.x + move.dx;
        const ny = node.y + move.dy;
        if (nx < 0 || ny < 0 || nx >= worldSize || ny >= worldSize) continue;
        if (visited[ny][nx]) continue;
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: node.dist + 1 });
      }
    }
    return null;
  }

  /** Moves an NPC along a path to a target using A* pathfinding. */
  public moveNPCAlongPath(npc: NPC, startX: number, startY: number, target: { x: number; y: number }): void {
    const worldSize = this.gameState.worldSize;
    interface Node { x: number; y: number; dist: number; }
    const queue: Node[] = [];
    const visited: boolean[][] = Array.from({ length: worldSize }, () => []);
    queue.push({ x: startX, y: startY, dist: 0 });
    visited[startY][startX] = true;
    const parent: { [key: string]: { x: number; y: number } } = {};
    let found = false;
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node.x === target.x && node.y === target.y) {
        found = true;
        break;
      }
      const moves = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];
      for (const move of moves) {
        const nx = node.x + move.dx;
        const ny = node.y + move.dy;
        if (nx < 0 || ny < 0 || nx >= worldSize || ny >= worldSize) continue;
        if (visited[ny][nx]) continue;
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: node.dist + 1 });
        parent[`${nx},${ny}`] = { x: node.x, y: node.y };
      }
    }
    if (!found) return;
    const path: { x: number; y: number }[] = [];
    let curKey = `${target.x},${target.y}`;
    path.push(target);
    while (curKey !== `${startX},${startY}`) {
      const p = parent[curKey];
      if (!p) break;
      path.push(p);
      curKey = `${p.x},${p.y}`;
    }
    path.reverse();
    if (path.length >= 2) {
      const nextStep = path[1];
      npc.x = nextStep.x + 0.5;
      npc.y = nextStep.y + 0.5;
      const dx = nextStep.x - startX;
      const dy = nextStep.y - startY;
      npc.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
  }

  /** Moves an NPC randomly to a valid adjacent tile. */
  public moveRandomly(npc: NPC, tileX: number, tileY: number, worldSize: number): void {
    const validMoves = [
      { dx: 0, dy: -1, dir: 'up' as const },
      { dx: 0, dy: 1, dir: 'down' as const },
      { dx: -1, dy: 0, dir: 'left' as const },
      { dx: 1, dy: 0, dir: 'right' as const }
    ].filter(move => {
      const nx = tileX + move.dx;
      const ny = tileY + move.dy;
      return nx >= 0 && nx < worldSize && ny >= 0 && ny < worldSize;
    });
    if (validMoves.length > 0) {
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      const newX = tileX + randomMove.dx;
      const newY = tileY + randomMove.dy;
      npc.x = newX + 0.5;
      npc.y = newY + 0.5;
      npc.direction = randomMove.dir;
    }
  }

  // --- Smuggler State Machine Implementations ---

  // State 1: Convert up to 10 grass tiles to farmland.
  }

  export { CombatState };

  class GrassToFarmlandState implements SmugglerState {
    name = 'grass-to-farmland';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      const tileX = Math.floor(npc.x);
      const tileY = Math.floor(npc.y);
      const currentTile = service.gameState.map[tileY][tileX];
      if (currentTile.type === 'grass') {
        service.gameState.map[tileY][tileX] = { type: 'farmland', growthStage: 0 };
        data.transformedCount++;
        console.log(`Smuggler transformed grass at (${tileX}, ${tileY}) to farmland. Count: ${data.transformedCount}`);
        if (data.transformedCount >= 10) {
          npc.smugglerState = new FarmlandToTobaccoState();
          data.transformedCount = 0;
          console.log("Maximum 10 tiles reached; switching phase to farmland-to-tobacco.");
        }
        return;
      }
      const targetGrass = service.findNearestTile(tileX, tileY, service.gameState.worldSize, tile => tile.type === 'grass');
      if (targetGrass) {
        service.moveNPCAlongPath(npc, tileX, tileY, targetGrass);
      } else {
        service.moveRandomly(npc, tileX, tileY, service.gameState.worldSize);
      }
    }
  }

  // State 2: Plant tobacco on farmland tiles.
  class FarmlandToTobaccoState implements SmugglerState {
    name = 'farmland-to-tobacco';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      const tileX = Math.floor(npc.x);
      const tileY = Math.floor(npc.y);
      const currentTile = service.gameState.map[tileY][tileX];
      const grownTobacco = service.findNearestTile(tileX, tileY, service.gameState.worldSize, tile => tile.type === 'tobacco-3');
      if (grownTobacco) {
        data.targetTobacco = grownTobacco;
        npc.smugglerState = new HarvestingState();
        console.log(`Detected fully grown tobacco at (${grownTobacco.x}, ${grownTobacco.y}); switching to harvesting.`);
        return;
      }
      if (currentTile.type === 'farmland') {
        service.gameState.map[tileY][tileX] = { type: 'tobacco-1', growthStage: 1 };
        console.log(`Smuggler planted tobacco at (${tileX}, ${tileY}).`);
        setTimeout(() => {
          if (service.gameState.map[tileY] && service.gameState.map[tileY][tileX].type === 'tobacco-1') {
            service.gameState.map[tileY][tileX] = { type: 'tobacco-2', growthStage: 2 };
            console.log(`Tobacco at (${tileX}, ${tileY}) grew to tobacco-2.`);
          }
        }, 10000);
        setTimeout(() => {
          if (service.gameState.map[tileY] && service.gameState.map[tileY][tileX].type === 'tobacco-2') {
            service.gameState.map[tileY][tileX] = { type: 'tobacco-3', growthStage: 3 };
            console.log(`Tobacco at (${tileX}, ${tileY}) grew to tobacco-3.`);
          }
        }, 20000);
        return;
      }
      const targetFarmland = service.findNearestTile(tileX, tileY, service.gameState.worldSize, tile => tile.type === 'farmland');
      if (targetFarmland) {
        service.moveNPCAlongPath(npc, tileX, tileY, targetFarmland);
      } else {
        service.moveRandomly(npc, tileX, tileY, service.gameState.worldSize);
      }
    }
  }

  // State 3: Harvest tobacco from fully grown tobacco tiles.
  class HarvestingState implements SmugglerState {
    name = 'harvesting';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      const tileX = Math.floor(npc.x);
      const tileY = Math.floor(npc.y);
      const currentTile = service.gameState.map[tileY][tileX];
      if (currentTile.type === 'tobacco-3') {
        const yieldAmount = Math.floor(Math.random() * 3) + 3; // 3–5 tobacco
        data.inventory.tobacco += yieldAmount;
        console.log(`Smuggler harvested ${yieldAmount} tobacco at (${tileX}, ${tileY}). Total: ${data.inventory.tobacco}`);
        service.gameState.map[tileY][tileX] = { type: 'farmland', growthStage: 0 };
        if (data.inventory.tobacco < 50) {
          npc.smugglerState = new FarmlandToTobaccoState();
        } else {
          npc.smugglerState = new TradingState();
          console.log("Smuggler reached 50 tobacco; transitioning to TradingState.");
        }
        return;
      }
      const target = service.findNearestTile(tileX, tileY, service.gameState.worldSize, tile => tile.type === 'tobacco-3');
      if (target) {
        data.targetTobacco = target;
        service.moveNPCAlongPath(npc, tileX, tileY, target);
      } else {
        npc.smugglerState = new FarmlandToTobaccoState();
        console.log("No fully grown tobacco found; resuming replanting.");
      }
    }
  }

  // State 4: Trade tobacco for coins with a villager.
  class TradingState implements SmugglerState {
    name = 'trading';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      const searchRadius = 75;
      const smugglerX = npc.x;
      const smugglerY = npc.y;
      let targetVillager: NPC | null = null;
      for (const other of service.npcs) {
        if (other.type === 'villager' && other.id !== npc.id) {
          const dx = other.x - smugglerX;
          const dy = other.y - smugglerY;
          if (Math.sqrt(dx * dx + dy * dy) <= searchRadius) {
            targetVillager = other;
            break;
          }
        }
      }
      if (!targetVillager) {
        console.log("No villager found for trading. Scanning...");
        service.moveRandomly(npc, Math.floor(smugglerX), Math.floor(smugglerY), service.gameState.worldSize);
        return;
      }
      const dx = targetVillager.x - smugglerX;
      const dy = targetVillager.y - smugglerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const tradeThreshold = 1.0;
      if (distance > tradeThreshold) {
        service.moveNPCAlongPath(npc, Math.floor(smugglerX), Math.floor(smugglerY), { x: Math.floor(targetVillager.x), y: Math.floor(targetVillager.y) });
        console.log("Approaching villager for trade...");
        return;
      }
      let totalCoins = 0;
      for (let i = 0; i < data.inventory.tobacco; i++) {
        totalCoins += Math.floor(Math.random() * 3) + 3; // 3–5 coins per tobacco
      }
      console.log(`Traded ${data.inventory.tobacco} tobacco for ${totalCoins} coins.`);
      service.gameState.player.money += totalCoins;
      data.inventory.tobacco = 0;
      npc.smugglerState = new GunsellerTradingState();
    }
  }

  // State 5: Trade coins for ammo with a gunseller.
  class GunsellerTradingState implements SmugglerState {
    name = 'gunseller-trading';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      const searchRadius = 75;
      const smugglerX = npc.x;
      const smugglerY = npc.y;
      let targetGunseller: NPC | null = null;
      for (const other of service.npcs) {
        if (other.type === 'gunSeller' && other.id !== npc.id) {
          const dx = other.x - smugglerX;
          const dy = other.y - smugglerY;
          if (Math.sqrt(dx * dx + dy * dy) <= searchRadius) {
            targetGunseller = other;
            break;
          }
        }
      }
      if (!targetGunseller) {
        console.log("No gunseller found for trading. Scanning...");
        service.moveRandomly(npc, Math.floor(smugglerX), Math.floor(smugglerY), service.gameState.worldSize);
        return;
      }
      const dx = targetGunseller.x - smugglerX;
      const dy = targetGunseller.y - smugglerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const tradeThreshold = 1.0;
      if (distance > tradeThreshold) {
        service.moveNPCAlongPath(npc, Math.floor(smugglerX), Math.floor(smugglerY), { x: Math.floor(targetGunseller.x), y: Math.floor(targetGunseller.y) });
        console.log("Approaching gunseller for trade...");
        return;
      }
      const coins = service.gameState.player.money;
      if (coins <= 0) {
        console.log("No coins to trade for ammo. Returning to farming cycle.");
        npc.smugglerState = new GrassToFarmlandState();
        return;
      }
      let totalAmmo = 0;
      for (let i = 0; i < coins; i++) {
        totalAmmo += Math.floor(Math.random() * 3) + 3; // 3–5 ammo per coin
      }
      console.log(`Traded ${coins} coins for ${totalAmmo} ammo.`);
      data.ammo += totalAmmo;
      service.gameState.player.money = 0;
      if (data.ammo >= 300) {
        npc.smugglerState = new CombatState();
        console.log("Smuggler now has at least 300 ammo; transitioning to CombatState.");
      } else {
        npc.smugglerState = new GrassToFarmlandState();
      }
    }
  }

  // State 6: Combat state where the smuggler attacks the player with ≥300 ammo.
  class CombatState implements SmugglerState {
    name = 'combat';

    update(npc: NPC, service: NpcService, data: SmugglerData): void {
      if (data.ammo < 300) {
        console.log("Ammo dropped below 300; returning to farming cycle.");
        npc.smugglerState = new GrassToFarmlandState();
        return;
      }
      const playerX = service.gameState.player.x;
      const playerY = service.gameState.player.y;
      const dx = playerX - npc.x;
      const dy = playerY - npc.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const approachThreshold = 3;
      if (distance > approachThreshold) {
        service.moveNPCAlongPath(npc, Math.floor(npc.x), Math.floor(npc.y), {
          x: Math.floor(playerX),
          y: Math.floor(playerY)
        });
        console.log("Smuggler moving towards player for combat.");
      } else {
        npc.direction = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
        console.log("Smuggler fires his AK at the player!");
        data.ammo--; // Consume one ammo per shot
        // Bullet spawning is handled by MapComponent's updateGameLoop
      }
    }
  }
