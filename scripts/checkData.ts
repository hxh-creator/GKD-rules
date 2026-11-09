import type { RawSubscription } from '@gkd-kit/api';

/** 快照链接必须来自 GKD 官方图床, 避免订阅中混入失效/非受信域名 */
const SNAPSHOT_HOST = 'https://i.gkd.li/';

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;

const asArray = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

const checkUrlList = (
  label: string,
  urls: string | string[] | undefined,
  errors: string[],
) => {
  if (urls === undefined) return;
  const list = asArray(urls);
  const seen = new Set<string>();
  for (const url of list) {
    if (!isNonEmptyString(url)) {
      errors.push(`${label}: 存在空链接`);
    } else if (!url.startsWith(SNAPSHOT_HOST)) {
      errors.push(`${label}: 链接不在 ${SNAPSHOT_HOST} 下 (${url})`);
    } else if (seen.has(url)) {
      errors.push(`${label}: 存在重复链接 (${url})`);
    }
    seen.add(url);
  }
};

/**
 * 校验 checkSubscription 未覆盖的数据不变量。
 *
 * @gkd-kit/tools 的 checkSubscription 只检查 id/分类命名/选择器语法/快照链接可达性,
 * 不检查规则 key、rules 结构、matches 非空以及 preKeys 等引用完整性。
 * 这些不变量一旦被破坏, GKD 客户端会出现规则无法命中、key 冲突或悬空引用等运行期问题,
 * 因此在提交前做纯离线校验(不访问网络)。
 */
export const checkData = (subscription: RawSubscription): void => {
  const errors: string[] = [];
  const appIds = new Set<string>();
  const categories = subscription.categories ?? [];
  const globalGroups = subscription.globalGroups ?? [];
  const apps = subscription.apps ?? [];
  const categoryNames = new Set(categories.map((c) => c.name));

  if (!Number.isInteger(subscription.version) || subscription.version < 0) {
    errors.push(`version 必须为非负整数 (当前 ${subscription.version})`);
  }
  if (!isNonEmptyString(subscription.id.toString())) {
    errors.push('订阅 id 为空');
  }

  categories.forEach((category, index) => {
    if (category.key !== index) {
      errors.push(
        `categories[${index}] key 应为 ${index}, 实际 ${category.key}`,
      );
    }
    if (!isNonEmptyString(category.name)) {
      errors.push(`categories[${index}] name 为空`);
    }
  });

  const globalGroupKeys = new Set<number>();
  for (const globalGroup of globalGroups) {
    const label = `globalGroups[${globalGroup.key}]`;
    if (
      !Number.isInteger(globalGroup.key) ||
      globalGroupKeys.has(globalGroup.key)
    ) {
      errors.push(`${label}: key 重复或非整数`);
    }
    globalGroupKeys.add(globalGroup.key);
    const matched = [...categoryNames].some(
      (name) =>
        globalGroup.name === name || globalGroup.name.startsWith(`${name}-`),
    );
    if (!matched) {
      errors.push(`${label}: name 未以任何类别开头 (${globalGroup.name})`);
    }
    if (
      globalGroup.disableIfAppGroupMatch !== undefined &&
      !categoryNames.has(globalGroup.disableIfAppGroupMatch)
    ) {
      errors.push(
        `${label}: disableIfAppGroupMatch 不是已定义类别 (${globalGroup.disableIfAppGroupMatch})`,
      );
    }
  }

  for (const app of apps) {
    const appLabel = `apps/${app.id}`;
    if (appIds.has(app.id)) {
      errors.push(`${appLabel}: app id 重复`);
    }
    appIds.add(app.id);
    if (!isNonEmptyString(app.name)) {
      errors.push(`${appLabel}: name 为空`);
    }
    if (app.groups.length === 0) {
      errors.push(`${appLabel}: groups 为空`);
      continue;
    }

    const groupKeys = new Set<number>();
    for (const group of app.groups) {
      const groupLabel = `${appLabel}#${group.key}(${group.name})`;
      if (!Number.isInteger(group.key) || groupKeys.has(group.key)) {
        errors.push(`${groupLabel}: group key 重复或非整数`);
      }
      groupKeys.add(group.key);
      const categoryMatched = [...categoryNames].some(
        (name) => group.name === name || group.name.startsWith(`${name}-`),
      );
      if (!categoryMatched) {
        errors.push(`${groupLabel}: name 未以 "类别-" 开头`);
      }
      checkUrlList(`${groupLabel} snapshotUrls`, group.snapshotUrls, errors);

      if (!Array.isArray(group.rules) || group.rules.length === 0) {
        errors.push(`${groupLabel}: rules 必须为非空数组`);
        continue;
      }
      const ruleKeys = new Set<number>();
      group.rules.forEach((ruleOrString, index) => {
        const ruleLabel = `${groupLabel}/rules[${index}]`;
        if (typeof ruleOrString === 'string') {
          errors.push(`${ruleLabel}: 规则必须为对象, 不能使用字符串简写`);
          return;
        }
        const rule = ruleOrString;
        const key: number | undefined = rule.key;
        if (key === undefined || !Number.isInteger(key)) {
          errors.push(`${ruleLabel}: rule key 缺失或非整数`);
        } else if (ruleKeys.has(key)) {
          errors.push(`${ruleLabel}: rule key 重复 (${key})`);
        } else {
          ruleKeys.add(key);
        }

        const matches = asArray(rule.matches);
        const anyMatches = asArray(rule.anyMatches);
        if (matches.length === 0 && anyMatches.length === 0) {
          errors.push(`${ruleLabel}: 缺少非空的 matches/anyMatches`);
        }
        for (const selector of [...matches, ...anyMatches]) {
          if (!isNonEmptyString(selector)) {
            errors.push(`${ruleLabel}: 存在空选择器`);
          }
        }

        const ownSnapshots = asArray(rule.snapshotUrls);
        if (
          ownSnapshots.length === 0 &&
          asArray(group.snapshotUrls).length === 0
        ) {
          errors.push(`${ruleLabel}: 规则与分组均无 snapshotUrls`);
        }
        checkUrlList(`${ruleLabel} snapshotUrls`, rule.snapshotUrls, errors);
        checkUrlList(
          `${ruleLabel} excludeSnapshotUrls`,
          rule.excludeSnapshotUrls,
          errors,
        );
      });

      const ruleKeySet = new Set(
        group.rules
          .filter(
            (rule): rule is Exclude<typeof rule, string> =>
              typeof rule !== 'string',
          )
          .map((rule) => rule.key),
      );
      for (const rule of group.rules) {
        if (typeof rule === 'string') continue;
        const refs: Array<[string, unknown]> = [
          ['preKeys', rule.preKeys],
          ['actionMaximumKey', rule.actionMaximumKey],
          ['actionCdKey', rule.actionCdKey],
        ];
        for (const [field, raw] of refs) {
          const values = asArray(raw as number | number[] | undefined);
          for (const value of values) {
            if (!ruleKeySet.has(value)) {
              errors.push(
                `${groupLabel}/rules[${rule.key}]: ${field} 引用了不存在的 rule key ${value}`,
              );
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    const unique = [...new Set(errors)];
    throw new Error(
      `数据校验失败 (${unique.length} 项):\n${unique.slice(0, 50).join('\n')}` +
        (unique.length > 50 ? `\n... 其余 ${unique.length - 50} 项省略` : ''),
    );
  }
};
