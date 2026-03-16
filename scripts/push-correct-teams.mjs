// Push corrected 2026 teams to the database via direct DB connection
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const teams = JSON.parse(readFileSync('./scripts/correct-teams-2026.json', 'utf8'));

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Clear all existing teams
  await conn.execute('DELETE FROM teams');
  console.log('Cleared existing teams');
  
  // Insert all corrected teams
  let inserted = 0;
  for (const team of teams) {
    await conn.execute(
      'INSERT INTO teams (seed, region, name, shortName, conference, isFirstFour) VALUES (?, ?, ?, ?, ?, ?)',
      [team.seed, team.region, team.name, team.shortName, team.conference || '', team.isFirstFour ? 1 : 0]
    );
    inserted++;
  }
  
  console.log(`Inserted ${inserted} teams`);
  
  // Verify
  const [rows] = await conn.execute('SELECT COUNT(*) as count FROM teams');
  console.log('Total teams in DB:', rows[0].count);
  
  // Check for duplicates
  const [dupes] = await conn.execute(
    'SELECT name, COUNT(*) as cnt FROM teams GROUP BY name HAVING cnt > 1'
  );
  if (dupes.length > 0) {
    console.log('DUPLICATE NAMES FOUND:', dupes.map(d => d.name).join(', '));
  } else {
    console.log('No duplicate names - all good!');
  }
  
  await conn.end();
}

main().catch(console.error);
