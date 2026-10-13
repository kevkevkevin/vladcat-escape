import { ContractAddress } from './ContractAddress';
import { siteInfo } from '@/game/site-info.mjs';

export function TokenLinks() {
  return <div className="token-links"><ContractAddress contract={siteInfo.contract} /><div className="social-links"><a className="button purr-buy-button" href={siteInfo.buyUrl} target="_blank" rel="noopener noreferrer">BUY {siteInfo.tokenSymbol} ↗</a><a className="button secondary" href={siteInfo.xUrl} target="_blank" rel="noopener noreferrer">Follow on X ↗</a><a className="button secondary" href={siteInfo.telegramUrl} target="_blank" rel="noopener noreferrer">Join Telegram ↗</a></div></div>;
}
