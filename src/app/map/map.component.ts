import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { Bullet } from '../services/combat.service';


@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  gameState = inject(GameStateService);
  combatService = inject(CombatService);

  tileSize = 128;
  cameraX = 0;
  cameraY = 0;
  visibleTilesX = 0;
  visibleTilesY = 0;


  // ✅ Expose missing properties from GameStateService
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.gameState.inventoryItems; }

  ngOnInit() {
    this.updateCamera();
    this.setVisibleTiles();
    this.updateGameLoop(); // ✅ Ensure game loop runs
  }

  @HostListener('window:resize')
  setVisibleTiles() {
    this.visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    this.visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case 'w': this.gameState.movePlayer(0, -0.5); break;
      case 's': this.gameState.movePlayer(0, 0.5); break;
      case 'a': this.gameState.movePlayer(-0.5, 0); break;
      case 'd': this.gameState.movePlayer(0.5, 0); break;
      case ' ': 
        console.log("🔫 Space Pressed: Shooting bullet...");
        this.combatService.fireBullet(); // ✅ Fix Bullet Firing
        this.gameState.updatePlayerAnimation(0, 0, true); // ✅ Shooting animation
        return;
    }

    if(dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy)
    }
    this.updateCamera();
  }

  @HostListener('window:mousedown', ['$event'])
  handleMouseDown(event: MouseEvent) {
  if (event.button === 0) { // Left mouse click
    console.log("🖱 Left Click: Shooting bullet...");
    
    this.combatService.fireBullet(); // ✅ Ensure bullets actually fire
    this.gameState.updatePlayerAnimation(0, 0, true); // ✅ Shooting animation

    // ✅ Prevents player direction from changing when shooting
    event.preventDefault();  
    }
  }


  updateCamera() {
    this.cameraX = Math.max(0, Math.min(this.gameState.worldSize - this.visibleTilesX, 
        Math.round(this.gameState.player.x - this.visibleTilesX / 2)));
    this.cameraY = Math.max(0, Math.min(this.gameState.worldSize - this.visibleTilesY, 
        Math.round(this.gameState.player.y - this.visibleTilesY / 2)));
  }

  updateGameLoop() {
    console.log("🎮 Game Loop Running!");
    this.combatService.updateBullets(); // ✅ Moves bullets
    this.combatService.updateEnemies(); // ✅ Moves enemies
    requestAnimationFrame(() => this.updateGameLoop()); // ✅ Loops every frame
  }

  // ✅ Fix Bullet Rendering
  getBulletStyle(bullet: Bullet) {
    return {
      position: 'absolute',
      left: `${(bullet.x - this.cameraX) * this.tileSize + this.tileSize / 2}px`,
      top: `${(bullet.y - this.cameraY) * this.tileSize + this.tileSize / 2}px`,
      width: "8px",
      height: "8px",
      backgroundColor: "black",
      borderRadius: "50%",
      zIndex: "110"
    };
  }
  

  getTileStyle(x: number, y: number) {
    return this.gameState.getTileStyle(x, y, this.cameraX, this.cameraY);
  }

  getPlayerStyle() {
    return this.gameState.getPlayerStyle(this.cameraX, this.cameraY);
  }

  getEnemyStyle(enemy: any) {
    return {
      position: 'absolute',
      left: `${(enemy.x - this.cameraX) * this.tileSize}px`,
      top: `${(enemy.y - this.cameraY) * this.tileSize}px`,
      width: "128px",
      height: "128px",
      backgroundImage: "url('assets/sprites/enemy.png')",
      backgroundSize: "cover",
      zIndex: '99'
    };
  }

  equipWeapon(weapon: string) {
    this.gameState.equipWeapon(weapon);
  }
}
