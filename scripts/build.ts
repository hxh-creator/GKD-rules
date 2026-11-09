import path from 'node:path';
import { updateDist } from '@gkd-kit/tools';
import { updateReadMeMd } from './updateReadMeMd';
import subscription from './check';

// 统一工作目录到仓库根目录: updateDist 内部基于 process.cwd() 定位 dist,
// 而 updateReadMeMd 基于 import.meta.dirname 定位, 二者必须指向同一仓库根, 避免从非根目录运行时错位
process.chdir(path.resolve(import.meta.dirname, '..'));

// 仅在订阅内容确有变更(updateDist 返回 true 并已重新生成 dist/README.md)时才更新根 README,
// 避免在无变更且 dist/README.md 缺失时读取失败; 同时保留"有更新/无更新"的显式信号
const changed = await updateDist(subscription);

if (changed) {
  await updateReadMeMd();
}
