import knowledgeRepoBg from '../assets/knowledge-repository-bg.png';

/**
 * Application & UI Configuration Object
 * Easily customize branding, assets, and component behavior from a single configuration source.
 */

export interface HeroCardConfig {
  backgroundImage: string;
  overlayOpacity?: number;
}

export interface AppConfig {
  heroCard: HeroCardConfig;
}

export const appConfig: AppConfig = {
  heroCard: {
    backgroundImage: knowledgeRepoBg || '/assets/knowledge-repository-bg.png',
    overlayOpacity: 0.6
  }
};

export default appConfig;
