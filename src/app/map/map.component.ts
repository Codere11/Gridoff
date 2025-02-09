import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { Bullet } from '../services/combat.service';
import { InventoryService } from '../services/inventory.service';
import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';

interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
}

interface InventorySlot {
  id: number;
  item: Item | null;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, DragDropModule],
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

  inventorySlots = this.gameState.inventorySlots;


  // ✅ Expose missing properties from GameStateService
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.gameState.inventorySlots; }

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
      case 'f': 
        this.combatService.fireBullet(); // ✅ Fix Bullet Firing
        this.gameState.updatePlayerAnimation(0, 0, true); // ✅ Shooting animation
        return;
    }

    if(dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy)
    }
    this.updateCamera();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const tileX = Math.floor((event.clientX / this.tileSize) + this.cameraX);
    const tileY = Math.floor((event.clientY / this.tileSize) + this.cameraY);

    if(this.gameState.currentItem === 'ak47') {
      this.combatService.fireBullet()
    } else {
      this.gameState.interactWithTile(tileX, tileY);
    } 
  }


  updateCamera() {
    this.cameraX = Math.max(0, Math.min(this.gameState.worldSize - this.visibleTilesX, 
        Math.round(this.gameState.player.x - this.visibleTilesX / 2)));
    this.cameraY = Math.max(0, Math.min(this.gameState.worldSize - this.visibleTilesY, 
        Math.round(this.gameState.player.y - this.visibleTilesY / 2)));
  }

  updateGameLoop() {
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

  equipItem(item: any | null) {
    if (item && item.type) {
      this.gameState.equipItem(item.type);
    }
  }
  
  selectedSlotIndex: number | null = null; // Track selected item slot

  handleItemClick(index: number) {
    const selectedSlot = this.inventorySlots[this.selectedSlotIndex ?? -1];
    const clickedSlot = this.inventorySlots[index];

    // Clicking an occupied slot first selects it
    if (this.selectedSlotIndex === null && clickedSlot.item) {
      this.selectedSlotIndex = index;
      return;
    }

    // Clicking an empty slot moves the item
    if (this.selectedSlotIndex !== null && !clickedSlot.item) {
      this.inventorySlots[index].item = selectedSlot.item; // Move item to new slot
      this.inventorySlots[this.selectedSlotIndex].item = null; // Clear original slot
      this.selectedSlotIndex = null; // Deselect
      return;
    }

    // Clicking another occupied slot swaps the items
    if (this.selectedSlotIndex !== null && clickedSlot.item) {
      const temp = clickedSlot.item;
      this.inventorySlots[index].item = selectedSlot.item;
      this.inventorySlots[this.selectedSlotIndex].item = temp;
      this.selectedSlotIndex = null; // Deselect
      return;
    }

    // Clicking the same slot again deselects it
    if (this.selectedSlotIndex === index) {
      this.selectedSlotIndex = null;
    }
  }
  

  

}
