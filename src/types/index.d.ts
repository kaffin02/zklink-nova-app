export type Token = {
    address: string;
    l1Address?: string;
    name?: string;
    symbol: string;
    decimals: number;
    iconUrl?: string;
    price?: TokenPrice;
    networkKey?: string;
  };