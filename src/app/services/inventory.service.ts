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

  baseInventorySlots: InventorySlot[] = new Array(10).fill({});
  extraInventorySlots: InventorySlot[] = []; // Starts empty


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

  expandInventory(extraSlots: number) {
    const currentTotalSlots = this.inventorySlots.length + this.extraInventorySlots.length;
    
    if (currentTotalSlots < this.inventorySlots.length + extraSlots) {
        const missingSlots = (this.inventorySlots.length + extraSlots) - currentTotalSlots;
        
        this.extraInventorySlots = [
            ...this.extraInventorySlots,
            ...Array.from({ length: missingSlots }, (_, i) => ({
                id: currentTotalSlots + i,
                item: null
            }))
        ];
    }

    this.inventorySlots = [...this.inventorySlots, ...this.extraInventorySlots];
}




resetInventory() {
  // ✅ Preserve existing items in base inventory slots
  this.baseInventorySlots = this.inventorySlots.slice(0, 10); 

  // ✅ Remove only extra slots
  this.extraInventorySlots = [];

  // ✅ Update `inventorySlots` to reflect only the base inventory
  this.inventorySlots = [...this.baseInventorySlots];
}

}