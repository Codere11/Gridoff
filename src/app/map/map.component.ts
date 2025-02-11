import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { InventoryService } from '../services/inventory.service';

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
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  gameState = inject(GameStateService);
  combatService = inject(CombatService);
  inventoryService = inject(InventoryService);

  tileSize = 128;
  cameraX = 0;
  cameraY = 0;
  visibleTilesX = 0;
  visibleTilesY = 0;

  // Reference to the inventory (for convenience)
  inventorySlots = this.inventoryService.inventorySlots;
  inventoryOpen: boolean = false;

  // --- Manual Drag & Drop Properties ---
  // The index of the slot currently being dragged, or null if not dragging.
  draggingSlot: number | null = null;
  // CSS style object for positioning the ghost element that follows the cursor.
  dragGhostStyle: { [key: string]: string } = {};
  // Offsets so that the ghost element stays aligned with the mouse pointer.
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  // Expose some GameState properties to the template.
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.inventoryService.inventorySlots; }

  ngOnInit() {
    this.updateCamera();
    this.setVisibleTiles();
    this.updateGameLoop(); // Start the game loop.
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
        this.combatService.fireBullet();
        this.gameState.updatePlayerAnimation(0, 0, true);
        return;
      case 'e': 
        this.toggleInventory();
        break;
    }
    if(dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy);
    }
    this.updateCamera();
  }

  // Remove the CDK onDrop handler completely.

  // trackBy function for ngFor to optimize rendering.
  trackBySlot(index: number, slot: any): number {
    return slot.id;
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const tileX = Math.floor((event.clientX / this.tileSize) + this.cameraX);
    const tileY = Math.floor((event.clientY / this.tileSize) + this.cameraY);

    if (this.gameState.currentItem === 'ak47') {
      this.combatService.fireBullet();
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
    this.combatService.updateBullets();
    this.combatService.updateEnemies();
    requestAnimationFrame(() => this.updateGameLoop());
  }

  getBulletStyle(bullet: any) {
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
  
  selectedSlotIndex: number | null = null;
  handleItemClick(index: number) {
    console.log(`Clicked slot: ${index}, Selected slot: ${this.selectedSlotIndex}`);
    const clickedSlot = this.inventoryService.inventorySlots[index];

    // If no slot is selected yet and the clicked slot has an item, select it.
    if (this.selectedSlotIndex === null && clickedSlot.item) {
      this.selectedSlotIndex = index;
      console.log(`Selected item at slot: ${index}`);
      return;
    }

    // Clicking the same slot again deselects it.
    if (this.selectedSlotIndex === index) {
      this.selectedSlotIndex = null;
      console.log("Deselected item.");
      return;
    }

    // If another slot is selected, swap or move items.
    if (this.selectedSlotIndex !== null) {
      const selectedSlot = this.inventoryService.inventorySlots[this.selectedSlotIndex];
      if (!clickedSlot.item) {
        clickedSlot.item = selectedSlot.item;
        selectedSlot.item = null;
      } else {
        [selectedSlot.item, clickedSlot.item] = [clickedSlot.item, selectedSlot.item];
      }
      this.selectedSlotIndex = null;
      // Trigger Angular change detection.
      this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      console.log("Swap successful!");
    }
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      this.inventoryService.expandInventory(30); // Adds 30 slots.
    } else {
      this.inventoryService.resetInventory(); // Resets to base slots.
    }
  }

  // --- Manual Drag and Drop Implementation ---
  // Called when the user presses the mouse button on an inventory slot.
  onMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault(); // Prevent text selection.
    this.draggingSlot = index;
    // Get the bounding rectangle of the clicked element.
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Save the offset of the mouse pointer within the slot.
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    // Initialize the ghost element's style.
    this.dragGhostStyle = {
      position: 'fixed',
      left: `${event.clientX - this.dragOffsetX}px`,
      top: `${event.clientY - this.dragOffsetY}px`,
      pointerEvents: 'none',
      opacity: '0.8',
      zIndex: '1000'
    };
  }

  // Listen for mousemove events to reposition the ghost element.
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.draggingSlot !== null) {
      this.dragGhostStyle['left'] = `${event.clientX - this.dragOffsetX}px`;
      this.dragGhostStyle['top'] = `${event.clientY - this.dragOffsetY}px`;
    }
  }

  // When the mouse button is released, perform the drop logic.
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.draggingSlot === null) {
      return;
    }

    // Determine the drop target using document.elementFromPoint.
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    let targetIndex: number | null = null;
    if (dropTarget) {
      // Look for the closest parent with the class "inventory-slot"
      const slotElem = (dropTarget as HTMLElement).closest('.inventory-slot');
      if (slotElem && slotElem.hasAttribute('data-index')) {
        targetIndex = parseInt(slotElem.getAttribute('data-index')!, 10);
      }
    }

    // If a valid target is found and it’s not the same as the dragged slot, swap them.
    if (targetIndex !== null && targetIndex !== this.draggingSlot) {
      const slots = this.inventoryService.inventorySlots;
      const temp = slots[this.draggingSlot];
      slots[this.draggingSlot] = slots[targetIndex];
      slots[targetIndex] = temp;
      // Trigger change detection.
      this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
    }
    // Reset the dragging state.
    this.draggingSlot = null;
  }
}
