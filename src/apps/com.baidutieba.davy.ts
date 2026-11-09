import { defineGkdApp } from '@gkd-kit/define';

export default defineGkdApp({
  id: 'com.baidutieba.davy',
  name: '贴吧一键签到大师',
  groups: [
    {
      key: 1,
      name: '全屏广告-内部弹窗广告',
      activityIds: 'com.davy.commonlibrary.utils.DialogUtil',
      rules: [
        {
          key: 0,
          matches: '[id="com.baidutieba.davy:id/exit"]',
          snapshotUrls: 'https://i.gkd.li/i/12504289',
        },
        {
          key: 1,
          matches: '[id="com.baidutieba.davy:id/mimo_interstitial_close_img"]',
          snapshotUrls: 'https://i.gkd.li/i/12504291',
        },
      ],
    },
  ],
});
