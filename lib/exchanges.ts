// 거래소 설정
export const EXCHANGES: Record<string, {
  name: string;
  hasSpot: boolean;
  hasFutures: boolean;
  spotSuffix: string;
  futuresSuffix: string;
}> = {
  binance: {
    name: '바이낸스',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  bybit: {
    name: '바이빗',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  okx: {
    name: 'OKX',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  bitget: {
    name: '비트겟',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  mexc: {
    name: 'MEXC',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  gate: {
    name: 'Gate.io',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  htx: {
    name: 'HTX',
    hasSpot: true,
    hasFutures: true,
    spotSuffix: '/USDT',
    futuresSuffix: '/USDT:USDT',
  },
  hyperliquid: {
    name: 'Hyperliquid',
    hasSpot: false,
    hasFutures: true,
    spotSuffix: '',
    futuresSuffix: '/USDC:USDC',
  },
};

// 현선갭: 선물 기준 거래소 목록
export const FUTURES_BASE_EXCHANGES = ['binance', 'bybit', 'okx', 'gate', 'bitget', 'mexc', 'htx', 'hyperliquid'];

// 현선갭: 현물 비교 거래소 목록
export const SPOT_COMPARE_EXCHANGES = ['binance', 'bybit', 'okx', 'gate', 'bitget', 'mexc', 'htx'];

export const SPOT_EXCHANGES = Object.keys(EXCHANGES).filter(
  (id) => EXCHANGES[id].hasSpot
);

export const FUTURES_EXCHANGES = Object.keys(EXCHANGES).filter(
  (id) => EXCHANGES[id].hasFutures
);

export interface PriceData {
  spot: Record<string, number | null>;
  futures: Record<string, number | null>;
  funding: Record<string, { rate: number | null; nextTime: string }>;
}

export function calculatePremium(
  spotPrice: number | null,
  futuresPrice: number | null
): number | null {
  if (!spotPrice || !futuresPrice || spotPrice === 0) return null;
  return ((futuresPrice - spotPrice) / spotPrice) * 100;
}

export function calculateGap(
  priceA: number | null,
  priceB: number | null
): number | null {
  if (!priceA || !priceB || priceA === 0) return null;
  return ((priceB - priceA) / priceA) * 100;
}

export function formatPrice(price: number | null): string {
  if (price === null) return 'N/A';
  // 가격에 따라 소수점 자릿수 조절
  let decimals = 2;
  if (price < 1) decimals = 4;
  else if (price < 10) decimals = 4;
  else if (price < 100) decimals = 4;
  else if (price < 1000) decimals = 3;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
