import path from 'node:path';
import { updateDist } from '@gkd-kit/tools';
import subscription from './check';

// updateDist 内部用 process.cwd() 定位 dist 目录, 统一切到仓库根,
// 保证从任意工作目录执行 pnpm build 都写入同一份 dist
process.chdir(path.resolve(import.meta.dirname, '..'));

const changed = await updateDist(subscription);

if (!changed) {
  console.log('订阅内容无变更, 跳过 dist 写入');
}
