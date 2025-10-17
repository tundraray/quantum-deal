import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { instruments } from '../src/schema/instruments';

config();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const pool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db: NodePgDatabase<any> = drizzle(pool);

const INSTRUMENTS_DATA = [
  // FOREX - Валюты (28 instruments)
  {
    symbol: 'AUDCAD.a',
    name: 'AUD/CAD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'AUDCHF.a',
    name: 'AUD/CHF',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'AUDJPY.a',
    name: 'AUD/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'AUDNZD.a',
    name: 'AUD/NZD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'AUDUSD.a',
    name: 'AUD/USD',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'CADCHF.a',
    name: 'CAD/CHF',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'CADJPY.a',
    name: 'CAD/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'CHFJPY.a',
    name: 'CHF/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURAUD.a',
    name: 'EUR/AUD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURCAD.a',
    name: 'EUR/CAD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURCHF.a',
    name: 'EUR/CHF',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURGBP.a',
    name: 'EUR/GBP',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURJPY.a',
    name: 'EUR/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURNZD.a',
    name: 'EUR/NZD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'EURUSD.a',
    name: 'EUR/USD',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPAUD.a',
    name: 'GBP/AUD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPCAD.a',
    name: 'GBP/CAD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPCHF.a',
    name: 'GBP/CHF',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPJPY.a',
    name: 'GBP/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPNZD.a',
    name: 'GBP/NZD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'GBPUSD.a',
    name: 'GBP/USD',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'NZDCAD.a',
    name: 'NZD/CAD',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'NZDCHF.a',
    name: 'NZD/CHF',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'NZDJPY.a',
    name: 'NZD/JPY',
    group: 'forex',
    subgroup: 'minors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'NZDUSD.a',
    name: 'NZD/USD',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'USDCAD.a',
    name: 'USD/CAD',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'USDCHF.a',
    name: 'USD/CHF',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },
  {
    symbol: 'USDJPY.a',
    name: 'USD/JPY',
    group: 'forex',
    subgroup: 'majors',
    sector: 'forex',
    displayName: 'Валюты',
  },

  // COMMODITIES - Товары (7 instruments)
  {
    symbol: 'ALUMIMIUM.a',
    name: 'Aluminium',
    group: 'commodities',
    subgroup: 'metals',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'US.OIL.a',
    name: 'WTI Crude Oil',
    group: 'commodities',
    subgroup: 'energy',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'XAUUSD.a',
    name: 'Gold',
    group: 'commodities',
    subgroup: 'metals',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'XPDUSD.a',
    name: 'Palladium',
    group: 'commodities',
    subgroup: 'metals',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'XPTUSD.a',
    name: 'Platinum',
    group: 'commodities',
    subgroup: 'metals',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'COTTON.a',
    name: 'Cotton',
    group: 'commodities',
    subgroup: 'agriculture',
    sector: 'commodities',
    displayName: 'Товары',
  },
  {
    symbol: 'SUGAR.a',
    name: 'Sugar',
    group: 'commodities',
    subgroup: 'agriculture',
    sector: 'commodities',
    displayName: 'Товары',
  },

  // CRYPTO - Криптовалюты (2 instruments)
  {
    symbol: 'BTCUSD.a',
    name: 'Bitcoin',
    group: 'crypto',
    subgroup: 'major',
    sector: 'crypto',
    displayName: 'Криптовалюты',
  },
  {
    symbol: 'ETHUSD.a',
    name: 'Ethereum',
    group: 'crypto',
    subgroup: 'major',
    sector: 'crypto',
    displayName: 'Криптовалюты',
  },

  // STOCKS - Акции Европейские (7 instruments)
  {
    symbol: 'Adidas.a',
    name: 'Adidas AG',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'Airbus.a',
    name: 'Airbus SE',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'BMW.a',
    name: 'BMW AG',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'LouisVuit.a',
    name: 'Louis Vuitton',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'MRG.a',
    name: 'MRG',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'Roche.a',
    name: 'Roche Holding AG',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },
  {
    symbol: 'Nestle.a',
    name: 'Nestlé SA',
    group: 'stocks',
    subgroup: 'european',
    sector: 'stocks',
    displayName: 'Акции Европейские',
  },

  // STOCKS - Акции Американские (25 instruments)
  {
    symbol: 'AMAZON.a',
    name: 'Amazon.com Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'APPLE.a',
    name: 'Apple Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Adobe.a',
    name: 'Adobe Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'BOEING.a',
    name: 'The Boeing Company',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'BlackRock.a',
    name: 'BlackRock Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'COCACOLA.a',
    name: 'The Coca-Cola Company',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Chevron.a',
    name: 'Chevron Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Coinbase.a',
    name: 'Coinbase Global Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Disney.a',
    name: 'The Walt Disney Company',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Dycom.a',
    name: 'Dycom Industries Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'EBAY.a',
    name: 'eBay Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'ExxonMobil.a',
    name: 'Exxon Mobil Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'FERRARI.a',
    name: 'Ferrari N.V.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Facebook.a',
    name: 'Meta Platforms Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'GOOGLE.a',
    name: 'Alphabet Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'GoldmanSach.a',
    name: 'The Goldman Sachs Group Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'IBM.a',
    name: 'IBM Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Lockheed.a',
    name: 'Lockheed Martin Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'MICROSOFT.a',
    name: 'Microsoft Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Mastercard.a',
    name: 'Mastercard Incorporated',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'McDonalds.a',
    name: "McDonald's Corporation",
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'NVDA.a',
    name: 'NVIDIA Corporation',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Netflix.a',
    name: 'Netflix Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'Tesla.a',
    name: 'Tesla Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
  {
    symbol: 'VISA.a',
    name: 'Visa Inc.',
    group: 'stocks',
    subgroup: 'us',
    sector: 'stocks',
    displayName: 'Акции Американские',
  },
];

async function seedInstruments() {
  try {
    console.log('🌱 Starting instruments seed...');

    // Check if instruments already exist
    const existing = await db.select().from(instruments).limit(1);
    if (existing.length > 0) {
      console.log('⚠️  Instruments table already has data. Skipping seed.');
      console.log(
        '   To re-seed, truncate the table first: TRUNCATE TABLE instruments RESTART IDENTITY CASCADE;',
      );
      return;
    }

    // Insert all instruments
    await db.insert(instruments).values(INSTRUMENTS_DATA);

    console.log(
      `✅ Successfully seeded ${INSTRUMENTS_DATA.length} instruments`,
    );
    console.log('   - Forex: 28 instruments');
    console.log('   - Commodities: 7 instruments');
    console.log('   - Crypto: 2 instruments');
    console.log('   - Stocks (European): 7 instruments');
    console.log('   - Stocks (US): 25 instruments');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error seeding instruments:', err.message);
    throw err;
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pool.end();
  }
}

seedInstruments();
