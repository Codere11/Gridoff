import { Injectable } from '@angular/core';

export interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
}

export interface InventorySlot {
  id: number;
  item: Item | null;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  inventorySlots: InventorySlot[] = [
    { id: 0, item: { id: 1, name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png' } },
    { id: 1, item: { id: 2, name: 'Shovel', type: 'shovel', icon: '../../assets/icons/shovel.png' } },
    { id: 2, item: { id: 3, name: 'Watering Can', type: 'watering-can', icon: '../../assets/icons/watering-can.png' } },
    { id: 3, item: { id: 4, name: 'Tobacco Seeds', type: 'tobacco-seeds', icon: '../../assets/icons/tobacco-seeds.png' } },
    { id: 4, item: null },
    { id: 5, item: null },
    { id: 6, item: null },
    { id: 7, item: null },
    { id: 8, item: null },
    { id: 9, item: null }
  ];

  /** Handles Drag-and-Drop Logic */
  handleDrop(previousIndex: number, currentIndex: number) {
    const draggedItem = this.inventorySlots[previousIndex].item;
    const targetSlot = this.inventorySlots[currentIndex];

    // Ensure dragged item exists
    if (!draggedItem) return;

    // If target slot is empty, move item there
    if (!targetSlot.item) {
      this.inventorySlots[currentIndex].item = draggedItem;
      this.inventorySlots[previousIndex].item = null;
    }
    // If target slot is occupied, swap items
    else {
      const temp = targetSlot.item;
      this.inventorySlots[currentIndex].item = draggedItem;
      this.inventorySlots[previousIndex].item = temp;
    }

    // Trigger Angular change detection
    this.inventorySlots = [...this.inventorySlots];
  }
}
