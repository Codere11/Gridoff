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

  constructor() {
    // For now, spawn a basic NPC (villager) that wanders near the player
    this.spawnNpc({ type: 'villager', name: 'Villager' });
  }

  spawnNpc(initial: Partial<NPC>) {
    const playerX = 20; // For testing, use the player’s starting x (or retrieve from GameStateService)
    const playerY = 20; // For testing, use the player’s starting y (or retrieve from GameStateService)
    const npc: NPC = {
      id: Date.now(),
      type: initial.type || 'villager',
      // Spawn within ±1 unit around the player:
      x: playerX + (Math.random() * 2 - 1), // Range: 19 to 21
      y: playerY + (Math.random() * 2 - 1), // Range: 19 to 21
      direction: 'right',
      animationFrame: 0,
      health: initial.health ?? 100,
      ...initial
    };
    this.npcs.push(npc);
    console.log('NPC spawned:', npc);
  }

  updateNpcs(): void {
    // Increment the frame counter on each update call.
    this._frameCounter++;
    // Update movement only every 60 frames (adjust this frequency as needed).
    if (this._frameCounter % 60 !== 0) {
      return;
    }
    
    // Define possible directions (including a "none" option for a pause).
    const directions = ['left', 'right', 'up', 'down', 'none'];
    const movement = 0.5; // Larger step for visible movement

    this.npcs.forEach(npc => {
      // Randomly pick one direction.
      const chosenDirection = directions[Math.floor(Math.random() * directions.length)];

      // Compute candidate new coordinates
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
      
      // Check the target tile based on candidate coordinates.
      // Using Math.floor to convert world coordinates to tile indices.
      const targetTile = this.gameState.map[Math.floor(candidateY)]?.[Math.floor(candidateX)];
      // Define non-walkable tile types
      const nonWalkable = ['tree-tile', 'house-1'];
      
      if (!targetTile || nonWalkable.includes(targetTile.type)) {
        // Movement blocked; you might log this if desired.
        console.log(`NPC movement blocked by tile: ${targetTile?.type}`);
        return; // Skip moving this NPC.
      }
      
      // Otherwise, update NPC's position and direction.
      npc.x = candidateX;
      npc.y = candidateY;
      // Only update the direction if a movement occurred.
      if (chosenDirection !== 'none') {
        npc.direction = chosenDirection as 'left' | 'right' | 'up' | 'down';
        // For up or down, alternate the animation frame.
        if (chosenDirection === 'up' || chosenDirection === 'down') {
          npc.animationFrame = npc.animationFrame === 0 ? 1 : 0;
        }
      }
    });
  }
}
