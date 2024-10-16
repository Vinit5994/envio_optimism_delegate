import {
  GovernanceToken,
  GovernanceToken_Approval,
  GovernanceToken_DelegateChanged,
  GovernanceToken_DelegateVotesChanged,
  GovernanceToken_OwnershipTransferred,
  GovernanceToken_Transfer,
  Account,
  Delegate,
} from "generated";

// Helper function to get or create an Account
async function getOrCreateAccount(context: any, address: string): Promise<Account> {
  let account = await context.Account.get(address);
  if (!account) {
    account = {
      id: address,
      balance: BigInt(0),
      delegate: address, // Initially, an account delegates to itself
    };
    await context.Account.set(account);
  }
  return account;
}

// Helper function to get or create a Delegate
async function getOrCreateDelegate(context: any, address: string): Promise<Delegate> {
  let delegate = await context.Delegate.get(address);
  if (!delegate) {
    delegate = {
      id: address,
      address: address,  // Added address field initialization
      latestBalance: BigInt(0),
      delegatedFromCount: BigInt(0),
      delegators: [],
    };
    await context.Delegate.set(delegate);
  }
  return delegate;
}

// Helper function to update delegation
async function updateDelegation(context: any, accountId: string, newDelegateId: string): Promise<void> {
  const account = await getOrCreateAccount(context, accountId);
  if (account.delegate !== newDelegateId) {
    const oldDelegate = await getOrCreateDelegate(context, account.delegate);
    const newDelegate = await getOrCreateDelegate(context, newDelegateId);

    if (account.balance > BigInt(0)) {
      // Remove from old delegate
      await context.Delegate.set({
        ...oldDelegate,
        id: oldDelegate.id,
        address: oldDelegate.address,  // Include address in update
        delegatedFromCount: oldDelegate.delegatedFromCount - BigInt(1),
        delegators: oldDelegate.delegators.filter(d => d !== accountId),
      });

      // Add to new delegate if it's not self-delegation
      if (accountId !== newDelegateId) {
        await context.Delegate.set({
          ...newDelegate,
          id: newDelegate.id,
          address: newDelegate.address,  // Include address in update
          delegatedFromCount: newDelegate.delegatedFromCount + BigInt(1),
          delegators: newDelegate.delegators.includes(accountId) 
            ? newDelegate.delegators 
            : [...newDelegate.delegators, accountId],
        });
      }
    }

    await context.Account.set({
      ...account,
      id: account.id,
      delegate: newDelegateId,
    });
  }
}

GovernanceToken.Approval.handler(async ({ event, context }) => {
  const entity: GovernanceToken_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    spender: event.params.spender,
    value: event.params.value,
  };
  await context.GovernanceToken_Approval.set(entity);
});

GovernanceToken.DelegateChanged.handler(async ({ event, context }) => {
  const entity: GovernanceToken_DelegateChanged = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    delegator: event.params.delegator,
    fromDelegate: event.params.fromDelegate,
    toDelegate: event.params.toDelegate,
  };
  await context.GovernanceToken_DelegateChanged.set(entity);

  // Update delegation
  await updateDelegation(context, event.params.delegator, event.params.toDelegate);
});

GovernanceToken.DelegateVotesChanged.handler(async ({ event, context }) => {
  const entity: GovernanceToken_DelegateVotesChanged = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    delegate: event.params.delegate,
    previousBalance: event.params.previousBalance,
    newBalance: event.params.newBalance,
  };
  await context.GovernanceToken_DelegateVotesChanged.set(entity);

  // Update delegate's latest balance
  const delegate = await getOrCreateDelegate(context, event.params.delegate);
  await context.Delegate.set({
    ...delegate,
    id: delegate.id,
    address: delegate.address,  // Include address in update
    latestBalance: event.params.newBalance,
  });
});

GovernanceToken.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: GovernanceToken_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };
  await context.GovernanceToken_OwnershipTransferred.set(entity);
});

GovernanceToken.Transfer.handler(async ({ event, context }) => {
  const entity: GovernanceToken_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
  };
  await context.GovernanceToken_Transfer.set(entity);

  // Update account balances
  const fromAccount = await getOrCreateAccount(context, event.params.from);
  const toAccount = await getOrCreateAccount(context, event.params.to);

  await context.Account.set({
    ...fromAccount,
    id: fromAccount.id,
    balance: fromAccount.balance - event.params.value,
  });
  await context.Account.set({
    ...toAccount,
    id: toAccount.id,
    balance: toAccount.balance + event.params.value,
  });

  // Update delegations
  await updateDelegation(context, event.params.from, fromAccount.delegate);
  await updateDelegation(context, event.params.to, toAccount.delegate);
});