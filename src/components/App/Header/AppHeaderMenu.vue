<template>
  <div class="app-header-menu">
    <s-button
      v-if="!isLargeDesktop"
      type="action"
      class="settings-control s-pressed"
      :tooltip="t('headerMenu.settings')"
      @click="handleClickHeaderMenu"
    >
      <s-dropdown
        ref="headerMenu"
        class="header-menu__button"
        popper-class="header-menu"
        icon="grid-block-align-left-24"
        type="ellipsis"
        placement="bottom-start"
        @select="handleSelectHeaderMenu"
      >
        <template #menu>
          <s-dropdown-item
            v-for="{ value, icon, text, disabled } in dropdownHeaderMenuItems"
            :key="value"
            class="header-menu__item"
            :data-test-name="value"
            :icon="icon"
            :value="value"
            :disabled="disabled"
          >
            {{ text }}
          </s-dropdown-item>
          <div @click="openNotificationDialog" class="notif-option el-dropdown-menu__item header-menu__item">
            <bell-icon class="notif-option__bell notif-option__bell--dropdown"></bell-icon>
            <span class="notif-option__text">{{ t('browserNotificationDialog.title') }}</span>
          </div>
        </template>
      </s-dropdown>
    </s-button>
    <template v-else>
      <s-button
        v-for="{ value, icon, text, disabled } in headerMenuItems"
        :key="value"
        type="action"
        class="s-pressed"
        :tooltip="text"
        @click="handleSelectHeaderMenu(value)"
        :disabled="disabled"
      >
        <s-icon :name="icon" :size="iconSize" />
      </s-button>
      <s-button
        type="action"
        :tooltip="t('browserNotificationDialog.button')"
        @click="openNotificationDialog"
        class="notif-option s-pressed el-dropdown-menu__item header-menu__item"
      >
        <bell-icon class="notif-option__bell notif-option__bell--large"></bell-icon>
      </s-button>
    </template>
  </div>
</template>

<script lang="ts">
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import { Component, Mixins } from 'vue-property-decorator';

import BellIcon from '@/assets/img/browser-notification/bell.svg?inline';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, mutation, state } from '@/store/decorators';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  Theme = 'theme',
  Language = 'language',
  Notification = 'notification',
  Disclaimer = 'disclaimer',
}

type MenuItem = {
  value: HeaderMenuType;
  icon: string;
  text: string;
  disabled?: boolean;
};

const BREAKPOINT = 1440;

@Component({
  components: {
    BellIcon,
  },
})
export default class AppHeaderMenu extends Mixins(TranslationMixin) {
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;

  @state.settings.disclaimerVisibility disclaimerVisibility!: boolean;
  @state.settings.userDisclaimerApprove userDisclaimerApprove!: boolean;
  @state.wallet.settings.shouldBalanceBeHidden private shouldBalanceBeHidden!: boolean;

  @getter.libraryTheme private libraryTheme!: Theme;
  @getter.settings.notificationActivated notificationActivated!: boolean;

  @mutation.wallet.settings.toggleHideBalance private toggleHideBalance!: FnWithoutArgs;
  @mutation.settings.setAlertSettingsPopup private setAlertSettingsPopup!: (flag: boolean) => void;
  @mutation.settings.setSelectLanguageDialogVisibility private setLanguageDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.toggleDisclaimerDialogVisibility private toggleDisclaimerDialogVisibility!: FnWithoutArgs;

  isLargeDesktop: boolean = window.innerWidth >= BREAKPOINT;

  private updateLargeDesktopFlag(e: MediaQueryListEvent): void {
    this.isLargeDesktop = e.matches;
  }

  get mediaQueryList(): MediaQueryList {
    return window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
  }

  private getThemeIcon(isDropdown = false): string {
    if (isDropdown) {
      return this.libraryTheme === Theme.LIGHT ? 'various-moon-24' : 'various-brightness-low-24';
    } else {
      return this.libraryTheme === Theme.LIGHT ? 'various-brightness-low-24' : 'various-moon-24';
    }
  }

  get themeTitle(): string {
    return this.libraryTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
  }

  get themeText(): string {
    const theme = this.t(this.themeTitle);
    return this.t('headerMenu.switchTheme', { theme });
  }

  get disclaimerText(): string {
    return this.disclaimerVisibility ? this.t('headerMenu.hideDisclaimer') : this.t('headerMenu.showDisclaimer');
  }

  private getHideBalancesIcon(isDropdown = false): string {
    if (isDropdown) {
      return this.shouldBalanceBeHidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
    } else {
      return this.shouldBalanceBeHidden ? 'basic-filterlist-24' : 'basic-eye-no-24';
    }
  }

  get hideBalancesText(): string {
    return this.t(`headerMenu.${this.shouldBalanceBeHidden ? 'showBalances' : 'hideBalances'}`);
  }

  private getHeaderMenuItems(isDropdown = false): Array<MenuItem> {
    return [
      {
        value: HeaderMenuType.HideBalances,
        icon: this.getHideBalancesIcon(isDropdown),
        text: this.hideBalancesText,
      },
      {
        value: HeaderMenuType.Theme,
        icon: this.getThemeIcon(isDropdown),
        text: this.themeText,
      },
      {
        value: HeaderMenuType.Language,
        icon: 'basic-globe-24',
        text: this.t('headerMenu.switchLanguage'),
      },
      {
        value: HeaderMenuType.Disclaimer,
        icon: 'info-16',
        text: this.disclaimerText,
        disabled: this.discalimerDisabled,
      },
    ];
  }

  get headerMenuItems(): Array<MenuItem> {
    return this.getHeaderMenuItems();
  }

  get dropdownHeaderMenuItems(): Array<MenuItem> {
    return this.getHeaderMenuItems(true);
  }

  get discalimerDisabled(): boolean {
    return this.disclaimerVisibility && !this.userDisclaimerApprove;
  }

  mounted(): void {
    this.mediaQueryList.addEventListener('change', this.updateLargeDesktopFlag);
  }

  beforeDestroy(): void {
    this.mediaQueryList.removeEventListener('change', this.updateLargeDesktopFlag);
  }

  openNotificationDialog(): void {
    this.setAlertSettingsPopup(true);
  }

  handleClickHeaderMenu(): void {
    const dropdown = (this.$refs.headerMenu as any).dropdown;
    dropdown.visible ? dropdown.hide() : dropdown.show();
  }

  handleSelectHeaderMenu(value: HeaderMenuType): void {
    switch (value) {
      case HeaderMenuType.HideBalances:
        this.toggleHideBalance();
        break;
      case HeaderMenuType.Theme:
        switchTheme();
        break;
      case HeaderMenuType.Language:
        this.setLanguageDialogVisibility(true);
        break;
      case HeaderMenuType.Disclaimer:
        if (this.discalimerDisabled) return;
        this.toggleDisclaimerDialogVisibility();
        break;
    }
  }
}
</script>

<style lang="scss">
$icon-size: 28px;

.app-header-menu {
  display: flex;
}

.header-menu {
  $dropdown-background: var(--s-color-utility-body);
  $dropdown-margin: 24px;
  $dropdown-item-line-height: 42px;

  &.el-dropdown-menu.el-popper {
    margin-top: $dropdown-margin;
    background-color: $dropdown-background;
    border-color: var(--s-color-base-border-secondary);
    .popper__arrow {
      display: none;
    }
  }
  &__button i {
    font-size: $icon-size !important; // cuz font-size is inline style
  }
  & &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 300;
    font-size: var(--s-font-size-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: center;
    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }
    &:not(.is-disabled) {
      &:hover,
      &:focus {
        background-color: transparent;
        &,
        i {
          color: var(--s-color-base-content-secondary);
        }
      }
    }
  }
}

.notif-option {
  display: flex;

  &__bell {
    width: $icon-size;
    height: $icon-size;
    margin: auto 0;
  }

  &__bell--dropdown {
    margin-top: $inner-spacing-mini;
    margin-right: $basic-spacing-mini;
    color: var(--s-color-base-content-tertiary);
  }

  &:hover &__bell--dropdown {
    color: var(--s-color-base-content-secondary);
  }
}

.el-dropdown-menu__item.header-menu__item.is-disabled {
  pointer-events: initial;
  cursor: not-allowed;
}
</style>
