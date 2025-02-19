import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';

export type NpcType = 'villager' | 'seller' | 'gunSeller' | 'enemy' | 'smuggler'; // Extend as needed

export interface NPC {
  id: number;
  type: NpcType;
  name?: string;
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down';
  animationFrame: number; // For example, 0 or 1 for walking up animation
  health?: number; // Optional: only for NPCs that have health
}

@Injectable({
  providedIn: 'root'
})
export class NpcService {
  npcs: NPC[] = [];
  private _frameCounter: number = 0;
  // Inject GameStateService to access the map
  private gameState = inject(GameStateService);
  private _processedHouseIndices: Set<number> = new Set<number>();
  private _processedGunsellerIndices: Set<number> = new Set<number>();
  constructor() {
    const playerX = 20; // or retrieve from GameStateService.player.x if available
    const playerY = 20; // or retrieve from GameStateService.player.y if available
    this.spawnNpc({
      type: 'smuggler',
      name: 'Smuggler',
      x: playerX + 1,  // Spawns one tile to the right of the player
      y: playerY,
      direction: 'left',
      animationFrame: 0,
      health: 100
    });;}

  spawnVillagersForHouses(): void {
    // Loop through each house coordinate
    this.gameState.houseCoordinates.forEach((coord, index) => {
      // Only spawn a villager for every 10th house
      if (index % 10 === 0) {
        // Optionally, add a slight offset if desired:
        const offsetX = 0.0; 
        const offsetY = 0.0;
        this.spawnNpc({
          type: 'villager',
          name: 'Villager',
          x: coord.x + offsetX,
          y: coord.y + offsetY,
          direction: 'right',
          animationFrame: 0,
          health: 100
        });
      }
    });
  }
  

  spawnNpc(initial: Partial<NPC>): void {
    const npc: NPC = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: initial.type || 'villager',
      name: initial.name,
      x: initial.x ?? 20,
      y: initial.y ?? 20,
      direction: initial.direction || 'right',
      animationFrame: initial.animationFrame ?? 0,
      health: initial.health ?? 100,
      ...initial
    };
    this.npcs.push(npc);
    console.log('NPC spawned:', npc);
  }

  updateNpcs(): void {
    // Increment the frame counter on each update call.
    this._frameCounter++;
    // Only update NPCs every 100 frames for testing:
    if (this._frameCounter % 35 !== 0) {
      return;
    }
    
    // Define possible directions (including a "none" option for a pause).
    const directions = ['left', 'right', 'up', 'down', 'none'];
    const movement = 0.5; // Larger step for visible movement
  
    this.npcs.forEach(npc => {
      if (npc.type === 'smuggler') {
        // For smugglers, run their own behavior update (e.g., transform grass to farmland)
        this.updateSmugglerBehavior(npc);
        // You can also add movement logic for the smuggler here if desired.
      } else {
        // Generic movement for other NPCs
        const chosenDirection = directions[Math.floor(Math.random() * directions.length)];
        let candidateX = npc.x;
        let candidateY = npc.y;
        switch(chosenDirection) {
          case 'left':
            candidateX = npc.x - movement;
            break;
          case 'right':
            candidateX = npc.x + movement;
            break;
          case 'up':
            candidateY = npc.y - movement;
            break;
          case 'down':
            candidateY = npc.y + movement;
            break;
          case 'none':
            // Do nothing if 'none' is chosen.
            break;
        }
        const targetTile = this.gameState.map[Math.floor(candidateY)]?.[Math.floor(candidateX)];
        const nonWalkable = ['tree-tile', 'house-1'];
        if (!targetTile || nonWalkable.includes(targetTile.type)) {
          console.log(`NPC movement blocked by tile: ${targetTile?.type}`);
          return;
        }
        npc.x = candidateX;
        npc.y = candidateY;
        if (chosenDirection !== 'none') {
          npc.direction = chosenDirection as 'left' | 'right' | 'up' | 'down';
          if (chosenDirection === 'up' || chosenDirection === 'down') {
            npc.animationFrame = npc.animationFrame === 0 ? 1 : 0;
          }
        }
      }
    });
  }
  

  updateVisibleNPCs(): void {
    const renderDistance = 10; // Adjust as needed.
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;
  
    // Loop over the houseCoordinates array.
    // To avoid spawning repeatedly, maintain a set of processed houses.
    if (!this._processedHouseIndices) {
      this._processedHouseIndices = new Set<number>();
    }
    
    this.gameState.houseCoordinates.forEach((house, index) => {
      // Only consider every 10th house.
      if (index % 10 !== 0) {
        return;
      }
      // Skip if we already spawned an NPC for this house.
      if (this._processedHouseIndices.has(index)) {
        return;
      }
  
      // Check if the house is within render distance.
      const dx = house.x - playerX;
      const dy = house.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= renderDistance) {
        // Check if a villager is already spawned near this house.
        const alreadySpawned = this.npcs.some(npc =>
          npc.type === 'villager' &&
          Math.abs(npc.x - house.x) < 0.5 &&
          Math.abs(npc.y - house.y) < 0.5
        );
        if (!alreadySpawned) {
          // Spawn the villager.
          this.spawnNpc({
            type: 'villager',
            name: 'Villager',
            x: house.x,
            y: house.y,
            direction: 'right',
            animationFrame: 0,
            health: 100
          });
          // Mark this house index as processed so we don’t spawn again.
          this._processedHouseIndices.add(index);
        }
      }
    });
  }

  spawnGunsellersForTables(): void {
    const gameState = this.gameState;
    if (gameState.gunsellerTableCoordinates && gameState.gunsellerTableCoordinates.length > 0) {
      gameState.gunsellerTableCoordinates.forEach(coord => {
        if (Math.random() < 0.5) { // 50% chance to spawn a gun seller at this table
          this.spawnNpc({
            type: 'gunSeller',
            name: 'Gun Trader',
            x: coord.x,
            y: coord.y,
            direction: 'right',
            animationFrame: 0,
            health: 100
          });
        }
      });
    }
  }

  updateVisibleGunsellerTables(): void {
    const renderDistance = 12; // player's vision (e.g. 10) plus a small buffer
    const playerX = this.gameState.player.x;
    const playerY = this.gameState.player.y;
  
    // Loop through each gunseller table coordinate stored in GameStateService
    this.gameState.gunsellerTableCoordinates.forEach((table, index) => {
      // Skip if we've already processed this table
      if (this._processedGunsellerIndices.has(index)) {
        return;
      }
      // Calculate distance from the player to the table
      const dx = table.x - playerX;
      const dy = table.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      if (distance <= renderDistance) {
        // 50% chance to spawn a gun seller at this table
        if (Math.random() < 0.5) {
          this.spawnNpc({
            type: 'gunSeller',
            name: 'Gun Trader',
            x: table.x,
            y: table.y,
            direction: 'right',
            animationFrame: 0,
            health: 100
          });
        }
        // Mark this table as processed regardless
        this._processedGunsellerIndices.add(index);
      }
    });
  }

  private updateSmugglerBehavior(smuggler: NPC): void {
    const data = smuggler as any;
    const worldSize = this.gameState.worldSize;
    const tileX = Math.floor(smuggler.x);
    const tileY = Math.floor(smuggler.y);
    if (tileX < 0 || tileX >= worldSize || tileY < 0 || tileY >= worldSize) return;
    const currentTile = this.gameState.map[tileY][tileX];
  
    // Initialize custom properties if not already set.
    if (data.phase === undefined) {
      data.phase = 'grass-to-farmland';  // Start with planting: grass → farmland.
      data.transformedCount = 0;
      data.inventory = { tobacco: 0 };
    }
  
    // If he already has 50 tobacco, finish his cycle.
    if (data.inventory.tobacco >= 50) {
      data.phase = 'done';
      console.log("Smuggler has gathered 50 tobacco and stops planting/harvesting.");
      return;
    }
  
    // --- PHASE 1: Grass → Farmland ---
    if (data.phase === 'grass-to-farmland') {
      if (currentTile.type === 'grass') {
        this.gameState.map[tileY][tileX] = { type: 'farmland', growthStage: 0 };
        data.transformedCount++;
        console.log(`Smuggler transformed grass at (${tileX}, ${tileY}) to farmland. Count: ${data.transformedCount}`);
        if (data.transformedCount >= 10) {
          data.phase = 'farmland-to-tobacco';
          data.transformedCount = 0;
          console.log("Smuggler switching phase to farmland-to-tobacco.");
        }
        return;
      }
      const targetGrass = this.findNearestTile(tileX, tileY, worldSize, (tile) => tile.type === 'grass');
      if (targetGrass) {
        this.moveNPCAlongPath(smuggler, tileX, tileY, targetGrass);
        return;
      } else {
        this.moveRandomly(smuggler, tileX, tileY, worldSize);
        return;
      }
    }
    // --- PHASE 2: Farmland → Tobacco (Planting) ---
    else if (data.phase === 'farmland-to-tobacco') {
      // First, check if there is any fully grown tobacco nearby.
      const grown = this.findNearestTile(tileX, tileY, worldSize, (tile) => tile.type === 'tobacco-3');
      if (grown) {
        data.phase = 'harvesting';
        data.targetTobacco = grown;
        console.log(`Detected fully grown tobacco at (${grown.x}, ${grown.y}); switching to harvesting.`);
        // Fall through to harvesting below.
      } else {
        // If no fully grown tobacco is found, plant new tobacco.
        if (currentTile.type === 'farmland') {
          this.gameState.map[tileY][tileX] = { type: 'tobacco-1', growthStage: 1 };
          console.log(`Smuggler transformed farmland at (${tileX}, ${tileY}) to tobacco-1.`);
          setTimeout(() => {
            if (this.gameState.map[tileY] && this.gameState.map[tileY][tileX].type === 'tobacco-1') {
              this.gameState.map[tileY][tileX] = { type: 'tobacco-2', growthStage: 2 };
              console.log(`Tobacco at (${tileX}, ${tileY}) grew to tobacco-2.`);
            }
          }, 10000);
          setTimeout(() => {
            if (this.gameState.map[tileY] && this.gameState.map[tileY][tileX].type === 'tobacco-2') {
              this.gameState.map[tileY][tileX] = { type: 'tobacco-3', growthStage: 3 };
              console.log(`Tobacco at (${tileX}, ${tileY}) grew to tobacco-3.`);
            }
          }, 20000);
          return;
        }
        // If not on farmland, try to move to a nearby farmland tile.
        const targetFarmland = this.findNearestTile(tileX, tileY, worldSize, (tile) => tile.type === 'farmland');
        if (targetFarmland) {
          this.moveNPCAlongPath(smuggler, tileX, tileY, targetFarmland);
          return;
        } else {
          // If no farmland exists, force a switch to planting grass.
          data.phase = 'grass-to-farmland';
          console.log("No farmland found; switching back to grass-to-farmland.");
          return;
        }
      }
    }
    // --- PHASE 3: Harvesting Fully Grown Tobacco ---
    if (data.phase === 'harvesting') {
      if (currentTile.type === 'tobacco-3') {
        const yieldAmount = Math.floor(Math.random() * 3) + 3; // 3-5 per plant
        data.inventory.tobacco += yieldAmount;
        console.log(`Smuggler harvested ${yieldAmount} tobacco at (${tileX}, ${tileY}). Total: ${data.inventory.tobacco}`);
        // Reset the tile to farmland.
        this.gameState.map[tileY][tileX] = { type: 'farmland', growthStage: 0 };
        // After harvesting, if inventory is below 50, switch back to planting phase.
        if (data.inventory.tobacco < 50) {
          data.phase = 'farmland-to-tobacco';
        } else {
          data.phase = 'done';
          console.log("Smuggler has gathered 50 tobacco and ends the cycle.");
        }
        return;
      }
      const targetTobacco = this.findNearestTile(tileX, tileY, worldSize, (tile) => tile.type === 'tobacco-3');
      if (targetTobacco) {
        data.targetTobacco = targetTobacco;
        this.moveNPCAlongPath(smuggler, tileX, tileY, targetTobacco);
        return;
      } else {
        // If no fully grown tobacco is found, return to planting.
        data.phase = 'grass-to-farmland';
        console.log("No fully grown tobacco found; resuming planting.");
        return;
      }
    }
  }  
  
  private findNearestTile(startX: number, startY: number, worldSize: number, predicate: (tile: any) => boolean): { x: number; y: number } | null {
    const maxRadius = 15; // Increase if you want a wider search.
    interface Node { x: number; y: number; dist: number; }
    const queue: Node[] = [];
    const visited: boolean[][] = [];
    for (let i = 0; i < worldSize; i++) {
      visited[i] = [];
    }
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
  
  private moveNPCAlongPath(npc: NPC, startX: number, startY: number, target: { x: number; y: number }): void {
    const worldSize = this.gameState.worldSize;
    interface Node { x: number; y: number; dist: number; }
    const queue: Node[] = [];
    const visited: boolean[][] = [];
    for (let i = 0; i < worldSize; i++) {
      visited[i] = [];
    }
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
      console.log(`Smuggler moving toward target (${target.x}, ${target.y}). Next step: (${nextStep.x}, ${nextStep.y})`);
    }
  }
  
  private moveRandomly(npc: NPC, tileX: number, tileY: number, worldSize: number): void {
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
      console.log(`Smuggler moved randomly to (${newX}, ${newY})`);
    }
  }
  
}