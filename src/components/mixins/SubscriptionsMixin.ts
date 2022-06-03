import { Component, Watch, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { getter } from '@/store/decorators';

@Component
export default class SubscriptionsMixin extends Mixins(mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  startSubscriptionsList: AsyncVoidFn[] = [];
  resetSubscriptionsList: AsyncVoidFn[] = [];

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async restartSubscriptions(value: boolean) {
    if (value) {
      await this.updateSubscriptions();
    } else {
      await this.resetSubscriptions();
    }
  }

  async mounted(): Promise<void> {
    await this.updateSubscriptions();
  }

  async beforeDestroy(): Promise<void> {
    await this.resetSubscriptions();
  }

  public setStartSubscriptions(list: AsyncVoidFn[]) {
    this.startSubscriptionsList = list;
  }

  public setResetSubscriptions(list: AsyncVoidFn[]) {
    this.resetSubscriptionsList = list;
  }

  /**
   * Update subscriptions
   * If this page is loaded first time by url, "watch" & "mounted" call this method
   */
  private async updateSubscriptions(): Promise<void> {
    // return if updateSubscription is already called by "watch" or "mounted"
    if (this.loading) return;

    await this.withLoading(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        await Promise.all(this.startSubscriptionsList.map((fn) => fn?.()));
      });
    });
  }

  private async resetSubscriptions(): Promise<void> {
    await Promise.all(this.resetSubscriptionsList.map((fn) => fn?.()));
  }
}