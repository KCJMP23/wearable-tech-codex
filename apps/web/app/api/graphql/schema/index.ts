import { mergeTypeDefs } from '@graphql-tools/merge';
import { baseTypeDefs } from './base';
import { userTypeDefs } from './user';
import { siteTypeDefs } from './site';
import { productTypeDefs } from './product';
import { postTypeDefs } from './post';
import { themeTypeDefs } from './theme';
import { analyticsTypeDefs } from './analytics';
import { valuationTypeDefs } from './valuation';
import { marketplaceTypeDefs } from './marketplace';
import { notificationTypeDefs } from './notification';
import { affiliateNetworkTypeDefs } from './affiliateNetwork';
import { emailTypeDefs } from './email';

export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  userTypeDefs,
  siteTypeDefs,
  productTypeDefs,
  postTypeDefs,
  themeTypeDefs,
  analyticsTypeDefs,
  valuationTypeDefs,
  marketplaceTypeDefs,
  notificationTypeDefs,
  affiliateNetworkTypeDefs,
  emailTypeDefs,
]);