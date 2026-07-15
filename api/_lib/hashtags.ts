// @ts-nocheck
const KEYWORD_TAGS: [RegExp, string][] = [
  [/china/i, '#China'],
  [/pakistan/i, '#Pakistan'],
  [/russia/i, '#Russia'],
  [/ukraine/i, '#Ukraine'],
  [/\b(us|u\.s\.|america|washington)\b/i, '#USA'],
  [/israel|gaza|palestin/i, '#MiddleEast'],
  [/iran/i, '#Iran'],
  [/taiwan/i, '#Taiwan'],
  [/trade|tariff/i, '#Trade'],
  [/defense|defence|military|army|navy|air force/i, '#Defense'],
  [/energy|oil|gas pipeline/i, '#Energy'],
  [/border|loc\b/i, '#Border'],
  [/security|terror/i, '#Security'],
  [/economy|economic|gdp/i, '#Economy'],
  [/diplomat|foreign policy|bilateral/i, '#Diplomacy']
];

export function getHashtags(title: string, max = 4): string {
  const tags = ['#Geopolitics', '#India'];
  for (const [pattern, tag] of KEYWORD_TAGS) {
    if (tags.length >= max) break;
    if (pattern.test(title) && !tags.includes(tag)) tags.push(tag);
  }
  return tags.join(' ');
}
