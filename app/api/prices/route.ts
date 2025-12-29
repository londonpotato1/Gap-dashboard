import { NextRequest, NextResponse } from 'next/server';

// Vercel 서버리스 함수 설정
export const maxDuration = 10; // 최대 10초 (hobby plan 최대)
export const dynamic = 'force-dynamic';

// ccxt는 서버 사이드에서만 실행
const ccxt = require('ccxt');

const EXCHANGES_CONFIG: Record<string, {
  class: string;
  futuresClass?: string;
  options?: object;
  futuresSuffix?: string;
}> = {
  binance: { class: 'binance' },
  bybit: { class: 'bybit' },
  okx: { class: 'okx' },
  bitget: { class: 'bitget' },
  mexc: { class: 'mexc' },
  gate: { class: 'gate' },
  htx: { class: 'htx' },
  hyperliquid: { class: 'hyperliquid', futuresSuffix: '/USDC:USDC' },
};

// 타임아웃 래퍼 함수
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]);
}

interface ExchangeData {
  spot: Record<string, number | null>;
  futures: Record<string, number | null>;
  funding: Record<string, { rate: number | null; nextTime: string }>;
}

const REQUEST_TIMEOUT = 4000; // 개별 요청 4초 타임아웃

async function fetchSpotPrice(exchangeId: string, symbol: string): Promise<number | null> {
  try {
    // Hyperliquid는 현물이 없음
    if (exchangeId === 'hyperliquid') {
      return null;
    }
    const ExchangeClass = ccxt[EXCHANGES_CONFIG[exchangeId].class];
    const exchange = new ExchangeClass({ enableRateLimit: false, timeout: REQUEST_TIMEOUT });
    const ticker = await exchange.fetchTicker(`${symbol}/USDT`);
    return ticker?.last || null;
  } catch (error) {
    return null;
  }
}

async function fetchFuturesPrice(exchangeId: string, symbol: string): Promise<number | null> {
  try {
    const config = EXCHANGES_CONFIG[exchangeId];
    const ExchangeClass = ccxt[config.class];
    // Hyperliquid는 rate limit 필요
    const needsRateLimit = exchangeId === 'hyperliquid';
    const exchange = new ExchangeClass({
      enableRateLimit: needsRateLimit,
      timeout: REQUEST_TIMEOUT,
      options: { defaultType: 'swap' }
    });
    const suffix = config.futuresSuffix || '/USDT:USDT';
    const ticker = await exchange.fetchTicker(`${symbol}${suffix}`);
    return ticker?.last || null;
  } catch (error) {
    return null;
  }
}

async function fetchFundingRate(exchangeId: string, symbol: string): Promise<{ rate: number | null; nextTime: string }> {
  try {
    const config = EXCHANGES_CONFIG[exchangeId];
    const ExchangeClass = ccxt[config.class];
    // Hyperliquid는 rate limit 필요
    const needsRateLimit = exchangeId === 'hyperliquid';
    const exchange = new ExchangeClass({
      enableRateLimit: needsRateLimit,
      timeout: REQUEST_TIMEOUT,
      options: { defaultType: 'swap' }
    });
    const suffix = config.futuresSuffix || '/USDT:USDT';
    const funding = await exchange.fetchFundingRate(`${symbol}${suffix}`);

    let nextTime = 'N/A';
    const nextTs = funding?.nextFundingTimestamp || funding?.fundingTimestamp;
    if (nextTs) {
      const ts = nextTs > 1e12 ? nextTs / 1000 : nextTs;
      const date = new Date(ts * 1000);
      nextTime = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }

    return {
      rate: funding?.fundingRate ? funding.fundingRate * 100 : null,
      nextTime,
    };
  } catch (error) {
    return { rate: null, nextTime: 'N/A' };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTC';

  const exchangeIds = Object.keys(EXCHANGES_CONFIG);

  const result: ExchangeData = {
    spot: {},
    futures: {},
    funding: {},
  };

  // 병렬로 모든 데이터 조회
  const promises: Promise<void>[] = [];

  for (const exchangeId of exchangeIds) {
    // Spot
    promises.push(
      fetchSpotPrice(exchangeId, symbol).then((price) => {
        result.spot[exchangeId] = price;
      })
    );

    // Futures
    promises.push(
      fetchFuturesPrice(exchangeId, symbol).then((price) => {
        result.futures[exchangeId] = price;
      })
    );

    // Funding
    promises.push(
      fetchFundingRate(exchangeId, symbol).then((data) => {
        result.funding[exchangeId] = data;
      })
    );
  }

  await Promise.allSettled(promises);

  return NextResponse.json(result);
}
