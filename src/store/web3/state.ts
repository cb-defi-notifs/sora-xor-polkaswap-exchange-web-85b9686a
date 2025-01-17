import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/util/build/bridgeProxy/evm/consts';

import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';

import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: '', // external evm address
    subAddress: '', // external sub address

    networkType: ethersUtil.getSelectedBridgeType() ?? BridgeNetworkType.EvmLegacy,
    networkSelected: null, // network selected by user
    evmNetworkProvided: null, // evm network in provider

    evmNetworkApps: [], // evm networks from app config
    subNetworkApps: {}, // sub netowrks from app config

    supportedApps: {
      [BridgeNetworkType.EvmLegacy]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    }, // supported apps from chain

    // eth bridge history
    ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
    ethBridgeContractAddress: {
      XOR: '',
      VAL: '',
      OTHER: '',
    },

    // dialogs
    selectNetworkDialogVisibility: false,
    selectAccountDialogVisibility: false,
  };
}

const state = initialState();

export default state;
