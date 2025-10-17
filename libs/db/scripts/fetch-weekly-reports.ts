import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { messages } from '../src/schema/messages';
import { writeFileSync } from 'fs';
import { join } from 'path';

config();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

interface WeeklyReportMessage {
  id: number;
  lang: string | null;
  type: string | null;
  message: string | null;
}

async function fetchWeeklyReports() {
  try {
    console.log('🔍 Fetching weekly_report messages from database...');

    // Fetch all weekly_report messages
    const weeklyReports = await db
      .select()
      .from(messages)
      .where(eq(messages.type, 'weekly_report'));

    console.log(`\n✅ Found ${weeklyReports.length} weekly_report messages\n`);

    if (weeklyReports.length === 0) {
      console.log('⚠️  No weekly_report messages found in the database.');
      return;
    }

    // Display messages grouped by language
    const messagesByLang = weeklyReports.reduce(
      (acc, msg) => {
        const lang = msg.lang || 'unknown';
        if (!acc[lang]) {
          acc[lang] = [];
        }
        acc[lang].push(msg);
        return acc;
      },
      {} as Record<string, WeeklyReportMessage[]>,
    );

    console.log('Messages grouped by language:');
    console.log('='.repeat(80));

    for (const [lang, msgs] of Object.entries(messagesByLang)) {
      console.log(`\n📝 Language: ${lang} (${msgs.length} message(s))`);
      console.log('-'.repeat(80));

      msgs.forEach((msg, index) => {
        console.log(`\nMessage #${index + 1} (ID: ${msg.id}):`);
        console.log('First 500 characters:');
        console.log(msg.message?.substring(0, 500) || 'N/A');
        console.log('...');
      });
    }

    // Save to JSON file for reference
    const outputPath = join(
      __dirname,
      '..',
      'migrations',
      'weekly_reports_backup.json',
    );
    writeFileSync(outputPath, JSON.stringify(weeklyReports, null, 2), 'utf-8');
    console.log(`\n💾 Full data saved to: ${outputPath}`);

    // Show statistics
    console.log('\n📊 Statistics:');
    console.log('='.repeat(80));
    console.log(`Total messages: ${weeklyReports.length}`);
    console.log(`Languages found: ${Object.keys(messagesByLang).join(', ')}`);
    console.log(
      `Expected languages: ru, en, uk, hi, fr, kk, uz, tg (8 languages)`,
    );

    const missingLangs = [
      'ru',
      'en',
      'uk',
      'hi',
      'fr',
      'kk',
      'uz',
      'tg',
    ].filter((lang) => !messagesByLang[lang]);

    if (missingLangs.length > 0) {
      console.log(`⚠️  Missing languages: ${missingLangs.join(', ')}`);
    } else {
      console.log('✅ All expected languages present');
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error fetching weekly reports:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pool.end();
  }
}

fetchWeeklyReports();
