'use client';

import { useState, useEffect, useCallback } from 'react';
import { EXCHANGES, SPOT_EXCHANGES, FUTURES_EXCHANGES, FUTURES_BASE_EXCHANGES, SPOT_COMPARE_EXCHANGES, calculatePremium, calculateGap, formatPrice, formatPercent } from '@/lib/exchanges';

const VERSION = 'v1.0';
const GAP_HIGHLIGHT_THRESHOLD = 0.5;

interface PriceData {
  spot: Record<string, number | null>;
  futures: Record<string, number | null>;
  funding: Record<string, { rate: number | null; nextTime: string }>;
}

export default function Dashboard() {
  const [symbol, setSymbol] = useState('BTC');
  const [inputSymbol, setInputSymbol] = useState('BTC');
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'spot-futures' | 'futures-futures'>('spot-futures');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(FUTURES_EXCHANGES);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 현선갭 필터용 state
  const [selectedFuturesBase, setSelectedFuturesBase] = useState<string[]>(FUTURES_BASE_EXCHANGES);
  const [selectedSpotCompare, setSelectedSpotCompare] = useState<string[]>(SPOT_COMPARE_EXCHANGES);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices?symbol=${symbol}`);
      const result = await res.json();
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleSearch = () => {
    if (inputSymbol.trim()) {
      setSymbol(inputSymbol.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleExchange = (exchangeId: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(exchangeId)
        ? prev.filter((id) => id !== exchangeId)
        : [...prev, exchangeId]
    );
  };

  const selectAll = () => setSelectedExchanges([...FUTURES_EXCHANGES]);
  const clearAll = () => setSelectedExchanges([]);

  // 현선갭 필터 토글 함수
  const toggleFuturesBase = (exchangeId: string) => {
    setSelectedFuturesBase((prev) =>
      prev.includes(exchangeId)
        ? prev.filter((id) => id !== exchangeId)
        : [...prev, exchangeId]
    );
  };

  const toggleSpotCompare = (exchangeId: string) => {
    setSelectedSpotCompare((prev) =>
      prev.includes(exchangeId)
        ? prev.filter((id) => id !== exchangeId)
        : [...prev, exchangeId]
    );
  };

  const selectAllFutures = () => setSelectedFuturesBase([...FUTURES_BASE_EXCHANGES]);
  const clearAllFutures = () => setSelectedFuturesBase([]);
  const selectAllSpot = () => setSelectedSpotCompare([...SPOT_COMPARE_EXCHANGES]);
  const clearAllSpot = () => setSelectedSpotCompare([]);

  // 현선갭 테이블 렌더링 (선물거래소 vs 현물거래소)
  const renderSpotFuturesTable = () => {
    if (!data) return null;

    // 필터링된 거래소 목록
    const filteredFutures = FUTURES_BASE_EXCHANGES.filter((id) => selectedFuturesBase.includes(id));
    const filteredSpot = SPOT_COMPARE_EXCHANGES.filter((id) => selectedSpotCompare.includes(id));

    // 각 선물 기준 거래소별로 그룹화된 데이터 생성
    const groups: Array<{
      futuresExchange: string;
      futuresName: string;
      futuresPrice: number | null;
      rows: Array<{
        spotExchange: string;
        spotName: string;
        spotPrice: number | null;
        premium: number | null;
      }>;
    }> = [];

    for (const futuresEx of filteredFutures) {
      const futuresPrice = data.futures[futuresEx];
      const rows = filteredSpot.map((spotEx) => {
        const spotPrice = data.spot[spotEx];
        const premium = calculatePremium(spotPrice, futuresPrice);
        return {
          spotExchange: spotEx,
          spotName: EXCHANGES[spotEx]?.name || spotEx,
          spotPrice,
          premium,
        };
      });

      groups.push({
        futuresExchange: futuresEx,
        futuresName: EXCHANGES[futuresEx]?.name || futuresEx,
        futuresPrice,
        rows,
      });
    }

    return (
      <table>
        <thead>
          <tr>
            <th style={{ width: '100px' }}>선물거래소</th>
            <th style={{ width: '100px' }}>현물거래소</th>
            <th style={{ width: '120px' }}>현물가격 ($)</th>
            <th style={{ width: '120px' }}>선물가격 ($)</th>
            <th style={{ width: '120px' }}>프리미엄 (%)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIdx) => (
            group.rows.map((row, rowIdx) => {
              const isHighlight = row.premium !== null && Math.abs(row.premium) >= GAP_HIGHLIGHT_THRESHOLD;
              return (
                <tr
                  key={`${group.futuresExchange}-${row.spotExchange}`}
                  className={isHighlight ? 'highlight-row' : ''}
                  style={rowIdx === group.rows.length - 1 ? { borderBottom: '2px solid #2a3f5f' } : {}}
                >
                  {rowIdx === 0 ? (
                    <td
                      rowSpan={group.rows.length}
                      style={{
                        color: '#00bfff',
                        fontWeight: 600,
                        verticalAlign: 'middle',
                        borderRight: '1px solid #2a3442'
                      }}
                    >
                      {group.futuresName}
                    </td>
                  ) : null}
                  <td style={{ color: '#ffffff' }}>{row.spotName}</td>
                  <td style={{ color: '#ffffff' }}>{formatPrice(row.spotPrice)}</td>
                  <td style={{ color: '#ffffff' }}>{formatPrice(group.futuresPrice)}</td>
                  <td
                    className={row.premium !== null ? (row.premium >= 0 ? 'positive' : 'negative') : ''}
                    style={{ fontWeight: 600 }}
                  >
                    {formatPercent(row.premium)}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    );
  };

  // 선선갭 테이블 렌더링
  const renderFuturesFuturesTable = () => {
    if (!data) return null;

    const pairs: Array<{
      exA: string;
      exB: string;
      nameA: string;
      nameB: string;
      priceA: number | null;
      priceB: number | null;
      fundingA: number | null;
      fundingB: number | null;
      gap: number | null;
      fundingDiff: number | null;
    }> = [];

    const filtered = FUTURES_EXCHANGES.filter((id) => selectedExchanges.includes(id));

    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const exA = filtered[i];
        const exB = filtered[j];
        const priceA = data.futures[exA];
        const priceB = data.futures[exB];
        const fundingA = data.funding[exA]?.rate || null;
        const fundingB = data.funding[exB]?.rate || null;
        const gap = calculateGap(priceA, priceB);
        const fundingDiff = fundingA !== null && fundingB !== null ? fundingB - fundingA : null;

        pairs.push({
          exA,
          exB,
          nameA: EXCHANGES[exA]?.name || exA,
          nameB: EXCHANGES[exB]?.name || exB,
          priceA,
          priceB,
          fundingA,
          fundingB,
          gap,
          fundingDiff,
        });
      }
    }

    // 갭 절대값 기준 정렬
    pairs.sort((a, b) => Math.abs(b.gap || 0) - Math.abs(a.gap || 0));

    return (
      <table>
        <thead>
          <tr>
            <th>거래소 A</th>
            <th>A 가격</th>
            <th>A 펀딩비</th>
            <th>↔ 갭</th>
            <th>펀딩차</th>
            <th>B 펀딩비</th>
            <th>B 가격</th>
            <th>거래소 B</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((row, idx) => {
            const isHighlight = row.gap !== null && Math.abs(row.gap) >= GAP_HIGHLIGHT_THRESHOLD;
            return (
              <tr key={idx} className={isHighlight ? 'highlight-row' : ''}>
                <td style={{ color: '#00bfff', fontWeight: 600 }}>{row.nameA}</td>
                <td>{formatPrice(row.priceA)}</td>
                <td className={row.fundingA !== null ? (row.fundingA >= 0 ? 'positive' : 'negative') : ''}>
                  {formatPercent(row.fundingA)}
                </td>
                <td className={row.gap !== null ? (row.gap >= 0 ? 'positive' : 'negative') : ''} style={{ fontWeight: 600 }}>
                  {formatPercent(row.gap)}
                </td>
                <td className={row.fundingDiff !== null ? (row.fundingDiff >= 0 ? 'positive' : 'negative') : ''}>
                  {formatPercent(row.fundingDiff)}
                </td>
                <td className={row.fundingB !== null ? (row.fundingB >= 0 ? 'positive' : 'negative') : ''}>
                  {formatPercent(row.fundingB)}
                </td>
                <td>{formatPrice(row.priceB)}</td>
                <td style={{ fontWeight: 600 }}>{row.nameB}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#00bfff', fontSize: '24px', fontWeight: 'bold' }}>
          📊 갭 검색 대시보드 <span style={{ color: '#888', fontSize: '14px' }}>{VERSION}</span>
        </h1>
        <div style={{ color: '#888', fontSize: '14px' }}>
          마지막 업데이트: {lastUpdate || 'N/A'}
        </div>
      </div>

      {/* 검색 영역 */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          placeholder="BTC, ETH, SOL..."
          style={{ width: '120px' }}
        />
        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="spinner" style={{ display: 'inline-block' }} /> : '검색'}
        </button>
        <button className="btn-primary" onClick={fetchData} disabled={loading} style={{ backgroundColor: '#3b82f6' }}>
          🔄 새로고침
        </button>
        <label className="checkbox-wrapper" style={{ marginLeft: '20px' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>자동 새로고침 (10초)</span>
        </label>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
        <button
          className={`tab-button ${activeTab === 'spot-futures' ? 'active' : ''}`}
          onClick={() => setActiveTab('spot-futures')}
          style={{ borderRadius: '8px 0 0 8px' }}
        >
          📈 현선갭 (현물-선물)
        </button>
        <button
          className={`tab-button ${activeTab === 'futures-futures' ? 'active' : ''}`}
          onClick={() => setActiveTab('futures-futures')}
          style={{ borderRadius: '0 8px 8px 0' }}
        >
          📊 선선갭 (선물-선물)
        </button>
      </div>

      {/* 현선갭 필터 */}
      {activeTab === 'spot-futures' && (
        <div style={{ backgroundColor: '#1a2332', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          {/* 선물 거래소 선택 */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: '#00bfff' }}>선물 거래소:</span>
              <button onClick={selectAllFutures} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#2ed573', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                전체 선택
              </button>
              <button onClick={clearAllFutures} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                전체 해제
              </button>
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {FUTURES_BASE_EXCHANGES.map((exchangeId) => (
                <label key={exchangeId} className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={selectedFuturesBase.includes(exchangeId)}
                    onChange={() => toggleFuturesBase(exchangeId)}
                  />
                  <span>{EXCHANGES[exchangeId]?.name || exchangeId}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 현물 거래소 선택 */}
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: '#ffcc00' }}>현물 거래소:</span>
              <button onClick={selectAllSpot} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#2ed573', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                전체 선택
              </button>
              <button onClick={clearAllSpot} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                전체 해제
              </button>
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {SPOT_COMPARE_EXCHANGES.map((exchangeId) => (
                <label key={exchangeId} className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={selectedSpotCompare.includes(exchangeId)}
                    onChange={() => toggleSpotCompare(exchangeId)}
                  />
                  <span>{EXCHANGES[exchangeId]?.name || exchangeId}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 선선갭 필터 */}
      {activeTab === 'futures-futures' && (
        <div style={{ backgroundColor: '#1a2332', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600 }}>거래소 선택:</span>
            <button onClick={selectAll} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#2ed573', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
              전체 선택
            </button>
            <button onClick={clearAll} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
              전체 해제
            </button>
          </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {FUTURES_EXCHANGES.map((exchangeId) => (
              <label key={exchangeId} className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={selectedExchanges.includes(exchangeId)}
                  onChange={() => toggleExchange(exchangeId)}
                />
                <span>{EXCHANGES[exchangeId]?.name || exchangeId}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div style={{ backgroundColor: '#0d1117', borderRadius: '8px', overflow: 'hidden' }}>
        {loading && !data ? (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <div>데이터 로딩 중...</div>
          </div>
        ) : activeTab === 'spot-futures' ? (
          selectedFuturesBase.length === 0 || selectedSpotCompare.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#888' }}>
              선물 거래소와 현물 거래소를 각각 1개 이상 선택해주세요.
            </div>
          ) : (
            renderSpotFuturesTable()
          )
        ) : selectedExchanges.length < 2 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#888' }}>
            거래소를 2개 이상 선택해주세요.
          </div>
        ) : (
          renderFuturesFuturesTable()
        )}
      </div>

      {/* 푸터 설명 */}
      {activeTab === 'spot-futures' && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '8px', fontSize: '13px' }}>
          <strong style={{ color: '#00bfff' }}>[프리미엄 해석]</strong>
          <div style={{ marginTop: '8px', color: '#aaa' }}>
            <span className="positive">양수(+)</span>: 선물 {'>'} 현물 (콘탱고) → 현물 매수 / 선물 매도 | {' '}
            <span className="negative">음수(-)</span>: 선물 {'<'} 현물 (백워데이션) → 현물 매도 / 선물 매수
          </div>
        </div>
      )}
      {activeTab === 'futures-futures' && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '8px', fontSize: '13px' }}>
          <strong>📖 선선갭 해석:</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px', color: '#aaa' }}>
            <li><span className="positive">양수 (+)</span>: B 거래소가 A보다 비쌈 → A 매수 / B 매도</li>
            <li><span className="negative">음수 (-)</span>: A 거래소가 B보다 비쌈 → B 매수 / A 매도</li>
            <li style={{ color: '#2ed573' }}>녹색 배경: |갭| ≥ 0.5%</li>
          </ul>
        </div>
      )}
    </div>
  );
}
