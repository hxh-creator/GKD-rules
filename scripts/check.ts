import subscription from '../src/subscription';
import { checkSubscription, checkApiVersion } from '@gkd-kit/tools';
import { checkData } from './checkData';

await checkApiVersion();

checkSubscription(subscription);

checkData(subscription);

export default subscription;
