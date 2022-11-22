import { Component, Mixins, Prop } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import AccountPoolMixin from './AccountPoolMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getter } from '@/store/decorators';

import { getAssetBalance, formatDecimalPlaces } from '@/utils';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';
import { ZeroStringValue } from '@/consts';

@Component
export default class PoolMixin extends Mixins(AccountPoolMixin, TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly liquidity!: AccountLiquidity;

  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  get isFarm(): boolean {
    return !!this.pool?.isFarm;
  }

  get activeStatus(): boolean {
    return !this.pool?.isRemoved;
  }

  get hasStake(): boolean {
    return this.accountPool ? !this.lockedFunds.isZero() : false;
  }

  get baseAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.liquidity?.firstAddress);
  }

  get baseAssetDecimals(): number {
    return this.baseAsset?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get poolAsset(): Nullable<AccountAsset> {
    return this.getAsset(this.pool?.poolAsset);
  }

  get poolAssetSymbol(): string {
    return this.poolAsset?.symbol ?? '';
  }

  get poolAssetDecimals(): number {
    return this.poolAsset?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get poolAssetAddress(): string {
    return this.poolAsset?.address ?? '';
  }

  get poolAssetPrice(): FPNumber {
    return this.poolAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.poolAsset) ?? 0) : FPNumber.ZERO;
  }

  get baseAssetPrice(): FPNumber {
    return this.baseAsset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.baseAsset) ?? 0) : FPNumber.ZERO;
  }

  get liqudityLP(): FPNumber {
    return FPNumber.fromCodecValue(getAssetBalance(this.liquidity, { parseAsLiquidity: true }) ?? 0);
  }

  get baseAssetBalance(): FPNumber {
    if (!this.baseAsset) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getAssetBalance(this.baseAsset) ?? 0, this.baseAssetDecimals);
  }

  get poolAssetBalance(): FPNumber {
    if (!this.poolAsset) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getAssetBalance(this.poolAsset) ?? 0, this.poolAssetDecimals);
  }

  get poolAssetBalanceFormatted(): string {
    return this.poolAssetBalance.toLocaleString();
  }

  get poolAssetBalanceFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.poolAssetBalance, this.poolAsset as AccountAsset);
  }

  get tokenInfo(): Nullable<DemeterRewardToken> {
    return this.tokenInfos[this.pool?.rewardAsset];
  }

  get depositFee(): number {
    return this.pool?.depositFee ?? 0;
  }

  get depositFeeFormatted(): string {
    return `${this.depositFee * 100}%`;
  }

  get funds(): FPNumber {
    return this.isFarm ? this.liqudityLP : this.poolAssetBalance;
  }

  get lockedFunds(): FPNumber {
    return this.accountPool?.pooledTokens ?? FPNumber.ZERO;
  }

  get availableFunds(): FPNumber {
    return this.isFarm ? (FPNumber.max(this.lockedFunds, this.funds) as FPNumber).sub(this.lockedFunds) : this.funds;
  }

  get depositDisabled(): boolean {
    return !this.activeStatus || this.availableFunds.isZero();
  }

  get poolShare(): FPNumber {
    if (!this.isFarm) return this.lockedFunds;

    if (this.funds.isZero()) return FPNumber.ZERO;
    // use .min because pooled LP could be greater that liquiduty LP
    return (FPNumber.min(this.lockedFunds, this.funds) as FPNumber).div(this.funds).mul(FPNumber.HUNDRED);
  }

  get poolShareFormatted(): string {
    return this.poolShare.toLocaleString() + (this.isFarm ? '%' : '');
  }

  get poolShareFiat(): Nullable<string> {
    if (this.isFarm) return null;

    return this.getFiatAmountByFPNumber(this.poolShare, this.poolAsset as AccountAsset);
  }

  get poolShareText(): string {
    return this.isFarm
      ? this.t('demeterFarming.info.poolShare')
      : this.t('demeterFarming.info.stake', { symbol: this.poolAssetSymbol });
  }

  get tvl(): string {
    if (!this.pool) return ZeroStringValue;

    if (this.isFarm) {
      // calc liquidty locked price through account liquidity
      const liquidityLockedPrice = FPNumber.fromCodecValue(this.liquidity.firstBalance)
        .div(this.liqudityLP)
        .mul(this.pool.totalTokensInPool)
        .mul(this.baseAssetPrice)
        .mul(new FPNumber(2));

      return formatDecimalPlaces(liquidityLockedPrice);
    } else {
      const assetLockedPrice = this.pool.totalTokensInPool.mul(this.poolAssetPrice);

      return formatDecimalPlaces(assetLockedPrice);
    }
  }

  get tvlFormatted(): string {
    return `$${this.tvl}`;
  }

  get liquidityInPool(): FPNumber {
    if (this.isFarm) {
      const accountPoolShare = new FPNumber(this.liquidity.poolShare).div(FPNumber.HUNDRED);
      const lpTokens = this.liqudityLP.div(accountPoolShare);
      const liquidityLockedPercent = this.pool.totalTokensInPool.div(lpTokens);
      // calc pool price through account liquidity
      const wholeLiquidityPrice = FPNumber.fromCodecValue(this.liquidity.firstBalance, this.baseAsset?.decimals)
        .mul(this.baseAssetPrice)
        .mul(new FPNumber(2))
        .div(accountPoolShare);

      return liquidityLockedPercent.mul(wholeLiquidityPrice);
    } else {
      // if stake is empty, show arp if user will stake all his tokens
      const liquidityTokens = this.pool.totalTokensInPool.isZero()
        ? this.poolAssetBalance
        : this.pool.totalTokensInPool;
      return liquidityTokens.mul(this.poolAssetPrice);
    }
  }

  // allocation * token_per_block * multiplier
  get emission(): FPNumber {
    const allocation =
      (this.isFarm ? this.tokenInfo?.farmsAllocation : this.tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = this.tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;
    const poolMultiplier = new FPNumber(this.pool.multiplier);
    const tokenMultiplier = new FPNumber(
      (this.isFarm ? this.tokenInfo?.farmsTotalMultiplier : this.tokenInfo?.stakingTotalMultiplier) ?? 0
    );
    const multiplier = poolMultiplier.div(tokenMultiplier);

    return allocation.mul(tokenPerBlock).mul(multiplier);
  }

  // allocation * token_per_block * multiplier * 5256000 * reward_token_price / liquidityInPool * 100
  get apr(): FPNumber {
    if (!this.pool || (this.isFarm && !this.liquidity) || this.liquidityInPool.isZero()) return FPNumber.ZERO;

    const blocksPerYear = new FPNumber(5_256_000);

    return this.emission.mul(blocksPerYear).mul(this.rewardAssetPrice).div(this.liquidityInPool).mul(FPNumber.HUNDRED);
  }

  get aprFormatted(): string {
    return formatDecimalPlaces(this.apr, true);
  }

  get emitParams(): object {
    return {
      poolAsset: this.pool.poolAsset,
      rewardAsset: this.pool.rewardAsset,
    };
  }

  add(): void {
    this.$emit('add', this.emitParams);
  }

  remove(): void {
    this.$emit('remove', this.emitParams);
  }

  claim(): void {
    this.$emit('claim', this.emitParams);
  }

  calculator(): void {
    this.$emit('calculator', this.emitParams);
  }
}
