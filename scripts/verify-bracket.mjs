import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./scripts/correct-teams-2026.json', 'utf8'));

const byRS = (r, s) => data.filter(t => t.region === r && t.seed === s && !t.isFirstFour).map(t => t.shortName);

// Verify all Round of 64 matchups from NCAA tip times
const checks = [
  // East
  ['East', 8, 'Ohio State'], ['East', 9, 'TCU'],
  ['East', 11, 'USF'], ['East', 6, 'Louisville'],
  ['East', 16, 'Siena'], ['East', 1, 'Duke'],
  ['East', 14, 'NDSU'], ['East', 3, 'Michigan St'],
  ['East', 12, 'Northern Iowa'], ['East', 5, "St. John's"],
  ['East', 10, 'UCF'], ['East', 7, 'UCLA'],
  ['East', 13, 'Cal Baptist'], ['East', 4, 'Kansas'],
  ['East', 15, 'Furman'], ['East', 2, 'UConn'],
  // West
  ['West', 16, 'LIU'], ['West', 1, 'Arizona'],
  ['West', 9, 'Utah State'], ['West', 8, 'Villanova'],
  ['West', 12, 'High Point'], ['West', 5, 'Wisconsin'],
  ['West', 13, 'Hawaii'], ['West', 4, 'Arkansas'],
  ['West', 10, 'Missouri'], ['West', 7, 'Miami'],
  ['West', 14, 'Kennesaw St'], ['West', 3, 'Gonzaga'],
  ['West', 15, 'Queens'], ['West', 2, 'Purdue'],
  // Midwest
  ['Midwest', 9, 'Saint Louis'], ['Midwest', 8, 'Georgia'],
  ['Midwest', 10, 'Santa Clara'], ['Midwest', 7, 'Kentucky'],
  ['Midwest', 12, 'Akron'], ['Midwest', 5, 'Texas Tech'],
  ['Midwest', 13, 'Hofstra'], ['Midwest', 4, 'Alabama'],
  ['Midwest', 14, 'Wright State'], ['Midwest', 3, 'Virginia'],
  ['Midwest', 15, 'Tennessee St'], ['Midwest', 2, 'Iowa State'],
  // South
  ['South', 13, 'Troy'], ['South', 4, 'Nebraska'],
  ['South', 12, 'McNeese'], ['South', 5, 'Vanderbilt'],
  ['South', 11, 'VCU'], ['South', 6, 'UNC'],
  ['South', 10, 'Texas A&M'], ['South', 7, "Saint Mary's"],
  ['South', 14, 'Penn'], ['South', 3, 'Illinois'],
  ['South', 15, 'Idaho'], ['South', 2, 'Houston'],
  ['South', 9, 'Iowa'], ['South', 8, 'Clemson'],
  ['South', 1, 'Florida'],
];

let ok = 0, fail = 0;
checks.forEach(([region, seed, expected]) => {
  const teams = byRS(region, seed);
  if (teams.includes(expected)) { ok++; }
  else { console.log('MISMATCH: ' + region + ' #' + seed + ' expected ' + expected + ' got ' + teams.join('/')); fail++; }
});
console.log('Checks passed: ' + ok + '/' + (ok+fail));

// Verify First Four
const ff = data.filter(t => t.isFirstFour);
console.log('\nFirst Four matchups:');
const ffGroups = {};
ff.forEach(t => {
  const key = t.region + '-' + t.seed;
  if (!ffGroups[key]) ffGroups[key] = [];
  ffGroups[key].push(t.shortName);
});
Object.entries(ffGroups).forEach(([key, teams]) => {
  console.log('  ' + key + ': ' + teams.join(' vs '));
});
