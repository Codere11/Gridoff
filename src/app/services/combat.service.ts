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

@Injectable({
  providedIn: 'root'
})

export class CombatService {

  gameState = inject(GameStateService);

  bullets: Bullet[] = []
  enemies: { x: number, y: number, health: number }[] = [];

  constructor() {
    this.spawnEnemy(); // ✅ Spawn an enemy at start
  }

  // --- SPAWN AN ENEMY AT (5,5) ---
  spawnEnemy() {
    this.enemies.push({ x: 5, y: 5, health: 100 });
    console.log("👾 Enemy Spawned at (5,5):", this.enemies[0]);
  }

  // --- MOVE ENEMIES TOWARD PLAYER ---
  updateEnemies() {
    this.enemies.forEach(enemy => {
      if (enemy.x < 20) enemy.x += 0.1;
      if (enemy.x > 20) enemy.x -= 0.1;
      if (enemy.y < 20) enemy.y += 0.1;
      if (enemy.y > 20) enemy.y -= 0.1;
    });
  }

  // --- DAMAGE ENEMY ---
  damageEnemy(index: number, damage: number) {
    if (!this.enemies[index]) return;
  
    this.enemies[index].health -= damage;
    console.log(`💥 Enemy hit! Health: ${this.enemies[index].health}`);
  
    if (this.enemies[index].health <= 0) {
      console.log("💀 Enemy defeated!");
      this.enemies.splice(index, 1); // ✅ Remove dead enemy
    }
  }
  

  // --- FIRE A BULLET ---
  fireBullet() {
    if (!this.gameState.currentWeapon) {
      console.log("❌ No weapon equipped!");
      return;
    }
  
    const bullet: Bullet = {
      x: this.gameState.player.x,
      y: this.gameState.player.y,
      direction: this.gameState.lastDirection as 'right' | 'left' | 'up' | 'down',
      speed: 1, // Adjust speed if too slow
      damage: 30,
      lifetime: 50,
    };
  
    this.bullets.push(bullet);
    console.log("🔥 Bullet fired! Bullets now:", this.bullets);
  }
  

  // --- UPDATE BULLETS & CHECK COLLISIONS ---
  updateBullets() {
    if (this.bullets.length === 0) return;
  
    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      let bullet: Bullet = this.bullets[bulletIndex];
  
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
  
        if (Math.abs(enemy.x - bullet.x) < 1 && Math.abs(enemy.y - bullet.y) < 1) {
          console.log(`💥 Bullet hit enemy at (${enemy.x}, ${enemy.y})!`);
          this.damageEnemy(enemyIndex, bullet.damage);
          this.bullets.splice(bulletIndex, 1); // ✅ Remove bullet after impact
          break;
        }        
      }
  
      if (bullet.lifetime <= 0) {
        this.bullets.splice(bulletIndex, 1);
      }
      console.log(`🔄 Checking bullet at (${bullet.x}, ${bullet.y}) against enemies:`, this.enemies);
    }
  }
  
  
}
