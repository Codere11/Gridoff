import { Injectable } from '@angular/core';
import { MapService } from './map.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  tileSize = 128;
  player = { x: 20, y: 20 };
  spriteFrame = 0;
  spritePosition = '0px 0px';
  lastDirection = 'right';

  constructor(private mapService: MapService) {} // ✅ Inject MapService

  currentWeapon: string | null = null;

  equipWeapon(weapon: string) {
    this.currentWeapon = weapon;
  }


  // --- Player Movement ---
  movePlayer(dx: number, dy: number) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    const targetTile = this.mapService.map[Math.floor(newY)][Math.floor(newX)];
    if (['tree-tile', 'house-1'].includes(targetTile.type)) { // 🚫 Hardcoded list
    return;
    }


    // ✅ Ensure player stays within world bounds
    if (newX >= 0 && newX < this.mapService.worldSize &&
        newY >= 0 && newY < this.mapService.worldSize) {
      
        this.player.x = newX;
        this.player.y = newY;
        this.updateAnimation(dx, dy); // ✅ Ensure animation updates correctly
    }
  }

  // --- Player Animation ---
  private updateAnimation(dx: number, dy: number) {
    this.spriteFrame = (this.spriteFrame + 1) % 2; // Toggle frames

    if (dx > 0) {  
      this.lastDirection = 'right';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dx < 0) {  
      this.lastDirection = 'left';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dy < 0) {  
      this.lastDirection = 'up';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    } else if (dy > 0) {  
      this.lastDirection = 'down';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    }
  }

  // --- Get Player Style ---
  getPlayerStyle(cameraX: number, cameraY: number) {
    let sprite = this.currentWeapon === 'ak47' 
      ? "url('assets/sprites/player-ak47.png')" 
      : "url('assets/sprites/player-movement.png')";
  
    return {
      position: 'absolute',
      left: `${(this.player.x - cameraX) * this.tileSize}px`,
      top: `${(this.player.y - cameraY) * this.tileSize}px`,
      backgroundImage: sprite,
      backgroundSize: "256px 256px",
      backgroundPosition: this.spritePosition,
      width: "128px",
      height: "128px",
      zIndex: '100'
    };
  }
  
}
