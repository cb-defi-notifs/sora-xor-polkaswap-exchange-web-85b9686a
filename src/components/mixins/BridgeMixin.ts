import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString } from '@sora-substrate/util';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { mutation, getter, state } from '@/store/decorators';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';
import type { EvmNetworkData, EvmNetworkId } from '@/consts/evm';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @state.web3.evmBalance evmBalance!: CodecString;
  @state.web3.evmNetwork evmNetwork!: EvmNetworkId;
  @state.bridge.evmBlockNumber evmBlockNumber!: number;

  @getter.web3.isValidNetwork isValidNetwork!: boolean;
  @getter.bridge.soraNetworkFee soraNetworkFee!: CodecString;
  @getter.bridge.evmNetworkFee evmNetworkFee!: CodecString;
  @getter.assets.xor xor!: RegisteredAccountAssetWithDecimals;

  @mutation.web3.setSelectNetworkDialogVisibility setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  get evmTokenSymbol(): string {
    return this.selectedEvmNetwork?.nativeCurrency?.symbol ?? '';
  }
}
