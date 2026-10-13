// Public project information shared by the website and both guide modes.
export const siteInfo = Object.freeze({
  name: 'Purrvival',
  tokenSymbol: '$PURRZ',
  contract: process.env.NEXT_PUBLIC_VLADCAT_TOKEN_CA?.trim() || '0xc4a86cC4e5958440A7Ca3f4053B7C2497a032fB3',
  buyUrl: 'https://clank.trade/coin/0xc4a86cc4e5958440a7ca3f4053b7c2497a032fb3',
  xUrl: process.env.NEXT_PUBLIC_VLADCAT_X_URL?.trim() || 'https://x.com/purrvival_',
  telegramUrl: process.env.NEXT_PUBLIC_VLADCAT_TELEGRAM_URL?.trim() || 'https://t.me/pawpurrz',
  origin: 'https://purrvival.fun',
});
