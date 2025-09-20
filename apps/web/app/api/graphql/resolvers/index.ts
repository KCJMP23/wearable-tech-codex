import { mergeResolvers } from '@graphql-tools/merge';
import { userResolvers } from './user';
import { siteResolvers } from './site';
import { productResolvers } from './product';
import { postResolvers } from './post';
import { themeResolvers } from './theme';
import { analyticsResolvers } from './analytics';
import { valuationResolvers } from './valuation';
import { marketplaceResolvers } from './marketplace';
import { notificationResolvers } from './notification';
import { affiliateNetworkResolvers } from './affiliateNetwork';
import { emailResolvers } from './email';
import { baseResolvers } from './base';

export const resolvers = mergeResolvers([
  baseResolvers,
  userResolvers,
  siteResolvers,
  productResolvers,
  postResolvers,
  themeResolvers,
  analyticsResolvers,
  valuationResolvers,
  marketplaceResolvers,
  notificationResolvers,
  affiliateNetworkResolvers,
  emailResolvers,
]);