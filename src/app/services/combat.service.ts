import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';

export interface Bullet {
  x: number;
  y: number;
  direction: 'right' | 'left' | 'up' | 'down';
  speed: number;
  damage: number;
  lifetime: number;
}

export interface Enemy {
  x: number;
  y: number;
  health: number;
}

@Injectable({
  providedIn: 'root'
})
export class CombatService {
  private gameState = inject(GameStateService);

  bullets: Bullet[] = [];
  enemies: Enemy[] = [];

  constructor() {
    this.spawnEnemy(); // ✅ Spawns an enemy at start
  }

  // --- SPAWN AN ENEMY AT RANDOM LOCATION ---
  spawnEnemy() {
    if (!this.gameState) {
      console.error("❌ `gameState` is undefined in `spawnEnemy`.");
      return;
    }

    const x = Math.floor(Math.random() * this.gameState.worldSize);
    const y = Math.floor(Math.random() * this.gameState.worldSize);

    this.enemies.push({ x, y, health: 100 });
    console.log(`👾 Enemy Spawned at (${x}, ${y})`);
  }

  // --- MOVE ENEMIES TOWARD PLAYER ---
  updateEnemies() {
    if (!this.gameState || !this.gameState.player) return;

    this.enemies.forEach(enemy => {
      if (enemy.x < this.gameState.player.x) enemy.x += 0.1;
      if (enemy.x > this.gameState.player.x) enemy.x -= 0.1;
      if (enemy.y < this.gameState.player.y) enemy.y += 0.1;
      if (enemy.y > this.gameState.player.y) enemy.y -= 0.1;
    });
  }

  // --- DAMAGE ENEMY ---
  damageEnemy(index: number, damage: number) {
    if (!this.enemies[index]) return;

    this.enemies[index].health -= damage;
    console.log(`💥 Enemy hit! Health: ${this.enemies[index].health}`);

    if (this.enemies[index].health <= 0) {
      console.log("💀 Enemy defeated!");
      this.enemies.splice(index, 1);
    }
  }

  // --- FIRE A BULLET ---
  fireBullet() {
    if (!this.gameState || !this.gameState.currentItem) {
      console.log("❌ No weapon equipped!");
      return;
    }

    const bullet: Bullet = {
      x: this.gameState.player.x,
      y: this.gameState.player.y,
      direction: this.gameState.lastDirection as 'right' | 'left' | 'up' | 'down',
      speed: 1.5,
      damage: 30,
      lifetime: 60,
    };

    this.bullets.push(bullet);
    console.log("🔥 Bullet fired!", bullet);
  }

  // --- UPDATE BULLETS & CHECK COLLISIONS ---
  updateBullets() {
    if (!this.gameState) return;

    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      let bullet = this.bullets[bulletIndex];

      switch (bullet.direction) {
        case 'right': bullet.x += bullet.speed; break;
        case 'left': bullet.x -= bullet.speed; break;
        case 'up': bullet.y -= bullet.speed; break;
        case 'down': bullet.y += bullet.speed; break;
      }

      bullet.lifetime--;

      // ✅ Check if the bullet hits an enemy
      for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        let enemy = this.enemies[enemyIndex];

        if (Math.abs(enemy.x - bullet.x) < 0.5 && Math.abs(enemy.y - bullet.y) < 0.5) {
          console.log(`💥 Bullet hit enemy at (${enemy.x}, ${enemy.y})!`);
          this.damageEnemy(enemyIndex, bullet.damage);
          this.bullets.splice(bulletIndex, 1); // ✅ Remove bullet after impact
          break;
        }
      }

      // ✅ Remove bullet if lifetime is over
      if (bullet.lifetime <= 0) {
        this.bullets.splice(bulletIndex, 1);
      }
    }
  }

  // --- CHECK IF PLAYER TAKES DAMAGE ---
  checkPlayerDamage() {
    if (!this.gameState) return;

    this.enemies.forEach(enemy => {
      if (Math.abs(this.gameState.player.x - enemy.x) < 1 && Math.abs(this.gameState.player.y - enemy.y) < 1) {
        console.log("⚠️ Player hit by an enemy!");
        this.gameState.player.health -= 10;
      }
    });
  }
}