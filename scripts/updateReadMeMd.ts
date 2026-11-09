import fs from 'node:fs/promises';
import path from 'node:path';
import JSON5 from 'json5';

// 仓库根目录（scripts 的上一级），避免受运行时工作目录影响
const repoRoot = path.resolve(import.meta.dirname, '..');

// 从 README.md 中解析出 GROUP_SIZE、GLOBALGROUP_SIZE 和 VERSION 的值
const parseReadMeMd = async () => {
  const readmePath = path.join(repoRoot, 'dist/README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf-8');

  // 使用正则表达式匹配需要的值
  const groupSizeMatch = readmeContent.match(/\|应用规则\|(\d+)\|/);
  const globalGroupSizeMatch = readmeContent.match(/\|全局规则\|(\d+)\|/);
  const appSizeMatch = readmeContent.match(/\|应用\|(\d+)\|/);

  // 版本号从构建产物 version 文件读取, 避免在 README 全文用宽松正则误匹配到其它 "v数字"
  const versionFilePath = path.join(
    repoRoot,
    'dist/hxh-creator_gkd.version.json5',
  );
  const { version } = JSON5.parse(await fs.readFile(versionFilePath, 'utf-8'));

  // 解析失败的值会导致 README.md 写入空数据, 直接报错终止构建
  if (
    !appSizeMatch?.[1] ||
    !groupSizeMatch?.[1] ||
    !globalGroupSizeMatch?.[1] ||
    version === undefined ||
    version === null
  ) {
    throw new Error(
      'dist/README.md 或 version 文件中未能解析出全部统计值(应用/应用规则/全局规则/版本), 请检查 dist 产物是否已生成',
    );
  }

  return {
    APP_SIZE: appSizeMatch[1],
    GROUP_SIZE: groupSizeMatch[1],
    GLOBALGROUP_SIZE: globalGroupSizeMatch[1],
    VERSION: String(version),
  };
};

// 更新 README.md 的模板内容并写入文件
export const updateReadMeMd = async () => {
  const { APP_SIZE, GROUP_SIZE, GLOBALGROUP_SIZE, VERSION } =
    await parseReadMeMd();

  const mdTemplatePath = path.join(repoRoot, 'Template.md');
  const readmeMdPath = path.join(repoRoot, 'README.md');

  const mdTemplate = await fs.readFile(mdTemplatePath, 'utf-8');

  // 替换模板中的占位符(统一用 replaceAll, 避免模板中同一占位符出现多次时漏替换)
  const readMeMdText = mdTemplate
    .replaceAll('--APP_SIZE--', APP_SIZE)
    .replaceAll('--GROUP_SIZE--', GROUP_SIZE)
    .replaceAll('--GLOBALGROUP_SIZE--', GLOBALGROUP_SIZE)
    .replaceAll('--VERSION--', VERSION);

  // 校验所有占位符都已被替换, 避免把模板原文写入 README.md
  const leftover = readMeMdText.match(/--\w+--/g);
  if (leftover) {
    throw new Error(
      `README.md 模板占位符未被替换: ${[...new Set(leftover)].join('、')}`,
    );
  }

  // 写入 README.md 文件
  await fs.writeFile(readmeMdPath, readMeMdText);
};
