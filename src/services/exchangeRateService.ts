import { supabase } from '../lib/supabase';

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
  source_api: string;
  created_at: string;
}

export const exchangeRateService = {
  async fetchLatestRate(baseCurrency = 'AUD', targetCurrency = 'JPY'): Promise<ExchangeRate | null> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', baseCurrency)
        .eq('target_currency', targetCurrency)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchLatestRate:', error);
      return null;
    }
  },

  async fetchRateFromAPI(baseCurrency = 'AUD', targetCurrency = 'JPY'): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates?.[targetCurrency];

      if (typeof rate !== 'number') {
        throw new Error('Invalid rate data received from API');
      }

      return rate;
    } catch (error) {
      console.error('Error fetching rate from Frankfurter API:', error);

      try {
        const fallbackResponse = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
        );

        if (!fallbackResponse.ok) {
          throw new Error('Fallback API also failed');
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackRate = fallbackData.rates?.[targetCurrency];

        if (typeof fallbackRate !== 'number') {
          throw new Error('Invalid rate data from fallback API');
        }

        return fallbackRate;
      } catch (fallbackError) {
        console.error('Error with fallback API:', fallbackError);
        return null;
      }
    }
  },

  async saveRateToDatabase(
    rate: number,
    baseCurrency = 'AUD',
    targetCurrency = 'JPY',
    sourceApi = 'frankfurter'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate: rate,
          fetched_at: new Date().toISOString(),
          source_api: sourceApi,
        });

      if (error) {
        console.error('Error saving rate to database:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveRateToDatabase:', error);
      return false;
    }
  },

  async getRateHistory(
    baseCurrency = 'AUD',
    targetCurrency = 'JPY',
    limit = 7
  ): Promise<ExchangeRate[]> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', baseCurrency)
        .eq('target_currency', targetCurrency)
        .order('fetched_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching rate history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRateHistory:', error);
      return [];
    }
  },

  getCachedRate(baseCurrency = 'AUD', targetCurrency = 'JPY'): ExchangeRate | null {
    try {
      const cacheKey = `exchange_rate_cache_${baseCurrency}_${targetCurrency}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { rate, timestamp } = JSON.parse(cached);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      if (timestamp < oneHourAgo) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return rate;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  },

  setCachedRate(rate: ExchangeRate): void {
    try {
      const cacheKey = `exchange_rate_cache_${rate.base_currency}_${rate.target_currency}`;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          rate,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  },
};
