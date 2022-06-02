import { defineGetters } from 'direct-vuex';

import { demeterFarmingGetterContext } from './index';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterFarmingState } from './types';

const getters = defineGetters<DemeterFarmingState>()({
  farmingPools(...args): Array<DemeterPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.pools.filter((pool) => !!pool.isFarm);
  },
  stakingPools(...args): Array<DemeterPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.pools.filter((pool) => !pool.isFarm);
  },
  accountFarmingPools(...args): Array<DemeterAccountPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.accountPools.filter((pool) => !!pool.isFarm);
  },
  accountStakingPools(...args): Array<DemeterAccountPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.accountPools.filter((pool) => !pool.isFarm);
  },
});

export default getters;
