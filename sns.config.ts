export const snsConfig = {
  defaultPlatform: 'twitter' as 'twitter' | 'instagram',
  platforms: {
    twitter: {
      enabled: true,
    },
    instagram: {
      enabled: false, // 将来対応
    },
  },
};
