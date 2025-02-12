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
    this.spawnEnemy();
  }

  spawnEnemy() {
    const x = Math.floor(Math.random() * this.gameState.worldSize);
    const y = Math.floor(Math.random() * this.gameState.worldSize);
    this.enemies.push({ x, y, health: 100 });
    console.log(`Enemy spawned at (${x}, ${y})`);
  }

  updateEnemies() {
    this.enemies.forEach(enemy => {
      if (enemy.x < this.gameState.player.x) enemy.x += 0.1;
      if (enemy.x > this.gameState.player.x) enemy.x -= 0.1;
      if (enemy.y < this.gameState.player.y) enemy.y += 0.1;
      if (enemy.y > this.gameState.player.y) enemy.y -= 0.1;
    });
  }

  damageEnemy(index: number, damage: number) {
    if (!this.enemies[index]) return;
    this.enemies[index].health -= damage;
    console.log(`Enemy hit! Health: ${this.enemies[index].health}`);
    if (this.enemies[index].health <= 0) {
      console.log("Enemy defeated!");
      this.enemies.splice(index, 1);
    }
  }

  fireBullet() {
    if (!this.gameState || !this.gameState.currentItem) {
      console.log("No weapon equipped!");
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
    console.log("Bullet fired!", bullet);
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      switch (bullet.direction) {
        case 'right': bullet.x += bullet.speed; break;
        case 'left': bullet.x -= bullet.speed; break;
        case 'up': bullet.y -= bullet.speed; break;
        case 'down': bullet.y += bullet.speed; break;
      }
      bullet.lifetime--;
      // Check collisions with enemies.
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (Math.abs(enemy.x - bullet.x) < 0.5 && Math.abs(enemy.y - bullet.y) < 0.5) {
          console.log(`Bullet hit enemy at (${enemy.x}, ${enemy.y})`);
          this.damageEnemy(j, bullet.damage);
          this.bullets.splice(i, 1);
          break;
        }
      }
      if (bullet.lifetime <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  checkPlayerDamage() {
    this.enemies.forEach(enemy => {
      if (Math.abs(this.gameState.player.x - enemy.x) < 1 &&
          Math.abs(this.gameState.player.y - enemy.y) < 1) {
        console.log("Player hit by an enemy!");
        this.gameState.player.health -= 10;
      }
    });
  }
}
