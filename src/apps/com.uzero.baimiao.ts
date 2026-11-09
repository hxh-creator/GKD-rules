import { defineGkdApp } from '@gkd-kit/define';

export default defineGkdApp({
  id: 'com.uzero.baimiao',
  name: '白描',
  groups: [
    {
      key: 1,
      name: '功能类-自动点击截取全屏',
      rules: [
        {
          key: 0,
          fastQuery: true,
          activityIds: '.ui.screen.ScreenCaptureActivity',
          matches: '[text="截取全屏"]',
          snapshotUrls: 'https://i.gkd.li/i/23054772',
        },
      ],
    },
  ],
});
