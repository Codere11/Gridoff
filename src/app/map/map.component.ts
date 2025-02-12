import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { InventoryService } from '../services/inventory.service';

// Interfaces for items, inventory slots, and the dragged stack.
interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
  stackable: boolean;
}

interface InventorySlot {
  id: number;
  item: Item | null;
  quantity: number;
}

interface DraggedStack {
  item: Item;
  quantity: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  // Injected services
  gameState = inject(GameStateService);
  combatService = inject(CombatService);
  inventoryService = inject(InventoryService);

  // Map and camera properties
  tileSize = 128;
  cameraX = 0;
  cameraY = 0;
  visibleTilesX = 0;
  visibleTilesY = 0;
  inventoryOpen: boolean = false;

  // Drag & Drop state
  draggedStack: DraggedStack | null = null;
  dragSourceIndex: number = -1; // Use -1 when no valid index
  // We'll use event.which: 1 = left-click, 3 = right-click.
  dragButton: number | null = null;
  dragGhostStyle: { [key: string]: string } = {};
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  // Exposed getters for template use.
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.inventoryService.inventorySlots; }

  // Flag for preventing duplicate drop processing if needed.
  private _processingDrop: boolean = false;

  // ---------------
  // Lifecycle Methods
  // ---------------
  ngOnInit() {
    this.updateCamera();
    this.setVisibleTiles();
    this.updateGameLoop();
  }

  @HostListener('window:resize')
  setVisibleTiles() {
    this.visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    this.visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    let dx = 0, dy = 0;
    switch (event.key) {
      case 'w': dx = 0; dy = -0.5; break;
      case 's': dx = 0; dy = 0.5; break;
      case 'a': dx = -0.5; dy = 0; break;
      case 'd': dx = 0.5; dy = 0; break;
      case 'f':
        this.combatService.fireBullet();
        this.gameState.updatePlayerAnimation(0, 0, true);
        return;
      case 'e':
        this.toggleInventory();
        break;
    }
    if (dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy);
    }
    this.updateCamera();
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

  // ---------------
  // Update Methods
  // ---------------
  updateCamera() {
    this.cameraX = Math.max(0, Math.min(
      this.gameState.worldSize - this.visibleTilesX,
      Math.round(this.gameState.player.x - this.visibleTilesX / 2)
    ));
    this.cameraY = Math.max(0, Math.min(
      this.gameState.worldSize - this.visibleTilesY,
      Math.round(this.gameState.player.y - this.visibleTilesY / 2)
    ));
  }

  updateGameLoop() {
    this.combatService.updateBullets();
    this.combatService.updateEnemies();
    requestAnimationFrame(() => this.updateGameLoop());
  }

  // ---------------
  // Style Getter Methods
  // ---------------
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

  // ---------------
  // Inventory & Equipment Methods
  // ---------------
  equipItem(item: any | null) {
    if (item && item.type) {
      this.gameState.equipItem(item.type);
    }
  }

  selectedSlotIndex: number | null = null;
  handleItemClick(index: number) {
    console.log(`Clicked slot: ${index}, Selected slot: ${this.selectedSlotIndex}`);
    const clickedSlot = this.inventoryService.inventorySlots[index];
    if (this.selectedSlotIndex === null && clickedSlot.item) {
      this.selectedSlotIndex = index;
      console.log(`Selected item at slot: ${index}`);
      return;
    }
    if (this.selectedSlotIndex === index) {
      this.selectedSlotIndex = null;
      console.log("Deselected item.");
      return;
    }
    if (this.selectedSlotIndex !== null) {
      const selectedSlot = this.inventoryService.inventorySlots[this.selectedSlotIndex];
      if (!clickedSlot.item) {
        clickedSlot.item = selectedSlot.item;
        clickedSlot.quantity = selectedSlot.quantity;
        selectedSlot.item = null;
        selectedSlot.quantity = 0;
      } else {
        [selectedSlot.item, clickedSlot.item] = [clickedSlot.item, selectedSlot.item];
        [selectedSlot.quantity, clickedSlot.quantity] = [clickedSlot.quantity, selectedSlot.quantity];
      }
      this.selectedSlotIndex = null;
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

  // ---------------
  // Drag & Drop Handlers
  // ---------------

  // Primary pickup handler – only for left-click pickup.
  onMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault();
    // Only respond to left-click (event.which === 1).
    if (event.which !== 1) return;
    this.dragSourceIndex = index;
    const slot = this.inventoryService.inventorySlots[index];
    if (!slot.item) return;

    // Calculate offset so ghost element aligns with the cursor.
    const targetElem = event.currentTarget as HTMLElement;
    const rect = targetElem.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;

    // Left-click picks up the entire stack.
    this.draggedStack = { item: slot.item, quantity: slot.quantity };
    slot.item = null;
    slot.quantity = 0;

    // Set up ghost element style.
    this.dragGhostStyle = {
      position: 'fixed',
      left: `${event.clientX - this.dragOffsetX}px`,
      top: `${event.clientY - this.dragOffsetY}px`,
      pointerEvents: 'none',
      opacity: '1',
      zIndex: '10000',
      width: '64px',
      height: '64px',
      border: '2px dashed red',
      backgroundColor: 'rgba(255, 255, 255, 0.5)'
    };
  }

  // Document-level mousedown handler to capture right-click drops while dragging.
  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    // This handler is active only while dragging an item.
    if (!this.draggedStack) return;
    // For right-click, event.which should be 3.
    if (event.which === 3) {
      // Identify the target inventory slot under the cursor.
      const dropElem = document.elementFromPoint(event.clientX, event.clientY);
      let targetIndex: number | null = null;
      if (dropElem) {
        const slotElem = (dropElem as HTMLElement).closest('.inventory-slot');
        if (slotElem && slotElem.hasAttribute('data-index')) {
          targetIndex = parseInt(slotElem.getAttribute('data-index')!, 10);
        }
      }
      if (targetIndex !== null) {
        const targetSlot = this.inventoryService.inventorySlots[targetIndex];
        // If target is empty, create a new stack of one unit.
        if (!targetSlot.item) {
          targetSlot.item = { ...this.draggedStack.item };
          targetSlot.quantity = 1;
        }
        // If target already has the same stackable item, add one unit.
        else if (targetSlot.item.id === this.draggedStack.item.id && targetSlot.item.stackable) {
          targetSlot.quantity += 1;
        }
        // Subtract one unit from the dragged stack.
        this.draggedStack.quantity -= 1;
        if (this.draggedStack.quantity <= 0) {
          this.clearDragState();
        }
        this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      }
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Document-level mousemove: update ghost element position.
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.draggedStack) {
      this.dragGhostStyle['left'] = `${event.clientX - this.dragOffsetX}px`;
      this.dragGhostStyle['top'] = `${event.clientY - this.dragOffsetY}px`;
    }
  }

  // Final drop handler – triggers on left mouse button up.
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    // Process final drop only for left-click release.
    if (!this.draggedStack || event.which !== 1) return;

    // Identify target slot.
    const dropElem = document.elementFromPoint(event.clientX, event.clientY);
    let targetIndex: number | null = null;
    if (dropElem) {
      const slotElem = (dropElem as HTMLElement).closest('.inventory-slot');
      if (slotElem && slotElem.hasAttribute('data-index')) {
        targetIndex = parseInt(slotElem.getAttribute('data-index')!, 10);
      }
    }

    // If dropped onto the source slot, return the dragged stack.
    if (targetIndex === this.dragSourceIndex) {
      const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (!sourceSlot.item) {
        sourceSlot.item = { ...this.draggedStack.item };
        sourceSlot.quantity = this.draggedStack.quantity;
      } else if (sourceSlot.item.id === this.draggedStack.item.id && sourceSlot.item.stackable) {
        sourceSlot.quantity += this.draggedStack.quantity;
      }
      this.clearDragState();
      this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      return;
    }

    // If a valid target was found:
    if (targetIndex !== null) {
      const targetSlot = this.inventoryService.inventorySlots[targetIndex];
      // Left-click drop: drop the entire remaining dragged stack.
      if (!targetSlot.item) {
        targetSlot.item = { ...this.draggedStack.item };
        targetSlot.quantity = this.draggedStack.quantity;
      } else if (targetSlot.item.id === this.draggedStack.item.id && targetSlot.item.stackable) {
        targetSlot.quantity += this.draggedStack.quantity;
      } else {
        // If target holds a different item, swap with source.
        const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
        const tempItem = targetSlot.item;
        const tempQty = targetSlot.quantity;
        targetSlot.item = { ...this.draggedStack.item };
        targetSlot.quantity = this.draggedStack.quantity;
        sourceSlot.item = tempItem;
        sourceSlot.quantity = tempQty;
      }
      this.clearDragState();
    } else {
      // No valid target: return the dragged stack to its source.
      const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (!sourceSlot.item) {
        sourceSlot.item = { ...this.draggedStack.item };
        sourceSlot.quantity = this.draggedStack.quantity;
      } else if (sourceSlot.item.id === this.draggedStack.item.id && sourceSlot.item.stackable) {
        sourceSlot.quantity += this.draggedStack.quantity;
      } else {
        const emptySlot = this.inventoryService.inventorySlots.find(slot => slot.item === null);
        if (emptySlot) {
          emptySlot.item = { ...this.draggedStack.item };
          emptySlot.quantity = this.draggedStack.quantity;
        }
      }
      this.clearDragState();
    }
    this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
  }

  // Document-level context menu prevention.
  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  // Helper method to clear drag state.
  private clearDragState(): void {
    this.draggedStack = null;
    this.dragSourceIndex = -1;
    this.dragButton = null;
  }

  // ---------------
  // TrackBy for ngFor
  // ---------------
  trackBySlot(index: number, slot: any): number {
    return slot.id;
  }
}
