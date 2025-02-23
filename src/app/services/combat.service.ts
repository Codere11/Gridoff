import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { NpcService, NPC } from './npc.service';

export interface Bullet {
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down';
  speed: number;
  damage: number;
  lifetime: number;
  origin: 'player' | 'npc';
}

@Injectable({
  providedIn: 'root'
})
export class CombatService {
  private gameState = inject(GameStateService);
  
  // We'll get the current NPC list from MapComponent via a setter to avoid circular dependencies.
  private npcList: NPC[] = [];

  public bullets: Bullet[] = [];

  // Called from MapComponent to update the current NPC list.
  setNpcs(npcs: NPC[]): void {
    this.npcList = npcs;
  }

  fireBullet(): void {
    if (!this.gameState.currentItem) {
      console.log("No weapon equipped!");
      return;
    }
    // Assume ammo removal logic is handled elsewhere
    const bullet: Bullet = {
      x: this.gameState.player.x,
      y: this.gameState.player.y,
      direction: this.gameState.lastDirection as 'left' | 'right' | 'up' | 'down',
      speed: 1.5,
      damage: 30,
      lifetime: 60,
      origin: 'player'
    };
    this.bullets.push(bullet);
    console.log("Player bullet fired:", bullet);
  }

  spawnBulletFromNpc(npc: NPC): void {
    const player = this.gameState.player;
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    
    let direction: 'left' | 'right' | 'up' | 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
    const bullet: Bullet = {
      x: npc.x,
      y: npc.y,
      direction: direction,
      speed: 1.5,
      damage: 30,
      lifetime: 60,
      origin: 'npc'
    };
    this.bullets.push(bullet);
    console.log("NPC bullet spawned:", bullet);
  }

  updateBullets(): void {
    const collisionThreshold = 0.5; // adjust as needed
    // Loop backwards so that splicing doesn't affect iteration.
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
  
      // Update bullet position.
      switch (bullet.direction) {
        case 'right': bullet.x += bullet.speed; break;
        case 'left': bullet.x -= bullet.speed; break;
        case 'up': bullet.y -= bullet.speed; break;
        case 'down': bullet.y += bullet.speed; break;
      }
      bullet.lifetime--;
  
      let bulletHit = false;
  
      // Check collision with the player.
      if (
        Math.abs(bullet.x - this.gameState.player.x) < collisionThreshold &&
        Math.abs(bullet.y - this.gameState.player.y) < collisionThreshold
      ) {
        this.gameState.player.health -= bullet.damage;
        console.log("Player hit by bullet! New health:", this.gameState.player.health);
        if (this.gameState.player.health <= 0) {
          alert("Game over");
        }
        bulletHit = true;
      }
  
      // Check collision with each NPC.
      // (Assuming `this.npcList` is updated via setNpcs() from MapComponent.)
      for (let j = this.npcList.length - 1; j >= 0; j--) {
        const npc = this.npcList[j];
        if (
          Math.abs(bullet.x - npc.x) < collisionThreshold &&
          Math.abs(bullet.y - npc.y) < collisionThreshold
        ) {
          npc.health = (npc.health || 100) - bullet.damage;
          console.log(`NPC (${npc.type}) hit by bullet! New health:`, npc.health);
          if (npc.health <= 0) {
            console.log(`NPC (${npc.type}) defeated!`);
            this.npcList.splice(j, 1);
          }
          bulletHit = true;
          break; // Stop checking after the bullet hits an NPC.
        }
      }
  
      if (bulletHit || bullet.lifetime <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }
  
  
}
