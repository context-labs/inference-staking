import type { PublicKey } from "@solana/web3.js";

type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
};

// This is the Anchor generated program IDL, which is generated in our build process.
// Don't edit the finally manually - you can regenerate it by running 'bun run build'
// at the root level of the project.
const _IDL = {
  address: "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG",
  metadata: {
    name: "inferenceStaking",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Inference.net Staking Program",
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 82, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "reward_record.epoch",
                account: "rewardRecord",
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
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
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
                value: [
                  71, 108, 111, 98, 97, 108, 84, 111, 107, 101, 110, 82, 101,
                  119, 97, 114, 100, 86, 97, 117, 108, 116,
                ],
              },
            ],
          },
        },
        {
          name: "usdcTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  71, 108, 111, 98, 97, 108, 85, 115, 100, 99, 69, 97, 114, 110,
                  105, 110, 103, 115, 86, 97, 117, 108, 116,
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 83, 116, 97, 107, 101, 100, 84, 111, 107,
                  101, 110, 86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 67, 111, 109, 109, 105, 115, 115, 105, 111,
                  110, 70, 101, 101, 84, 111, 107, 101, 110, 86, 97, 117, 108,
                  116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 70, 101, 101, 84, 111, 107, 101, 110,
                  86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "poolUsdcVault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 68, 101, 108, 101, 103, 97, 116, 111, 114,
                  85, 115, 100, 99, 69, 97, 114, 110, 105, 110, 103, 115, 86,
                  97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
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
          name: "args",
          type: {
            defined: {
              name: "accrueRewardArgs",
            },
          },
        },
      ],
    },
    {
      name: "cancelUnstake",
      discriminator: [64, 65, 53, 227, 125, 153, 3, 167],
      accounts: [
        {
          name: "owner",
          signer: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "poolOverview",
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
      ],
      args: [],
    },
    {
      name: "changeOperatorAdmin",
      discriminator: [54, 235, 203, 165, 49, 205, 221, 109],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["operatorPool"],
        },
        {
          name: "newAdmin",
          signer: true,
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
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "changeOperatorStakingRecord",
      discriminator: [142, 191, 20, 77, 230, 99, 245, 184],
      accounts: [
        {
          name: "admin",
          docs: ["Admin of the OperatorPool"],
          signer: true,
          relations: ["operatorPool"],
        },
        {
          name: "owner",
          docs: [
            "Owner of the StakingRecord that will become the new OperatorPool StakingRecord",
          ],
          signer: true,
          relations: ["newStakingRecord"],
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
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
          relations: ["operatorStakingRecord", "newStakingRecord"],
        },
        {
          name: "operatorStakingRecord",
        },
        {
          name: "newStakingRecord",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
        },
      ],
      args: [],
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 83, 116, 97, 107, 101, 100, 84, 111, 107,
                  101, 110, 86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
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
      name: "claimUsdcEarnings",
      discriminator: [38, 20, 245, 41, 23, 224, 55, 153],
      accounts: [
        {
          name: "owner",
          signer: true,
          relations: ["stakingRecord"],
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
          relations: ["stakingRecord"],
        },
        {
          name: "stakingRecord",
          writable: true,
        },
        {
          name: "poolUsdcVault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 68, 101, 108, 101, 103, 97, 116, 111, 114,
                  85, 115, 100, 99, 69, 97, 114, 110, 105, 110, 103, 115, 86,
                  97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "ownerUsdcAccount",
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [],
    },
    {
      name: "closeOperatorPool",
      discriminator: [5, 121, 71, 229, 187, 164, 51, 179],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["operatorPool"],
        },
        {
          name: "poolOverview",
        },
        {
          name: "operatorPool",
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: "closeStakingRecord",
      discriminator: [208, 180, 58, 210, 55, 93, 23, 115],
      accounts: [
        {
          name: "receiver",
          docs: ["Account to receive the reclaimed rent from StakingRecord"],
          writable: true,
        },
        {
          name: "owner",
          signer: true,
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "owner_staking_record.operator_pool",
                account: "stakingRecord",
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
        },
        {
          name: "operatorPool",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
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
      name: "createOperatorPool",
      docs: [
        "-----------------------------------------------------------------------\n     * OperatorPool Admin Instructions\n     * ------------------------------------------------------------------------",
      ],
      discriminator: [228, 137, 243, 99, 230, 195, 158, 152],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "operatorPool",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "admin",
              },
            ],
          },
        },
        {
          name: "stakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "admin",
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 83, 116, 97, 107, 101, 100, 84, 111, 107,
                  101, 110, 86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 67, 111, 109, 109, 105, 115, 115, 105, 111,
                  110, 70, 101, 101, 84, 111, 107, 101, 110, 86, 97, 117, 108,
                  116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 70, 101, 101, 84, 111, 107, 101, 110,
                  86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "operatorUsdcVault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 68, 101, 108, 101, 103, 97, 116, 111, 114,
                  85, 115, 100, 99, 69, 97, 114, 110, 105, 110, 103, 115, 86,
                  97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "adminTokenAccount",
          writable: true,
        },
        {
          name: "registrationFeePayoutTokenAccount",
          writable: true,
        },
        {
          name: "mint",
          relations: ["poolOverview"],
        },
        {
          name: "usdcMint",
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
          name: "args",
          type: {
            defined: {
              name: "createOperatorPoolArgs",
            },
          },
        },
      ],
    },
    {
      name: "createPoolOverview",
      docs: [
        "-----------------------------------------------------------------------\n     * PoolOverview Admin Instructions\n     * ------------------------------------------------------------------------",
      ],
      discriminator: [5, 155, 100, 76, 127, 68, 142, 10],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "programAdmin",
          signer: true,
        },
        {
          name: "registrationFeePayoutWallet",
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
                value: [
                  71, 108, 111, 98, 97, 108, 84, 111, 107, 101, 110, 82, 101,
                  119, 97, 114, 100, 86, 97, 117, 108, 116,
                ],
              },
            ],
          },
        },
        {
          name: "usdcTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  71, 108, 111, 98, 97, 108, 85, 115, 100, 99, 69, 97, 114, 110,
                  105, 110, 103, 115, 86, 97, 117, 108, 116,
                ],
              },
            ],
          },
        },
        {
          name: "mint",
        },
        {
          name: "usdcMint",
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
      docs: [
        "-----------------------------------------------------------------------\n     * Reward Distribution Instructions\n     * ------------------------------------------------------------------------",
      ],
      discriminator: [222, 217, 122, 53, 232, 14, 242, 73],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "authority",
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
          name: "rewardRecord",
          writable: true,
        },
        {
          name: "rewardTokenAccount",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  71, 108, 111, 98, 97, 108, 84, 111, 107, 101, 110, 82, 101,
                  119, 97, 114, 100, 86, 97, 117, 108, 116,
                ],
              },
            ],
          },
        },
        {
          name: "usdcTokenAccount",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  71, 108, 111, 98, 97, 108, 85, 115, 100, 99, 69, 97, 114, 110,
                  105, 110, 103, 115, 86, 97, 117, 108, 116,
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
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "createRewardRecordArgs",
            },
          },
        },
      ],
    },
    {
      name: "createStakingRecord",
      docs: [
        "-----------------------------------------------------------------------\n     * Staking Instructions\n     * ------------------------------------------------------------------------",
      ],
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
        {
          name: "ownerStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
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
      name: "markEpochAsFinalizing",
      discriminator: [184, 57, 145, 48, 57, 204, 105, 240],
      accounts: [
        {
          name: "authority",
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
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "markEpochIsFinalizingArgs",
            },
          },
        },
      ],
    },
    {
      name: "modifyRewardRecord",
      discriminator: [16, 109, 128, 67, 141, 121, 47, 186],
      accounts: [
        {
          name: "authority",
          signer: true,
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
          name: "rewardRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 82, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "reward_record.epoch",
                account: "rewardRecord",
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "modifyRewardRecordArgs",
            },
          },
        },
      ],
    },
    {
      name: "setHaltStatus",
      docs: [
        "-----------------------------------------------------------------------\n     * Program Admin Security Instructions\n     * ------------------------------------------------------------------------",
      ],
      discriminator: [39, 9, 170, 100, 62, 112, 229, 71],
      accounts: [
        {
          name: "authority",
          signer: true,
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
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "setHaltStatusArgs",
            },
          },
        },
      ],
    },
    {
      name: "slashStake",
      discriminator: [190, 242, 137, 27, 41, 18, 233, 37],
      accounts: [
        {
          name: "authority",
          signer: true,
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
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
        {
          name: "operatorStakingRecord",
          writable: true,
        },
        {
          name: "stakedTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 83, 116, 97, 107, 101, 100, 84, 111, 107,
                  101, 110, 86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "destination",
          writable: true,
        },
        {
          name: "poolUsdcVault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 68, 101, 108, 101, 103, 97, 116, 111, 114,
                  85, 115, 100, 99, 69, 97, 114, 110, 105, 110, 103, 115, 86,
                  97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "destinationUsdcAccount",
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 83, 116, 97, 107, 101, 100, 84, 111, 107,
                  101, 110, 86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
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
      name: "sweepClosedPoolUsdcDust",
      discriminator: [151, 159, 189, 65, 127, 240, 112, 65],
      accounts: [
        {
          name: "admin",
          docs: [
            "The admin of the OperatorPool, who is authorized to sweep the vault.",
          ],
          writable: true,
          signer: true,
          relations: ["operatorPool"],
        },
        {
          name: "operatorPool",
        },
        {
          name: "operatorUsdcVault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 68, 101, 108, 101, 103, 97, 116, 111, 114,
                  85, 115, 100, 99, 69, 97, 114, 110, 105, 110, 103, 115, 86,
                  97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "adminUsdcAccount",
          docs: ["The admin's USDC token account to receive the swept funds."],
          writable: true,
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
          relations: ["ownerStakingRecord"],
        },
        {
          name: "ownerStakingRecord",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  83, 116, 97, 107, 105, 110, 103, 82, 101, 99, 111, 114, 100,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
              {
                kind: "account",
                path: "owner",
              },
            ],
          },
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
      name: "updateOperatorPool",
      discriminator: [33, 136, 60, 240, 111, 137, 216, 26],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["operatorPool"],
        },
        {
          name: "operatorPool",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "updateOperatorPoolArgs",
            },
          },
        },
      ],
    },
    {
      name: "updatePoolOverview",
      discriminator: [107, 143, 107, 12, 150, 138, 52, 184],
      accounts: [
        {
          name: "programAdmin",
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
          name: "registrationFeePayoutWallet",
          optional: true,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "updatePoolOverviewArgs",
            },
          },
        },
      ],
    },
    {
      name: "updatePoolOverviewAuthorities",
      discriminator: [74, 195, 118, 20, 145, 15, 95, 245],
      accounts: [
        {
          name: "programAdmin",
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
          name: "newProgramAdmin",
          signer: true,
          optional: true,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "updatePoolOverviewAuthoritiesArgs",
            },
          },
        },
      ],
    },
    {
      name: "withdrawOperatorCommission",
      discriminator: [235, 10, 174, 108, 185, 188, 152, 196],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["operatorPool"],
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
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
                kind: "const",
                value: [
                  80, 111, 111, 108, 67, 111, 109, 109, 105, 115, 115, 105, 111,
                  110, 70, 101, 101, 84, 111, 107, 101, 110, 86, 97, 117, 108,
                  116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "destination",
          docs: ["Destination for the commission."],
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [],
    },
    {
      name: "withdrawOperatorUsdcCommission",
      discriminator: [249, 79, 68, 38, 186, 241, 145, 192],
      accounts: [
        {
          name: "admin",
          signer: true,
          relations: ["operatorPool"],
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
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  79, 112, 101, 114, 97, 116, 111, 114, 80, 111, 111, 108,
                ],
              },
              {
                kind: "account",
                path: "operator_pool.initial_pool_admin",
                account: "operatorPool",
              },
            ],
          },
        },
        {
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 70, 101, 101, 84, 111, 107, 101, 110,
                  86, 97, 117, 108, 116,
                ],
              },
              {
                kind: "account",
                path: "operatorPool",
              },
            ],
          },
        },
        {
          name: "destination",
          docs: ["Destination for the USDC commission."],
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
      ],
      args: [],
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
  events: [
    {
      name: "claimUnstakeEvent",
      discriminator: [18, 255, 161, 59, 246, 47, 255, 127],
    },
    {
      name: "completeAccrueRewardEvent",
      discriminator: [149, 158, 93, 104, 228, 19, 24, 204],
    },
    {
      name: "completeClaimUsdcEarningsEvent",
      discriminator: [194, 205, 27, 186, 218, 159, 15, 168],
    },
    {
      name: "slashStakeEvent",
      discriminator: [150, 87, 165, 208, 202, 50, 106, 12],
    },
    {
      name: "stakeEvent",
      discriminator: [226, 134, 188, 173, 19, 33, 75, 175],
    },
    {
      name: "unstakeEvent",
      discriminator: [162, 104, 137, 228, 81, 3, 79, 197],
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
      name: "minOperatorTokenStakeNotMet",
      msg: "Min. operator token stake not met",
    },
    {
      code: 6004,
      name: "noTokensToClaim",
      msg: "No tokens to be claimed",
    },
    {
      code: 6005,
      name: "pendingDelay",
      msg: "Tokens are still in unstaking cooldown",
    },
    {
      code: 6006,
      name: "insufficientRewards",
      msg: "Insufficient reward tokens to issue",
    },
    {
      code: 6007,
      name: "insufficientUsdc",
      msg: "Insufficient USDC tokens to issue",
    },
    {
      code: 6008,
      name: "closedPool",
      msg: "Pool is closed",
    },
    {
      code: 6009,
      name: "invalidProof",
      msg: "Invalid Proof",
    },
    {
      code: 6010,
      name: "operatorPoolHalted",
      msg: "OperatorPool is halted",
    },
    {
      code: 6011,
      name: "stakingHalted",
      msg: "Staking is halted",
    },
    {
      code: 6012,
      name: "withdrawalsHalted",
      msg: "Withdrawals are halted",
    },
    {
      code: 6013,
      name: "accrueRewardHalted",
      msg: "Accrue reward is halted",
    },
    {
      code: 6014,
      name: "invalidProgramAdmin",
      msg: "ProgramAdmin is not valid",
    },
    {
      code: 6015,
      name: "invalidRewardDistributionAuthority",
      msg: "RewardDistributionAuthority is not valid",
    },
    {
      code: 6016,
      name: "invalidHaltAuthority",
      msg: "HaltAuthority is not valid",
    },
    {
      code: 6017,
      name: "invalidSlashingAuthority",
      msg: "SlashingAuthority is not valid",
    },
    {
      code: 6018,
      name: "authoritiesExceeded",
      msg: "Exceeded allowed authorities length",
    },
    {
      code: 6019,
      name: "operatorAuthKeysLengthInvalid",
      msg: "Invalid operator auth keys length",
    },
    {
      code: 6020,
      name: "accountNotEmpty",
      msg: "Account not empty",
    },
    {
      code: 6021,
      name: "poolCreationDisabled",
      msg: "Pool creation is disabled",
    },
    {
      code: 6022,
      name: "invalidUsdcMint",
      msg: "Could not initialize USDC mint",
    },
    {
      code: 6023,
      name: "invalidUsdcPayoutDestination",
      msg: "Invalid USDC payout destination",
    },
    {
      code: 6024,
      name: "invalidRegistrationFeePayoutDestination",
      msg: "Invalid registration fee payout destination",
    },
    {
      code: 6025,
      name: "epochMustBeFinalizing",
      msg: "Epoch must be finalizing when calling CreateRewardRecord",
    },
    {
      code: 6026,
      name: "epochMustNotBeFinalizing",
      msg: "Epoch must not be finalizing during operator pool admin change",
    },
    {
      code: 6027,
      name: "epochIsFinalizingEpochInvalid",
      msg: "Invalid expected epoch provided for epoch finalizing update",
    },
    {
      code: 6028,
      name: "nameTooLong",
      msg: "Name is too long, max length is 64 characters",
    },
    {
      code: 6029,
      name: "descriptionTooLong",
      msg: "Description is too long, max length is 200 characters",
    },
    {
      code: 6030,
      name: "websiteUrlTooLong",
      msg: "Website URL is too long, max length is 64 characters",
    },
    {
      code: 6031,
      name: "avatarImageUrlTooLong",
      msg: "Avatar image URL is too long, max length is 128 characters",
    },
    {
      code: 6032,
      name: "invalidWebsiteUrl",
      msg: "Website URL is invalid",
    },
    {
      code: 6033,
      name: "invalidAvatarImageUrl",
      msg: "Avatar image URL is invalid",
    },
    {
      code: 6034,
      name: "unclaimedUsdcEarnings",
      msg: "USDC earnings must be claimed before unstaking",
    },
    {
      code: 6035,
      name: "noUsdcEarningsToClaim",
      msg: "No USDC earnings to claim",
    },
    {
      code: 6036,
      name: "insufficientPoolUsdcVaultBalance",
      msg: "Insufficient USDC in pool vault",
    },
    {
      code: 6037,
      name: "invalidCommissionRate",
      msg: "Invalid commission rate",
    },
    {
      code: 6038,
      name: "poolMustBeClosed",
      msg: "Operator pool must be closed to sweep dust",
    },
    {
      code: 6039,
      name: "poolClosedEpochInvalid",
      msg: "Operator pool must be closed before the current epoch",
    },
    {
      code: 6040,
      name: "poolIsNotEmpty",
      msg: "Pool is not empty",
    },
    {
      code: 6041,
      name: "finalUnstakeEpochInvalid",
      msg: "Pool must be closed before the current epoch for the operator to unstake",
    },
  ],
  types: [
    {
      name: "accrueRewardArgs",
      type: {
        kind: "struct",
        fields: [
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
          {
            name: "usdcAmount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "claimUnstakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "unstakeAmount",
            docs: ["Amount being of tokens being claimed."],
            type: "u64",
          },
          {
            name: "totalStakedAmount",
            docs: ["Total amount of remaining tokens staked in pool."],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: [
              "Total amount of remaining tokens being unstaked in the pool.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "completeAccrueRewardEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "totalStakedAmount",
            docs: ["Total amount of remaining tokens staked in pool."],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: [
              "Total amount of remaining tokens being unstaked in the pool.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "completeClaimUsdcEarningsEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "amountClaimed",
            docs: ["Total amount of USDC claimed and withdrawn."],
            type: "u64",
          },
          {
            name: "totalShares",
            docs: ["Total amount of shares remaining in the staking record."],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "createOperatorPoolArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "autoStakeFees",
            type: "bool",
          },
          {
            name: "rewardCommissionRateBps",
            type: "u16",
          },
          {
            name: "allowDelegation",
            type: "bool",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "description",
            type: {
              option: "string",
            },
          },
          {
            name: "websiteUrl",
            type: {
              option: "string",
            },
          },
          {
            name: "avatarImageUrl",
            type: {
              option: "string",
            },
          },
          {
            name: "operatorAuthKeys",
            type: {
              option: {
                vec: "pubkey",
              },
            },
          },
          {
            name: "usdcCommissionRateBps",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "createRewardRecordArgs",
      type: {
        kind: "struct",
        fields: [
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
          {
            name: "totalUsdcPayout",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "markEpochIsFinalizingArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "expectedEpoch",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "modifyRewardRecordArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "merkleRoots",
            type: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
        ],
      },
    },
    {
      name: "newCommissionRateSetting",
      type: {
        kind: "struct",
        fields: [
          {
            name: "rateBps",
            type: {
              option: "u16",
            },
          },
        ],
      },
    },
    {
      name: "operatorPool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: ["PDA Bump"],
            type: "u8",
          },
          {
            name: "initialPoolAdmin",
            docs: [
              "Initial pool admin. This is stored for the PDA derivation.",
            ],
            type: "pubkey",
          },
          {
            name: "admin",
            docs: ["Authority allowed to configure settings for this account."],
            type: "pubkey",
          },
          {
            name: "name",
            docs: ["Name of Operator."],
            type: "string",
          },
          {
            name: "description",
            docs: ["Description of Operator."],
            type: {
              option: "string",
            },
          },
          {
            name: "websiteUrl",
            docs: ["Website of Operator."],
            type: {
              option: "string",
            },
          },
          {
            name: "avatarImageUrl",
            docs: ["Avatar image url of Operator."],
            type: {
              option: "string",
            },
          },
          {
            name: "operatorStakingRecord",
            docs: ["StakingRecord owned by Operator."],
            type: "pubkey",
          },
          {
            name: "operatorAuthKeys",
            docs: [
              "Operator auth keys. Used to authenticate operator GPU workers.",
            ],
            type: {
              vec: "pubkey",
            },
          },
          {
            name: "autoStakeFees",
            docs: [
              "If commission fees received by Operator should be staked at the end of the epoch.",
            ],
            type: "bool",
          },
          {
            name: "rewardCommissionRateBps",
            docs: ["Commission Rate for Epoch Token Rewards. Capped at 100%."],
            type: "u16",
          },
          {
            name: "newRewardCommissionRateBps",
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
            name: "joinedAt",
            docs: ["Epoch that pool was created."],
            type: "u64",
          },
          {
            name: "closedAt",
            docs: [
              "Epoch that pool was permanently closed at, if set. Once a pool is closed, the pool will stop accruing",
              "any rewards starting from that epoch.",
            ],
            type: {
              option: "u64",
            },
          },
          {
            name: "isHalted",
            docs: [
              "If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,",
              "claim, withdraw rewards or close a pool. Other users can still unstake or claim.",
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
              "Commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to fee account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "accruedUsdcPayout",
            docs: [
              "USDC commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to USDC fee account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "usdcCommissionRateBps",
            docs: ["USDC commission rate in basis points (0-10000)"],
            type: "u16",
          },
          {
            name: "newUsdcCommissionRateBps",
            docs: ["Pending USDC commission rate for next epoch"],
            type: {
              option: "u16",
            },
          },
          {
            name: "cumulativeUsdcPerShare",
            docs: [
              "Cumulative USDC per share (scaled by USDC_PRECISION_FACTOR)",
            ],
            type: "u128",
          },
          {
            name: "accruedDelegatorUsdc",
            docs: [
              "USDC earned by delegators, yet to be transferred to the pool vault. Used to optimize compute.",
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
            name: "programAdmin",
            docs: [
              "Authority allowed to update authorities and other pool settings.",
            ],
            type: "pubkey",
          },
          {
            name: "rewardDistributionAuthorities",
            docs: [
              "List of signers authorized to create or modify RewardRecord.",
            ],
            type: {
              vec: "pubkey",
            },
          },
          {
            name: "haltAuthorities",
            docs: ["List of signers authorized to set OperatorPool.is_halted."],
            type: {
              vec: "pubkey",
            },
          },
          {
            name: "slashingAuthorities",
            docs: ["List of signers authorized to slash Operator's stake."],
            type: {
              vec: "pubkey",
            },
          },
          {
            name: "isEpochFinalizing",
            docs: ["Whether the current epoch is in the finalizing state."],
            type: "bool",
          },
          {
            name: "isStakingHalted",
            docs: [
              "Halts all staking instructions when true. Used as a security backstop.",
            ],
            type: "bool",
          },
          {
            name: "isWithdrawalHalted",
            docs: [
              "Halts all withdrawal instructions when true. Used as a security backstop.",
            ],
            type: "bool",
          },
          {
            name: "isAccrueRewardHalted",
            docs: [
              "Halts all accrue reward instructions when true. Used as a security backstop.",
            ],
            type: "bool",
          },
          {
            name: "allowPoolCreation",
            docs: ["If creation of OperatorPool is allowed."],
            type: "bool",
          },
          {
            name: "operatorPoolRegistrationFee",
            docs: ["Token fee required to register an OperatorPool."],
            type: "u64",
          },
          {
            name: "registrationFeePayoutWallet",
            docs: ["Wallet that receives the operator pool registration fees."],
            type: "pubkey",
          },
          {
            name: "minOperatorTokenStake",
            docs: [
              "Min. amount of token stake that the Operator must maintain staked in their pool.",
              "If the value is below this minimum, no delegations are allowed (unless pool is closed).",
            ],
            type: "u64",
          },
          {
            name: "delegatorUnstakeDelaySeconds",
            docs: ["Delay for unstaking in seconds for Delegators."],
            type: "u64",
          },
          {
            name: "operatorUnstakeDelaySeconds",
            docs: ["Delay for unstaking in seconds for Operators."],
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
          {
            name: "unclaimedUsdcPayout",
            docs: [
              "Total amount of USDC tokens across all epochs that are issued, but yet to be paid out.",
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
          {
            name: "totalUsdcPayout",
            docs: ["Amount of USDC tokens issued for this epoch."],
            type: "u64",
          },
          {
            name: "epochFinalizedAt",
            docs: [
              "Timestamp when the epoch was finalized (when this record was created).",
            ],
            type: "i64",
          },
        ],
      },
    },
    {
      name: "setHaltStatusArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "isHalted",
            docs: ["Whether the OperatorPool should be halted."],
            type: "bool",
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
      name: "slashStakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "slashedAmount",
            docs: ["Amount being of tokens being slashed."],
            type: "u64",
          },
          {
            name: "totalStakedAmount",
            docs: ["Total amount of remaining tokens staked in pool."],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: [
              "Total amount of remaining tokens being unstaked in the pool.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "stakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "stakeAmount",
            docs: ["Amount being of tokens being delegated to pool."],
            type: "u64",
          },
          {
            name: "totalStakedAmount",
            docs: ["Total amount of remaining tokens staked in pool."],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: [
              "Total amount of remaining tokens being unstaked in the pool.",
            ],
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
          {
            name: "lastSettledUsdcPerShare",
            docs: ["USDC per share value at last settlement"],
            type: "u128",
          },
          {
            name: "accruedUsdcEarnings",
            docs: ["Accrued USDC rewards available to claim"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "unstakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "unstakeAmount",
            docs: ["Amount being of tokens being unstaked from pool."],
            type: "u64",
          },
          {
            name: "totalStakedAmount",
            docs: ["Total amount of remaining tokens staked in pool."],
            type: "u64",
          },
          {
            name: "totalUnstaking",
            docs: [
              "Total amount of remaining tokens being unstaked in the pool.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "updateOperatorPoolArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "newRewardCommissionRateBps",
            docs: [
              "If set, the new commission rate will become active next epoch",
            ],
            type: {
              option: {
                defined: {
                  name: "newCommissionRateSetting",
                },
              },
            },
          },
          {
            name: "newUsdcCommissionRateBps",
            type: {
              option: {
                defined: {
                  name: "newCommissionRateSetting",
                },
              },
            },
          },
          {
            name: "allowDelegation",
            type: {
              option: "bool",
            },
          },
          {
            name: "autoStakeFees",
            type: {
              option: "bool",
            },
          },
          {
            name: "name",
            type: {
              option: "string",
            },
          },
          {
            name: "description",
            type: {
              option: "string",
            },
          },
          {
            name: "websiteUrl",
            type: {
              option: "string",
            },
          },
          {
            name: "avatarImageUrl",
            type: {
              option: "string",
            },
          },
          {
            name: "operatorAuthKeys",
            type: {
              option: {
                vec: "pubkey",
              },
            },
          },
        ],
      },
    },
    {
      name: "updatePoolOverviewArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "isStakingHalted",
            type: {
              option: "bool",
            },
          },
          {
            name: "isWithdrawalHalted",
            type: {
              option: "bool",
            },
          },
          {
            name: "isAccrueRewardHalted",
            type: {
              option: "bool",
            },
          },
          {
            name: "allowPoolCreation",
            type: {
              option: "bool",
            },
          },
          {
            name: "operatorPoolRegistrationFee",
            type: {
              option: "u64",
            },
          },
          {
            name: "minOperatorTokenStake",
            type: {
              option: "u64",
            },
          },
          {
            name: "delegatorUnstakeDelaySeconds",
            type: {
              option: "u64",
            },
          },
          {
            name: "operatorUnstakeDelaySeconds",
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "updatePoolOverviewAuthoritiesArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "newRewardDistributionAuthorities",
            type: {
              option: {
                vec: "pubkey",
              },
            },
          },
          {
            name: "newHaltAuthorities",
            type: {
              option: {
                vec: "pubkey",
              },
            },
          },
          {
            name: "newSlashingAuthorities",
            type: {
              option: {
                vec: "pubkey",
              },
            },
          },
        ],
      },
    },
  ],
} as const;

export type InferenceStaking = Mutable<typeof _IDL>;

export const getIdlWithProgramId = (programId: PublicKey): InferenceStaking => {
  const result = {
    ..._IDL,
    address: programId.toBase58(),
  };
  return result as InferenceStaking;
};

export const IDL = _IDL as InferenceStaking;
