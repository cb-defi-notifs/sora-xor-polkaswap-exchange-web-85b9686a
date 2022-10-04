import { Operation, BridgeTxStatus } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { Subscription } from 'rxjs';
import type { BridgeHistory, BridgeApprovedRequest } from '@sora-substrate/util';

import { delay } from '@/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { waitForEvmTransactionStatus } from '@/utils/bridge/utils';

const SORA_REQUESTS_TIMEOUT = 6_000; // Block production time

export const isUnsignedFromPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return !tx.ethereumHash;
  } else {
    return true;
  }
};

export const isUnsignedToPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.ethereumHash;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return false;
  } else {
    return true;
  }
};

export const getTransaction = (id: string): BridgeHistory => {
  const tx = ethBridgeApi.getHistory(id) as BridgeHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateHistoryParams = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  ethBridgeApi.saveHistory({ ...tx, ...params });
};

export const isOutgoingTransaction = (tx: Nullable<BridgeHistory>): boolean => {
  return tx?.type === Operation.EthBridgeOutgoing;
};

export const waitForApprovedRequest = async (tx: BridgeHistory): Promise<BridgeApprovedRequest> => {
  if (!tx.hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequestStatus(tx.hash as string).subscribe((status) => {
      switch (status) {
        case BridgeTxStatus.Failed:
        case BridgeTxStatus.Frozen:
          reject(new Error('[Bridge]: Transaction was failed or canceled'));
          break;
        case BridgeTxStatus.Ready:
          resolve();
          break;
      }
    });
  });

  subscription.unsubscribe();

  return ethBridgeApi.getApprovedRequest(tx.hash as string);
};

export const waitForIncomingRequest = async (tx: BridgeHistory): Promise<{ hash: string; blockId: string }> => {
  if (!tx.ethereumHash) throw new Error('[Bridge]: ethereumHash cannot be empty!');
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequest(tx.ethereumHash as string).subscribe((request) => {
      if (request) {
        switch (request.status) {
          case BridgeTxStatus.Failed:
          case BridgeTxStatus.Frozen:
            reject(new Error('[Bridge]: Transaction was failed or canceled'));
            break;
          case BridgeTxStatus.Done:
            resolve();
            break;
        }
      }
    });
  });

  subscription.unsubscribe();

  const soraHash = await ethBridgeApi.getSoraHashByEthereumHash(tx.ethereumHash as string);
  const soraBlockHash = await ethBridgeApi.getSoraBlockHashByRequestHash(tx.ethereumHash as string);

  return { hash: soraHash, blockId: soraBlockHash };
};

export const waitForSoraTransactionHash = async (id: string): Promise<string> => {
  const tx = getTransaction(id);

  if (tx.hash) return tx.hash;
  const blockId = tx.blockId as string; // blockId cannot be empty
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockId);

  if (extrinsics.length) {
    const blockEvents = await api.system.getBlockEvents(blockId);

    const extrinsicIndex = extrinsics.findIndex((item) => {
      const {
        signer,
        method: { method, section },
      } = item;

      return signer.toString() === tx.from && method === 'transferToSidechain' && section === 'ethBridge';
    });

    if (!Number.isFinite(extrinsicIndex)) throw new Error('[Bridge]: Transaction was failed');

    const event = blockEvents.find(
      ({ phase, event }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(extrinsicIndex) &&
        event.section === 'ethBridge' &&
        event.method === 'RequestRegistered'
    );

    if (!event) {
      throw new Error('[Bridge]: Transaction was failed');
    }

    const hash = event.event.data[0].toString();

    return hash;
  }

  await delay(SORA_REQUESTS_TIMEOUT);

  return await waitForSoraTransactionHash(id);
};

export const waitForEvmTransaction = async (id: string) => {
  const transaction = getTransaction(id);

  if (!transaction.ethereumHash) throw new Error('[Bridge]: ethereumHash cannot be empty!');

  await waitForEvmTransactionStatus(
    transaction.ethereumHash,
    (ethereumHash: string) => {
      updateHistoryParams(id, { ethereumHash });
      waitForEvmTransaction(id);
    },
    () => {
      throw new Error('[Bridge]: The transaction was canceled by the user');
    }
  );
};