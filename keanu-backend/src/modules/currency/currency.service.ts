import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface CurrencyRateData {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

const SUPPORTED_SYMBOLS = 'IDR,EUR,JPY,GBP,AUD,CHF,CNY';
const POLL_INTERVAL_MS = 60_000; // 60 seconds
const API_URL = `https://api.exchangerate.host/latest?base=USD&symbols=${SUPPORTED_SYMBOLS}`;

// Reasonable fallback rates (approximate) if external API is down
const FALLBACK_RATES: Record<string, number> = {
  IDR: 16300,
  EUR: 0.92,
  JPY: 151.3,
  GBP: 0.79,
  AUD: 1.53,
  CHF: 0.90,
  CNY: 7.23,
};

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);
  private latestData: CurrencyRateData = {
    base: 'USD',
    rates: { ...FALLBACK_RATES },
    timestamp: Date.now(),
  };
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  async onModuleInit() {
    // Fetch immediately on startup, then every POLL_INTERVAL_MS
    await this.fetchRates();
    this.intervalRef = setInterval(() => this.fetchRates(), POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  getLatestRates(): CurrencyRateData {
    return this.latestData;
  }

  private async fetchRates(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      // exchangerate.host returns { success: true, base: "USD", rates: { ... } }
      if (json && json.rates && typeof json.rates === 'object') {
        const rates: Record<string, number> = {};
        for (const symbol of SUPPORTED_SYMBOLS.split(',')) {
          if (typeof json.rates[symbol] === 'number') {
            rates[symbol] = json.rates[symbol];
          } else {
            // Keep fallback for missing symbols
            rates[symbol] = this.latestData.rates[symbol] ?? FALLBACK_RATES[symbol];
          }
        }

        this.latestData = {
          base: 'USD',
          rates,
          timestamp: Date.now(),
        };

        this.logger.log(
          `Currency rates updated: ${Object.entries(rates)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`,
        );
        console.log(`[BACKEND] Currency rates fetched and updated at ${new Date().toLocaleTimeString()}`);
      } else {
        this.logger.warn('Unexpected API response structure, keeping cached rates');
      }
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch currency rates (keeping cached): ${error.message}`,
      );
    }
  }
}
