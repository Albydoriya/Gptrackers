import { useState, useEffect, useCallback } from 'react';
import { exchangeRateService, ExchangeRate } from '../services/exchangeRateService';
import { supabase } from '../lib/supabase';

export const useExchangeRate = (baseCurrency = 'AUD', targetCurrency = 'JPY') => {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousRate, setPreviousRate] = useState<number | null>(null);

  const fetchRate = useCallback(async () => {
    try {
      const cachedRate = exchangeRateService.getCachedRate(baseCurrency, targetCurrency);
      if (cachedRate) {
        setRate(cachedRate);
        setLoading(false);
        return;
      }

      const latestRate = await exchangeRateService.fetchLatestRate(baseCurrency, targetCurrency);

      if (latestRate) {
        setRate(latestRate);
        exchangeRateService.setCachedRate(latestRate);

        const history = await exchangeRateService.getRateHistory(baseCurrency, targetCurrency, 2);
        if (history.length > 1) {
          setPreviousRate(parseFloat(history[1].rate.toString()));
        }
      } else {
        setError('No exchange rate data available');
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
      setError('Failed to fetch exchange rate');
    } finally {
      setLoading(false);
    }
  }, [baseCurrency, targetCurrency]);

  useEffect(() => {
    fetchRate();

    const channel = supabase
      .channel('exchange_rates_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exchange_rates',
          filter: `base_currency=eq.${baseCurrency}`,
        },
        (payload) => {
          const newRate = payload.new as ExchangeRate;
          if (newRate.target_currency === targetCurrency) {
            setRate((currentRate) => {
              if (currentRate) {
                setPreviousRate(parseFloat(currentRate.rate.toString()));
              }
              return newRate;
            });
            exchangeRateService.setCachedRate(newRate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRate, baseCurrency, targetCurrency]);

  const getRateTrend = useCallback((): 'up' | 'down' | 'stable' => {
    if (!rate || !previousRate) return 'stable';

    const currentRate = parseFloat(rate.rate.toString());
    const diff = currentRate - previousRate;

    if (Math.abs(diff) < 0.01) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [rate, previousRate]);

  return {
    rate,
    loading,
    error,
    trend: getRateTrend(),
    refetch: fetchRate,
  };
};
