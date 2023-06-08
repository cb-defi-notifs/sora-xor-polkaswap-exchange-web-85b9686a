import { defineGetters } from 'direct-vuex';
import { connection } from '@soramitsu/soraneo-wallet-web';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

import { settingsGetterContext } from '@/store/settings';
import { LiquiditySourceForMarketAlgorithm } from '@/consts';
import type { NodesHashTable, IndexersHashTable, SettingsState } from './types';
import type { Node } from '@/types/nodes';
import type { Indexer } from '@/types/indexers';

const getters = defineGetters<SettingsState>()({
  defaultNodesHashTable(...args): NodesHashTable {
    const { state } = settingsGetterContext(args);
    return state.defaultNodes.reduce<NodesHashTable>((result, node: Node) => ({ ...result, [node.address]: node }), {});
  },
  customNodes(...args): Array<Node> {
    const { state, getters } = settingsGetterContext(args);
    return state.customNodes.filter((node) => !(node.address in getters.defaultNodesHashTable));
  },
  nodeList(...args): Array<Node> {
    const { state, getters } = settingsGetterContext(args);
    return [...state.defaultNodes, ...getters.customNodes];
  },
  nodeIsConnecting(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.nodeAddressConnecting;
  },
  nodeIsConnected(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.node?.address && !state.nodeAddressConnecting && connection.opened;
  },
  defaultIndexersHashTable(...args): IndexersHashTable {
    const { state } = settingsGetterContext(args);
    return state.defaultIndexers.reduce<IndexersHashTable>(
      (result, indexer: Indexer) => ({ ...result, [indexer.address]: indexer }),
      {}
    );
  },
  indexerList(...args): Array<Indexer> {
    const { state, getters } = settingsGetterContext(args);
    return [...state.defaultIndexers];
  },
  liquiditySource(...args): LiquiditySourceTypes {
    const { state } = settingsGetterContext(args);
    return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm];
  },
  moonpayApiKey(...args): string {
    const { rootState } = settingsGetterContext(args);
    return rootState.wallet.settings.apiKeys.moonpay;
  },
  moonpayEnabled(...args): boolean {
    const { state, getters } = settingsGetterContext(args);
    return !!getters.moonpayApiKey && !!state.featureFlags.moonpay;
  },
  chartsFlagEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.featureFlags.charts;
  },
  chartsEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return !!state.featureFlags.charts && state.сhartsEnabled;
  },
  soraCardEnabled(...args): Nullable<boolean> {
    const { state } = settingsGetterContext(args);
    return state.featureFlags.soraCard;
  },
  notificationActivated(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.browserNotifsPermission === 'granted';
  },
  isInternetConnectionEnabled(...args): boolean {
    const { state } = settingsGetterContext(args);
    return state.internetConnection ?? navigator.onLine;
  },
  internetConnectionSpeedMb(...args): number {
    const { state } = settingsGetterContext(args);
    return state.internetConnectionSpeed ?? ((navigator as any)?.connection?.downlink as number) ?? 0;
  },
  /** Stable Connection - more or equal **1 Mb/s** */
  isInternetConnectionStable(...args): boolean {
    const { getters } = settingsGetterContext(args);
    // `!getters.internetConnectionSpeedMb` for the case when `navigator.connection` isn't supported
    return getters.internetConnectionSpeedMb >= 1 || !getters.internetConnectionSpeedMb;
  },
});

export default getters;
