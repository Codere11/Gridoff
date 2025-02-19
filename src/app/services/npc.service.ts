import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';

export type NpcType = 'villager' | 'seller' | 'gunSeller' | 'enemy'; // Extend as needed

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
      type: 'gunSeller',
      name: 'Gun Trader',
      x: playerX,
      y: playerY,
      direction: 'right',
      animationFrame: 0,
      health: 100
    });}

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
    if (this._frameCounter % 100 !== 0) {
      return;
    }
    
    // Define possible directions (including a "none" option for a pause).
    const directions = ['left', 'right', 'up', 'down', 'none'];
    const movement = 0.5; // Larger step for visible movement
  
    this.npcs.forEach(npc => {
      // Randomly pick one direction.
      const chosenDirection = directions[Math.floor(Math.random() * directions.length)];
  
      // Compute candidate new coordinates.
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
      // Define non-walkable tile types.
      const nonWalkable = ['tree-tile', 'house-1'];
  
      if (!targetTile || nonWalkable.includes(targetTile.type)) {
        // Movement blocked; you might log this if desired.
        console.log(`NPC movement blocked by tile: ${targetTile?.type}`);
        return; // Skip moving this NPC.
      }
      
      // Update NPC's position and direction.
      npc.x = candidateX;
      npc.y = candidateY;
      
      if (chosenDirection !== 'none') {
        npc.direction = chosenDirection as 'left' | 'right' | 'up' | 'down';
        // Alternate the animation frame for vertical movement.
        if (chosenDirection === 'up' || chosenDirection === 'down') {
          npc.animationFrame = npc.animationFrame === 0 ? 1 : 0;
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
  
}