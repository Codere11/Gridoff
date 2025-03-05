import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { NpcService, NPC } from './npc.service';

/**
 * Represents a bullet in the game with properties and movement behavior.
 */
export class Bullet {
  /** X-coordinate of the bullet */
  x: number;
  /** Y-coordinate of the bullet */
  y: number;
  /** Direction the bullet is traveling */
  direction: 'left' | 'right' | 'up' | 'down';
  /** Speed of the bullet */
  speed: number;
  /** Damage the bullet inflicts */
  damage: number;
  /** Remaining frames before the bullet expires */
  lifetime: number;
  /** Origin of the bullet ('player' or 'npc') */
  origin: 'player' | 'npc';

  constructor(
    x: number,
    y: number,
    direction: 'left' | 'right' | 'up' | 'down',
    speed: number,
    damage: number,
    lifetime: number,
    origin: 'player' | 'npc'
  ) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.damage = damage;
    this.lifetime = lifetime;
    this.origin = origin;
  }

  /** Moves the bullet based on its direction and decreases its lifetime. */
  move(): void {
    switch (this.direction) {
      case 'right':
        this.x += this.speed;
        break;
      case 'left':
        this.x -= this.speed;
        break;
      case 'up':
        this.y -= this.speed;
        break;
      case 'down':
        this.y += this.speed;
        break;
    }
    this.lifetime--;
  }

  /** Checks if the bullet has expired based on its lifetime. */
  isExpired(): boolean {
    return this.lifetime <= 0;
  }
}

/**
 * Service responsible for managing combat mechanics, including bullet firing,
 * movement, and collision detection.
 */
@Injectable({
  providedIn: 'root'
})
export class CombatService {
  /** Injected GameStateService for accessing player data */
  private gameState = inject(GameStateService);
  /** List of NPCs in the game */
  private npcList: NPC[] = [];
  /** Array of active bullets */
  public bullets: Bullet[] = [];
  /** Distance threshold for collision detection */
  private collisionThreshold = 0.5;

  /**
   * Sets the current NPC list, typically received from MapComponent.
   * @param npcs Array of NPCs to set
   */
  setNpcs(npcs: NPC[]): void {
    this.npcList = npcs;
  }

  /**
   * Fires a bullet from the player's position if a weapon is equipped.
   * Assumes ammo removal logic is handled elsewhere (e.g., in GameStateService).
   */
  fireBullet(): void {
    if (!this.gameState.currentItem) {
      console.log("No weapon equipped!");
      return;
    }
    const bullet = new Bullet(
      this.gameState.player.x,
      this.gameState.player.y,
      this.gameState.lastDirection as 'left' | 'right' | 'up' | 'down',
      1.5, // Bullet speed
      30,  // Bullet damage
      60,  // Bullet lifetime (frames)
      'player'
    );
    this.bullets.push(bullet);
    console.log("Player bullet fired:", bullet);
  }

  /**
   * Spawns a bullet from an NPC directed toward the player's position.
   * @param npc The NPC firing the bullet
   */
  spawnBulletFromNpc(npc: NPC): void {
    const player = this.gameState.player;
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const direction = this.calculateDirection(dx, dy);
    const bullet = new Bullet(
      npc.x,
      npc.y,
      direction,
      1.5, // Bullet speed
      30,  // Bullet damage
      60,  // Bullet lifetime (frames)
      'npc'
    );
    this.bullets.push(bullet);
    console.log("NPC bullet spawned:", bullet);
  }

  /** Updates all bullets: moves them, checks collisions, and removes expired or collided bullets. */
  updateBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.move();

      if (this.handleCollisions(bullet) || bullet.isExpired()) {
        this.bullets.splice(i, 1);
      }
    }
  }

  // --- Private Helper Methods ---

  /**
   * Calculates the direction from a source to a target based on coordinate differences.
   * @param dx Difference in x-coordinates
   * @param dy Difference in y-coordinates
   * @returns The direction ('left', 'right', 'up', or 'down')
   */
  private calculateDirection(dx: number, dy: number): 'left' | 'right' | 'up' | 'down' {
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  /**
   * Checks for collisions with the player or NPCs and applies damage.
   * @param bullet The bullet to check for collisions
   * @returns True if a collision occurs, false otherwise
   */
  private handleCollisions(bullet: Bullet): boolean {
    // Check collision with player
    if (this.checkCollision(bullet, this.gameState.player)) {
      this.applyDamage(this.gameState.player, bullet.damage);
      console.log("Player hit by bullet! New health:", this.gameState.player.health);
      if (this.gameState.player.health <= 0) {
        alert("Game over");
      }
      return true;
    }

    // Check collision with NPCs
    for (let j = this.npcList.length - 1; j >= 0; j--) {
      const npc = this.npcList[j];
      if (this.checkCollision(bullet, npc)) {
        this.applyDamage(npc, bullet.damage);
        console.log(`NPC (${npc.type}) hit by bullet! New health:`, npc.health ?? 0); // Safely handle undefined
        if ((npc.health ?? 0) <= 0) {
          console.log(`NPC (${npc.type}) defeated!`);
          this.npcList.splice(j, 1);
        }
        return true; // Bullet hits only one target
      }
    }
    return false;
  }

  /**
   * Determines if a bullet collides with a target based on the collision threshold.
   * @param bullet The bullet to check
   * @param target The target object (player or NPC)
   * @returns True if a collision occurs, false otherwise
   */
  private checkCollision(bullet: Bullet, target: { x: number; y: number }): boolean {
    return (
      Math.abs(bullet.x - target.x) < this.collisionThreshold &&
      Math.abs(bullet.y - target.y) < this.collisionThreshold
    );
  }

  /**
   * Applies damage to a target, handling optional health with a default value.
   * @param target The object taking damage (player or NPC)
   * @param damage The amount of damage to apply
   */
  private applyDamage(target: { health?: number }, damage: number): void {
    // Use nullish coalescing to provide a default health of 100 if undefined
    target.health = Math.max(0, (target.health ?? 100) - damage);
  }
}