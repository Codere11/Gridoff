import { Injectable } from '@angular/core';
import { ShovelHandler, WateringCanHandler, TobaccoSeedsHandler } from '../handlers/interaction-handlers';

/**
 * Represents a tile in the game world.
 */
export interface Tile {
  type: string;
  growthStage?: number;
}

/**
 * Context provided to each interaction handler.
 */
export interface InteractionContext {
  inventory?: {
    removeItem: (itemType: string, quantity: number) => boolean;
  };
}

/**
 * Interface that all interaction handlers must implement.
 */
export interface InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void;
}

/**
 * Service responsible for managing interactions with game tiles based on equipped items.
 */
@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  private handlers: { [key: string]: InteractionHandler } = {};
  private currentItem: string = '';

  constructor() {
    // Register handlers during initialization
    this.registerHandlers();
  }

  /**
   * Registers all interaction handlers for specific item types.
   */
  private registerHandlers(): void {
    this.handlers['shovel'] = new ShovelHandler();
    this.handlers['watering-can'] = new WateringCanHandler();
    this.handlers['tobacco-seeds'] = new TobaccoSeedsHandler();
    // Additional handlers can be registered here as needed
  }

  /**
   * Sets the currently equipped item for interactions.
   * @param itemType The type of item to equip
   */
  setEquippedItem(itemType: string): void {
    this.currentItem = itemType;
    console.log(`Equipped item set to: ${itemType}`);
  }

  /**
   * Handles interaction with a tile using the currently equipped item.
   * @param tile The tile to interact with
   * @param context The interaction context (e.g., inventory)
   */
  handleInteraction(tile: Tile, context: InteractionContext): void {
    const handler = this.handlers[this.currentItem];
    if (handler) {
      handler.execute(tile, context);
    } else {
      console.warn(`No interaction handler registered for: ${this.currentItem}`);
    }
  }
}