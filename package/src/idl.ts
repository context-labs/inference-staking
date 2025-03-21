/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/inference_staking.json`.
 */
export const IDL: InferenceStaking = {
  address: "7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb",
  metadata: {
    name: "inferenceStaking",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "accrueReward",
      discriminator: [56, 27, 2, 160, 70, 176, 171, 65],
      accounts: [
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "rewardRecord",
        },
        {
          name: "operatorPool",
          writable: true,
        },
        {
          name: "operatorStakingRecord",
          writable: true,
          relations: ["operatorPool"],
        },
        {
          name: "rewardTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "feeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [70, 101, 101, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "merkleIndex",
          type: "u8",
        },
        {
          name: "proof",
          type: {
            vec: {
              array: ["u8", 32],
            },
          },
        },
        {
          name: "proofPath",
          type: {
            vec: "bool",
          },
        },
        {
          name: "rewardAmount",
          type: "u64",
        },
      ],
    },
    {
      name: "claimUnstake",
      discriminator: [172, 113, 117, 178, 223, 245, 247, 118],
      accounts: [
        {
          name: "owner",
          relations: ["ownerStakingRecord"],
        },
        {
          name: "poolOverview",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "operatorPool",
          writable: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
        },
        {
          name: "operatorStakingRecord",
          relations: ["operatorPool"],
        },
        {
          name: "ownerTokenAccount",
          writable: true,
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [],
    },
    {
      name: "createOperatorPool",
      discriminator: [228, 137, 243, 99, 230, 195, 158, 152],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "admin",
          signer: true,
        },
        {
          name: "operatorPool",
          writable: true,
        },
        {
          name: "stakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "admin",
              },
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
            ],
          },
        },
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "feeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [70, 101, 101, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "mint",
          relations: ["poolOverview"],
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "autoStakeFees",
          type: "bool",
        },
        {
          name: "commissionRateBps",
          type: "u16",
        },
        {
          name: "allowDelegation",
          type: "bool",
        },
      ],
    },
    {
      name: "createPoolOverview",
      discriminator: [5, 155, 100, 76, 127, 68, 142, 10],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "admin",
          signer: true,
        },
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "rewardTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "mint",
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "createRewardRecord",
      discriminator: [222, 217, 122, 53, 232, 14, 242, 73],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "admin",
          signer: true,
          relations: ["poolOverview"],
        },
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "rewardRecord",
          writable: true,
        },
        {
          name: "rewardTokenAccount",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "merkleRoots",
          type: {
            vec: {
              array: ["u8", 32],
            },
          },
        },
        {
          name: "totalRewards",
          type: "u64",
        },
      ],
    },
    {
      name: "createStakingRecord",
      discriminator: [103, 122, 241, 199, 139, 201, 106, 115],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "owner",
          signer: true,
        },
        {
          name: "operatorPool",
        },
        {
          name: "stakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
              },
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
            ],
          },
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "slashStake",
      discriminator: [190, 242, 137, 27, 41, 18, 233, 37],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["poolOverview"],
        },
        {
          name: "poolOverview",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "operatorPool",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operator_pool.pool_id",
                account: "operatorPool",
              },
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
            ],
          },
        },
        {
          name: "operatorStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "admin",
              },
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
            ],
          },
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "destination",
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "slashStakeArgs",
            },
          },
        },
      ],
    },
    {
      name: "stake",
      discriminator: [206, 176, 202, 18, 200, 209, 179, 108],
      accounts: [
        {
          name: "owner",
          signer: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "poolOverview",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "operatorPool",
          writable: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
        },
        {
          name: "operatorStakingRecord",
          relations: ["operatorPool"],
        },
        {
          name: "ownerTokenAccount",
          writable: true,
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "const",
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110],
              },
            ],
          },
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [
        {
          name: "tokenAmount",
          type: "u64",
        },
      ],
    },
    {
      name: "unstake",
      discriminator: [90, 95, 107, 42, 205, 124, 50, 225],
      accounts: [
        {
          name: "owner",
          signer: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "poolOverview",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
        {
          name: "operatorPool",
          writable: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
        },
        {
          name: "operatorStakingRecord",
          relations: ["operatorPool"],
        },
      ],
      args: [
        {
          name: "shareAmount",
          type: "u64",
        },
      ],
    },
    {
      name: "updatePoolOverview",
      discriminator: [107, 143, 107, 12, 150, 138, 52, 184],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["poolOverview"],
        },
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "isWithdrawalHalted",
          type: "bool",
        },
        {
          name: "allowPoolCreation",
          type: "bool",
        },
        {
          name: "minOperatorShareBps",
          type: "u16",
        },
        {
          name: "unstakeDelaySeconds",
          type: "u64",
        },
      ],
    },
    {
      name: "updatePoolOverviewAuthorities",
      discriminator: [74, 195, 118, 20, 145, 15, 95, 245],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["poolOverview"],
        },
        {
          name: "poolOverview",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 79, 118, 101, 114, 118, 105, 101, 119,
                ],
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "newAdmin",
          type: "pubkey",
        },
        {
          name: "newHaltAuthorites",
          type: {
            vec: "pubkey",
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "operatorPool",
      discriminator: [15, 224, 173, 204, 140, 63, 57, 189],
    },
    {
      name: "poolOverview",
      discriminator: [179, 190, 95, 77, 67, 147, 169, 35],
    },
    {
      name: "rewardRecord",
      discriminator: [44, 129, 188, 244, 91, 0, 49, 222],
    },
    {
      name: "stakingRecord",
      discriminator: [104, 155, 91, 97, 111, 66, 42, 128],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "stakingNotAllowed",
      msg: "Staking is not allowed",
    },
    {
      code: 6001,
      name: "unstakingNotAllowed",
      msg: "Unstaking is not allowed",
    },
    {
      code: 6002,
      name: "unclaimedRewards",
      msg: "Rewards have to be claimed first",
    },
    {
      code: 6003,
      name: "minOperatorSharesNotMet",
      msg: "Min. operator shares % in pool violated",
    },
    {
      code: 6004,
      name: "noTokensToClaim",
      msg: "No tokens to be claimed",
    },
    {
      code: 6005,
      name: "pendingDelay",
      msg: "Pending delay duration to elapse",
    },
    {
      code: 6006,
      name: "insufficientRewards",
      msg: "Insufficient reward tokens to issue",
    },
    {
      code: 6007,
      name: "closedPool",
      msg: "Pool is closed",
    },
    {
      code: 6008,
      name: "invalidProof",
      msg: "Invalid Proof",
    },
  ],
  types: [
    {
      name: "operatorPool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poolId",
            docs: [
              "ID of Pool. Equal to (PoolOverview.totalPools + 1) at time of creation.",
            ],
            type: "u64",
          },
          {
            name: "bump",
            docs: ["PDA Bump"],
            type: "u8",
          },
          {
            name: "admin",
            docs: ["Authority allowed to configure settings for this account."],
            type: "pubkey",
          },
          {
            name: "operatorStakingRecord",
            docs: ["StakingRecord owned by Operator."],
            type: "pubkey",
          },
          {
            name: "autoStakeFees",
            docs: [
              "If commission fees received by Operator should be staked at the end of the epoch.",
            ],
            type: "bool",
          },
          {
            name: "commissionRateBps",
            docs: ["Commission Rate for Epoch Rewards. Capped at 100%."],
            type: "u16",
          },
          {
            name: "newCommissionRateBps",
            docs: [
              "Commission Rate that will take place next Epoch, if set. Capped at 100%.",
            ],
            type: {
              option: "u16",
            },
          },
          {
            name: "allowDelegation",
            docs: [
              "If any other user is allowed to delegate stake to Pool, besides operator_staking_record.",
            ],
            type: "bool",
          },
          {
            name: "totalStakedAmount",
            docs: [
              "Total amount of tokens staked in Pool. Value does not include tokens that are being unstaked.",
            ],
            type: "u64",
          },
          {
            name: "totalShares",
            docs: [
              "Total amount of shares issued representing fractional ownership of `total_staked_amount` in Pool.",
            ],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: ["Total amount of tokens being unstaked."],
            type: "u64",
          },
          {
            name: "closedAt",
            docs: ["Epoch that pool was permanently closed at, if set."],
            type: {
              option: "u64",
            },
          },
          {
            name: "isHalted",
            docs: [
              "If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,",
              "claim or withdraw rewards. Other users can still unstake or claim.",
            ],
            type: "bool",
          },
          {
            name: "rewardLastClaimedEpoch",
            docs: [
              "Epoch in which reward was last claimed. Defaults to poolOverview.completed_reward_epoch + 1",
              "at initialization, as rewards will only be issued from next epoch.",
            ],
            type: "u64",
          },
          {
            name: "accruedRewards",
            docs: [
              "Rewards that have been calculated in `accrueRewards`, that are yet to be physically transferred to staking account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "accruedCommission",
            docs: [
              "Commission that have been calculated in `accrueRewards` , that are yet to be physically transferred to fee account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "poolOverview",
      type: {
        kind: "struct",
        fields: [
          {
            name: "mint",
            docs: ["Mint address of token to be staked."],
            type: "pubkey",
          },
          {
            name: "bump",
            docs: ["PDA Bump"],
            type: "u8",
          },
          {
            name: "admin",
            docs: ["Authority allowed to change settings on the acount."],
            type: "pubkey",
          },
          {
            name: "haltAuthorities",
            docs: ["List of signers authorized to halt OperatorPools."],
            type: {
              vec: "pubkey",
            },
          },
          {
            name: "isWithdrawalHalted",
            docs: [
              "Halts all withdrawal instructions when true. Used as a security backstop.",
            ],
            type: "bool",
          },
          {
            name: "allowPoolCreation",
            docs: ["If creation of OperatorPool is allowed."],
            type: "bool",
          },
          {
            name: "minOperatorShareBps",
            docs: [
              "Min. % of total share in pool that the Operator must maintain. If value falls below this minimum, Operators",
              "would not be allowed to reduce their stake and no further delegations are allowed (unless pool is closed).",
            ],
            type: "u16",
          },
          {
            name: "unstakeDelaySeconds",
            docs: ["Delay for unstaking in seconds."],
            type: "u64",
          },
          {
            name: "totalPools",
            docs: ["Total number of pools created."],
            type: "u64",
          },
          {
            name: "completedRewardEpoch",
            docs: ["Number of completed epochs."],
            type: "u64",
          },
          {
            name: "unclaimedRewards",
            docs: [
              "Total amount of reward tokens across all epochs that are issued, but yet to be paid out.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "rewardRecord",
      type: {
        kind: "struct",
        fields: [
          {
            name: "epoch",
            docs: ["Counter to track the epoch this claim was made in."],
            type: "u64",
          },
          {
            name: "merkleRoots",
            docs: [
              "Merkle roots for current epoch. Each root represents a merkle distribution tree",
              "where leaf nodes contain a SHA256 hashed value of `OperatorPools` key and reward amount in this epoch.",
            ],
            type: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
          {
            name: "totalRewards",
            docs: ["Amount of reward tokens issued for this epoch."],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "slashStakeArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "sharesAmount",
            docs: ["Amount of shares to slash from Operator's stake."],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "stakingRecord",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            docs: ["Owner of the StakingRecord."],
            type: "pubkey",
          },
          {
            name: "operatorPool",
            docs: ["OperatorPool that stake is delegated to."],
            type: "pubkey",
          },
          {
            name: "shares",
            docs: ["Amount of shares owned."],
            type: "u64",
          },
          {
            name: "unstakeAtTimestamp",
            docs: ["Timestamp after which unstaked tokens can be claimed."],
            type: "i64",
          },
          {
            name: "tokensUnstakeAmount",
            docs: ["Amount of tokens to be unstaked"],
            type: "u64",
          },
        ],
      },
    },
  ],
};

type InferenceStaking = {
  address: "7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb";
  metadata: {
    name: "inferenceStaking";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "accrueReward";
      discriminator: [56, 27, 2, 160, 70, 176, 171, 65];
      accounts: [
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "rewardRecord";
        },
        {
          name: "operatorPool";
          writable: true;
        },
        {
          name: "operatorStakingRecord";
          writable: true;
          relations: ["operatorPool"];
        },
        {
          name: "rewardTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "stakedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "feeTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [70, 101, 101, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "merkleIndex";
          type: "u8";
        },
        {
          name: "proof";
          type: {
            vec: {
              array: ["u8", 32];
            };
          };
        },
        {
          name: "proofPath";
          type: {
            vec: "bool";
          };
        },
        {
          name: "rewardAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "claimUnstake";
      discriminator: [172, 113, 117, 178, 223, 245, 247, 118];
      accounts: [
        {
          name: "owner";
          relations: ["ownerStakingRecord"];
        },
        {
          name: "poolOverview";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "operatorPool";
          writable: true;
          relations: ["ownerStakingRecord"];
        },
        {
          name: "ownerStakingRecord";
          writable: true;
        },
        {
          name: "operatorStakingRecord";
          relations: ["operatorPool"];
        },
        {
          name: "ownerTokenAccount";
          writable: true;
        },
        {
          name: "stakedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [];
    },
    {
      name: "createOperatorPool";
      discriminator: [228, 137, 243, 99, 230, 195, 158, 152];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "operatorPool";
          writable: true;
        },
        {
          name: "stakingRecord";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "account";
                path: "admin";
              },
              {
                kind: "const";
                value: [
                  83,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  82,
                  101,
                  99,
                  111,
                  114,
                  100
                ];
              }
            ];
          };
        },
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "stakedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "feeTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [70, 101, 101, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "mint";
          relations: ["poolOverview"];
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "autoStakeFees";
          type: "bool";
        },
        {
          name: "commissionRateBps";
          type: "u16";
        },
        {
          name: "allowDelegation";
          type: "bool";
        }
      ];
    },
    {
      name: "createPoolOverview";
      discriminator: [5, 155, 100, 76, 127, 68, 142, 10];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "rewardTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "mint";
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "createRewardRecord";
      discriminator: [222, 217, 122, 53, 232, 14, 242, 73];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          signer: true;
          relations: ["poolOverview"];
        },
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "rewardRecord";
          writable: true;
        },
        {
          name: "rewardTokenAccount";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [82, 101, 119, 97, 114, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "merkleRoots";
          type: {
            vec: {
              array: ["u8", 32];
            };
          };
        },
        {
          name: "totalRewards";
          type: "u64";
        }
      ];
    },
    {
      name: "createStakingRecord";
      discriminator: [103, 122, 241, 199, 139, 201, 106, 115];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          signer: true;
        },
        {
          name: "operatorPool";
        },
        {
          name: "stakingRecord";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "const";
                value: [
                  83,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  82,
                  101,
                  99,
                  111,
                  114,
                  100
                ];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "slashStake";
      discriminator: [190, 242, 137, 27, 41, 18, 233, 37];
      accounts: [
        {
          name: "admin";
          signer: true;
          relations: ["poolOverview"];
        },
        {
          name: "poolOverview";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "operatorPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operator_pool.pool_id";
                account: "operatorPool";
              },
              {
                kind: "const";
                value: [
                  79,
                  112,
                  101,
                  114,
                  97,
                  116,
                  111,
                  114,
                  80,
                  111,
                  111,
                  108
                ];
              }
            ];
          };
        },
        {
          name: "operatorStakingRecord";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "account";
                path: "admin";
              },
              {
                kind: "const";
                value: [
                  83,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  82,
                  101,
                  99,
                  111,
                  114,
                  100
                ];
              }
            ];
          };
        },
        {
          name: "stakedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "destination";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "args";
          type: {
            defined: {
              name: "slashStakeArgs";
            };
          };
        }
      ];
    },
    {
      name: "stake";
      discriminator: [206, 176, 202, 18, 200, 209, 179, 108];
      accounts: [
        {
          name: "owner";
          signer: true;
          relations: ["ownerStakingRecord"];
        },
        {
          name: "poolOverview";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "operatorPool";
          writable: true;
          relations: ["ownerStakingRecord"];
        },
        {
          name: "ownerStakingRecord";
          writable: true;
        },
        {
          name: "operatorStakingRecord";
          relations: ["operatorPool"];
        },
        {
          name: "ownerTokenAccount";
          writable: true;
        },
        {
          name: "stakedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "operatorPool";
              },
              {
                kind: "const";
                value: [83, 116, 97, 107, 101, 100, 84, 111, 107, 101, 110];
              }
            ];
          };
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "tokenAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "unstake";
      discriminator: [90, 95, 107, 42, 205, 124, 50, 225];
      accounts: [
        {
          name: "owner";
          signer: true;
          relations: ["ownerStakingRecord"];
        },
        {
          name: "poolOverview";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        },
        {
          name: "operatorPool";
          writable: true;
          relations: ["ownerStakingRecord"];
        },
        {
          name: "ownerStakingRecord";
          writable: true;
        },
        {
          name: "operatorStakingRecord";
          relations: ["operatorPool"];
        }
      ];
      args: [
        {
          name: "shareAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "updatePoolOverview";
      discriminator: [107, 143, 107, 12, 150, 138, 52, 184];
      accounts: [
        {
          name: "admin";
          signer: true;
          relations: ["poolOverview"];
        },
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "isWithdrawalHalted";
          type: "bool";
        },
        {
          name: "allowPoolCreation";
          type: "bool";
        },
        {
          name: "minOperatorShareBps";
          type: "u16";
        },
        {
          name: "unstakeDelaySeconds";
          type: "u64";
        }
      ];
    },
    {
      name: "updatePoolOverviewAuthorities";
      discriminator: [74, 195, 118, 20, 145, 15, 95, 245];
      accounts: [
        {
          name: "admin";
          signer: true;
          relations: ["poolOverview"];
        },
        {
          name: "poolOverview";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  80,
                  111,
                  111,
                  108,
                  79,
                  118,
                  101,
                  114,
                  118,
                  105,
                  101,
                  119
                ];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "newAdmin";
          type: "pubkey";
        },
        {
          name: "newHaltAuthorites";
          type: {
            vec: "pubkey";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "operatorPool";
      discriminator: [15, 224, 173, 204, 140, 63, 57, 189];
    },
    {
      name: "poolOverview";
      discriminator: [179, 190, 95, 77, 67, 147, 169, 35];
    },
    {
      name: "rewardRecord";
      discriminator: [44, 129, 188, 244, 91, 0, 49, 222];
    },
    {
      name: "stakingRecord";
      discriminator: [104, 155, 91, 97, 111, 66, 42, 128];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "stakingNotAllowed";
      msg: "Staking is not allowed";
    },
    {
      code: 6001;
      name: "unstakingNotAllowed";
      msg: "Unstaking is not allowed";
    },
    {
      code: 6002;
      name: "unclaimedRewards";
      msg: "Rewards have to be claimed first";
    },
    {
      code: 6003;
      name: "minOperatorSharesNotMet";
      msg: "Min. operator shares % in pool violated";
    },
    {
      code: 6004;
      name: "noTokensToClaim";
      msg: "No tokens to be claimed";
    },
    {
      code: 6005;
      name: "pendingDelay";
      msg: "Pending delay duration to elapse";
    },
    {
      code: 6006;
      name: "insufficientRewards";
      msg: "Insufficient reward tokens to issue";
    },
    {
      code: 6007;
      name: "closedPool";
      msg: "Pool is closed";
    },
    {
      code: 6008;
      name: "invalidProof";
      msg: "Invalid Proof";
    }
  ];
  types: [
    {
      name: "operatorPool";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolId";
            docs: [
              "ID of Pool. Equal to (PoolOverview.totalPools + 1) at time of creation."
            ];
            type: "u64";
          },
          {
            name: "bump";
            docs: ["PDA Bump"];
            type: "u8";
          },
          {
            name: "admin";
            docs: ["Authority allowed to configure settings for this account."];
            type: "pubkey";
          },
          {
            name: "operatorStakingRecord";
            docs: ["StakingRecord owned by Operator."];
            type: "pubkey";
          },
          {
            name: "autoStakeFees";
            docs: [
              "If commission fees received by Operator should be staked at the end of the epoch."
            ];
            type: "bool";
          },
          {
            name: "commissionRateBps";
            docs: ["Commission Rate for Epoch Rewards. Capped at 100%."];
            type: "u16";
          },
          {
            name: "newCommissionRateBps";
            docs: [
              "Commission Rate that will take place next Epoch, if set. Capped at 100%."
            ];
            type: {
              option: "u16";
            };
          },
          {
            name: "allowDelegation";
            docs: [
              "If any other user is allowed to delegate stake to Pool, besides operator_staking_record."
            ];
            type: "bool";
          },
          {
            name: "totalStakedAmount";
            docs: [
              "Total amount of tokens staked in Pool. Value does not include tokens that are being unstaked."
            ];
            type: "u64";
          },
          {
            name: "totalShares";
            docs: [
              "Total amount of shares issued representing fractional ownership of `total_staked_amount` in Pool."
            ];
            type: "u64";
          },
          {
            name: "totalUnstaking";
            docs: ["Total amount of tokens being unstaked."];
            type: "u64";
          },
          {
            name: "closedAt";
            docs: ["Epoch that pool was permanently closed at, if set."];
            type: {
              option: "u64";
            };
          },
          {
            name: "isHalted";
            docs: [
              "If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,",
              "claim or withdraw rewards. Other users can still unstake or claim."
            ];
            type: "bool";
          },
          {
            name: "rewardLastClaimedEpoch";
            docs: [
              "Epoch in which reward was last claimed. Defaults to poolOverview.completed_reward_epoch + 1",
              "at initialization, as rewards will only be issued from next epoch."
            ];
            type: "u64";
          },
          {
            name: "accruedRewards";
            docs: [
              "Rewards that have been calculated in `accrueRewards`, that are yet to be physically transferred to staking account.",
              "Used to optimize compute."
            ];
            type: "u64";
          },
          {
            name: "accruedCommission";
            docs: [
              "Commission that have been calculated in `accrueRewards` , that are yet to be physically transferred to fee account.",
              "Used to optimize compute."
            ];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "poolOverview";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            docs: ["Mint address of token to be staked."];
            type: "pubkey";
          },
          {
            name: "bump";
            docs: ["PDA Bump"];
            type: "u8";
          },
          {
            name: "admin";
            docs: ["Authority allowed to change settings on the acount."];
            type: "pubkey";
          },
          {
            name: "haltAuthorities";
            docs: ["List of signers authorized to halt OperatorPools."];
            type: {
              vec: "pubkey";
            };
          },
          {
            name: "isWithdrawalHalted";
            docs: [
              "Halts all withdrawal instructions when true. Used as a security backstop."
            ];
            type: "bool";
          },
          {
            name: "allowPoolCreation";
            docs: ["If creation of OperatorPool is allowed."];
            type: "bool";
          },
          {
            name: "minOperatorShareBps";
            docs: [
              "Min. % of total share in pool that the Operator must maintain. If value falls below this minimum, Operators",
              "would not be allowed to reduce their stake and no further delegations are allowed (unless pool is closed)."
            ];
            type: "u16";
          },
          {
            name: "unstakeDelaySeconds";
            docs: ["Delay for unstaking in seconds."];
            type: "u64";
          },
          {
            name: "totalPools";
            docs: ["Total number of pools created."];
            type: "u64";
          },
          {
            name: "completedRewardEpoch";
            docs: ["Number of completed epochs."];
            type: "u64";
          },
          {
            name: "unclaimedRewards";
            docs: [
              "Total amount of reward tokens across all epochs that are issued, but yet to be paid out."
            ];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "rewardRecord";
      type: {
        kind: "struct";
        fields: [
          {
            name: "epoch";
            docs: ["Counter to track the epoch this claim was made in."];
            type: "u64";
          },
          {
            name: "merkleRoots";
            docs: [
              "Merkle roots for current epoch. Each root represents a merkle distribution tree",
              "where leaf nodes contain a SHA256 hashed value of `OperatorPools` key and reward amount in this epoch."
            ];
            type: {
              vec: {
                array: ["u8", 32];
              };
            };
          },
          {
            name: "totalRewards";
            docs: ["Amount of reward tokens issued for this epoch."];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "slashStakeArgs";
      type: {
        kind: "struct";
        fields: [
          {
            name: "sharesAmount";
            docs: ["Amount of shares to slash from Operator's stake."];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "stakingRecord";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            docs: ["Owner of the StakingRecord."];
            type: "pubkey";
          },
          {
            name: "operatorPool";
            docs: ["OperatorPool that stake is delegated to."];
            type: "pubkey";
          },
          {
            name: "shares";
            docs: ["Amount of shares owned."];
            type: "u64";
          },
          {
            name: "unstakeAtTimestamp";
            docs: ["Timestamp after which unstaked tokens can be claimed."];
            type: "i64";
          },
          {
            name: "tokensUnstakeAmount";
            docs: ["Amount of tokens to be unstaked"];
            type: "u64";
          }
        ];
      };
    }
  ];
};
