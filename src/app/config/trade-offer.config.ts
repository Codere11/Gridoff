// src/app/config/trade-offers.config.ts
export interface TradeOffer {
    mode: string;
    allowedItemType: string;
    conversionRate: number;
    outputItem: Partial<Item>;
  }
  
  export const TRADE_OFFERS: TradeOffer[] = [
    {
      mode: 'sellTobacco',
      allowedItemType: 'tobacco',
      conversionRate: 10,
      outputItem: {
        id: 100,
        name: 'Coin',
        type: 'coin',
        icon: '../../assets/icons/coin.png',
        stackable: true
      }
    },
    {
      mode: 'buyAmmo',
      allowedItemType: 'coin',
      conversionRate: 15,
      outputItem: {
        id: 7,
        name: 'Ammo',
        type: 'ammo',
        icon: '../../assets/icons/ammo.png',
        stackable: true
      }
    }
  ];
  