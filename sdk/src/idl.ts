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
          name: "rewardFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 82, 101, 119, 97, 114, 100, 67, 111, 109,
                  109, 105, 115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86,
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
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86, 97, 117,
                  108, 116,
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
      name: "accrueRewardEmergencyBypass",
      discriminator: [42, 22, 105, 160, 223, 106, 212, 244],
      accounts: [
        {
          name: "admin",
          docs: ["Only the pool admin can execute this emergency bypass"],
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
          name: "currentPoolRewardRecord",
          docs: [
            "The current reward record that should have been claimed (at reward_last_claimed_epoch + 1)",
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 82, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "current_pool_reward_record.epoch",
                account: "rewardRecord",
              },
            ],
          },
        },
        {
          name: "nextPoolRewardRecord",
          docs: [
            "The next reward record that we're bypassing to (at reward_last_claimed_epoch + 2)",
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [82, 101, 119, 97, 114, 100, 82, 101, 99, 111, 114, 100],
              },
              {
                kind: "account",
                path: "next_pool_reward_record.epoch",
                account: "rewardRecord",
              },
            ],
          },
        },
      ],
      args: [],
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
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
          name: "destination",
          docs: [
            "Destination account for the USDC earnings. Must be a USDC token account.",
          ],
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
          name: "rewardFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 82, 101, 119, 97, 114, 100, 67, 111, 109,
                  109, 105, 115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86,
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
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86, 97, 117,
                  108, 116,
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
          name: "slashingDestinationTokenAccount",
        },
        {
          name: "slashingDestinationUsdcAccount",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
          name: "rewardFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 82, 101, 119, 97, 114, 100, 67, 111, 109,
                  109, 105, 115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86,
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
          name: "usdcFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 85, 115, 100, 99, 67, 111, 109, 109, 105,
                  115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86, 97, 117,
                  108, 116,
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
          name: "slashingDestinationTokenAccount",
          writable: true,
        },
        {
          name: "slashingDestinationUsdcAccount",
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "stakeArgs",
            },
          },
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "unstakeArgs",
            },
          },
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
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
        {
          name: "slashingDestinationUsdcAccount",
          optional: true,
        },
        {
          name: "slashingDestinationTokenAccount",
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
      name: "withdrawOperatorRewardCommission",
      discriminator: [224, 6, 179, 170, 51, 12, 49, 221],
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
          name: "rewardFeeTokenAccount",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  80, 111, 111, 108, 82, 101, 119, 97, 114, 100, 67, 111, 109,
                  109, 105, 115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86,
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
          name: "destination",
          docs: ["Destination for the commission."],
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
                  115, 115, 105, 111, 110, 84, 111, 107, 101, 110, 86, 97, 117,
                  108, 116,
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
        {
          name: "instructions",
          address: "Sysvar1nstructions1111111111111111111111111",
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
      name: "accrueRewardEvent",
      discriminator: [11, 196, 7, 233, 111, 253, 169, 40],
    },
    {
      name: "cancelUnstakeEvent",
      discriminator: [202, 68, 119, 87, 220, 185, 210, 149],
    },
    {
      name: "changeOperatorAdminEvent",
      discriminator: [143, 86, 181, 172, 159, 96, 196, 169],
    },
    {
      name: "changeOperatorStakingRecordEvent",
      discriminator: [33, 113, 141, 141, 164, 38, 251, 167],
    },
    {
      name: "claimUnstakeEvent",
      discriminator: [18, 255, 161, 59, 246, 47, 255, 127],
    },
    {
      name: "claimUsdcEarningsEvent",
      discriminator: [123, 242, 220, 20, 212, 247, 183, 251],
    },
    {
      name: "operatorAutoStakeEvent",
      discriminator: [33, 144, 180, 33, 20, 44, 4, 71],
    },
    {
      name: "setHaltStatusEvent",
      discriminator: [177, 172, 145, 169, 40, 114, 225, 48],
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
      name: "sweepClosedPoolUsdcDustEvent",
      discriminator: [215, 198, 152, 9, 89, 104, 209, 73],
    },
    {
      name: "unstakeEvent",
      discriminator: [162, 104, 137, 228, 81, 3, 79, 197],
    },
    {
      name: "updateOperatorPoolEvent",
      discriminator: [222, 183, 216, 37, 100, 98, 220, 18],
    },
    {
      name: "withdrawOperatorRewardCommissionEvent",
      discriminator: [170, 145, 80, 127, 1, 216, 154, 83],
    },
    {
      name: "withdrawOperatorUsdcCommissionEvent",
      discriminator: [205, 80, 75, 205, 138, 230, 81, 83],
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
      msg: "Minimum operator token stake not met",
    },
    {
      code: 6004,
      name: "noTokensToClaim",
      msg: "No tokens available to be claimed",
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
      name: "duplicateOperatorAuthKey",
      msg: "Duplicate operator auth key provided",
    },
    {
      code: 6021,
      name: "accountNotEmpty",
      msg: "Account not empty",
    },
    {
      code: 6022,
      name: "poolCreationDisabled",
      msg: "Pool creation is disabled",
    },
    {
      code: 6023,
      name: "invalidUsdcMint",
      msg: "Invalid USDC mint provided",
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
      msg: "Cannot update operator pool admin when epoch is finalizing",
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
      msg: "Invalid website URL provided",
    },
    {
      code: 6033,
      name: "invalidAvatarImageUrl",
      msg: "Invalid avatar image URL provided",
    },
    {
      code: 6034,
      name: "unclaimedUsdcEarnings",
      msg: "USDC earnings must be claimed before unstaking",
    },
    {
      code: 6035,
      name: "noUsdcEarningsToClaim",
      msg: "No USDC earnings available to claim",
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
    {
      code: 6042,
      name: "invalidEmergencyBypassEpoch",
      msg: "Invalid epoch for emergency bypass",
    },
    {
      code: 6043,
      name: "invalidEpoch",
      msg: "Invalid epoch provided",
    },
    {
      code: 6044,
      name: "invalidRewardAmount",
      msg: "Invalid reward amount - does not match expected emissions for epoch",
    },
    {
      code: 6045,
      name: "invalidSlashingDelay",
      msg: "Slashing delay must be at least 86,400 seconds (1 day)",
    },
    {
      code: 6046,
      name: "operatorPoolNotHalted",
      msg: "Operator pool must be halted before slashing",
    },
    {
      code: 6047,
      name: "slashingDelayNotMet",
      msg: "Minimum slashing delay period has not elapsed",
    },
    {
      code: 6048,
      name: "invalidAmount",
      msg: "Invalid amount provided - cannot be zero",
    },
    {
      code: 6049,
      name: "invalidSlashSharesAmount",
      msg: "Invalid shares amount provided - cannot be greater than total operator shares",
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
      name: "accrueRewardEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "totalRewardsTransferred",
            type: "u64",
          },
          {
            name: "totalUsdcTransferred",
            type: "u64",
          },
          {
            name: "delegatorRewards",
            type: "u64",
          },
          {
            name: "operatorRewardCommission",
            type: "u64",
          },
          {
            name: "delegatorUsdcEarnings",
            type: "u64",
          },
          {
            name: "operatorUsdcCommission",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "cancelUnstakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "tokenAmount",
            type: "u64",
          },
          {
            name: "sharesAmount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "changeOperatorAdminEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "oldAdmin",
            type: "pubkey",
          },
          {
            name: "newAdmin",
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "changeOperatorStakingRecordEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "oldStakingRecord",
            type: "pubkey",
          },
          {
            name: "newStakingRecord",
            type: "pubkey",
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
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "tokenAmount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "claimUsdcEarningsEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "destination",
            type: "pubkey",
          },
          {
            name: "usdcAmount",
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
      name: "operatorAutoStakeEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "tokenAmount",
            type: "u64",
          },
          {
            name: "sharesAmount",
            type: "u64",
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
            name: "version",
            docs: ["Version of the OperatorPool account."],
            type: "u8",
          },
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
            name: "joinedAtEpoch",
            docs: ["Epoch that pool was created."],
            type: "u64",
          },
          {
            name: "closedAtEpoch",
            docs: [
              "Epoch that pool was permanently closed at, if set. Once a pool is closed, the pool will stop accruing",
              "any rewards starting from that epoch.",
            ],
            type: {
              option: "u64",
            },
          },
          {
            name: "haltedAtTimestamp",
            docs: [
              "Timestamp when the pool was halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,",
              "claim, withdraw rewards or close a pool. Other users can still unstake or claim.",
              "When unhalted, this is set to None.",
            ],
            type: {
              option: "i64",
            },
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
            name: "accruedRewardCommission",
            docs: [
              "Commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to fee account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "accruedUsdcCommission",
            docs: [
              "USDC commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to USDC fee account.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "accruedDelegatorUsdc",
            docs: [
              "USDC earned by delegators, yet to be transferred to the pool vault.",
              "Used to optimize compute.",
            ],
            type: "u64",
          },
          {
            name: "cumulativeUsdcPerShare",
            docs: [
              "Cumulative USDC per share (scaled by USDC_PRECISION_FACTOR)",
            ],
            type: "u128",
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
            docs: ["List of signers authorized to set OperatorPool.halted_at."],
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
            name: "slashingDestinationUsdcAccount",
            docs: ["Destination account for slashed USDC tokens."],
            type: "pubkey",
          },
          {
            name: "slashingDestinationTokenAccount",
            docs: ["Destination account for slashed tokens."],
            type: "pubkey",
          },
          {
            name: "slashingDelaySeconds",
            docs: [
              "Delay in seconds after halting a pool before slashing can occur. Minimum 86,400 seconds (1 day).",
            ],
            type: "u64",
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
            name: "unclaimedUsdc",
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
            name: "version",
            docs: ["Version of the RewardRecord account."],
            type: "u8",
          },
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
      name: "setHaltStatusEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "isHalted",
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
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "operatorStakingRecord",
            type: "pubkey",
          },
          {
            name: "authority",
            type: "pubkey",
          },
          {
            name: "destination",
            type: "pubkey",
          },
          {
            name: "destinationUsdc",
            type: "pubkey",
          },
          {
            name: "sharesSlashed",
            type: "u64",
          },
          {
            name: "tokenAmountSlashed",
            type: "u64",
          },
          {
            name: "usdcConfiscated",
            type: "u64",
          },
          {
            name: "rewardCommissionConfiscated",
            type: "u64",
          },
          {
            name: "usdcCommissionConfiscated",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "stakeArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "tokenAmount",
            docs: ["Amount of tokens to stake."],
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
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "tokenAmount",
            type: "u64",
          },
          {
            name: "sharesAmount",
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
            name: "version",
            docs: ["Version of the StakingRecord account."],
            type: "u8",
          },
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
      name: "sweepClosedPoolUsdcDustEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "usdcAmountSwept",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "unstakeArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "sharesAmount",
            docs: ["Amount of shares to unstake."],
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
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "stakingRecord",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "isOperator",
            type: "bool",
          },
          {
            name: "tokenAmount",
            type: "u64",
          },
          {
            name: "sharesAmount",
            type: "u64",
          },
          {
            name: "unstakeAtTimestamp",
            type: "i64",
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
              "If provided, the new commission rates will become active after the next epoch's reward claim for this pool",
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
      name: "updateOperatorPoolEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
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
          {
            name: "slashingDelaySeconds",
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
    {
      name: "withdrawOperatorRewardCommissionEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "destination",
            type: "pubkey",
          },
          {
            name: "rewardAmountWithdrawn",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "withdrawOperatorUsdcCommissionEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "instructionIndex",
            type: "u16",
          },
          {
            name: "operatorPool",
            type: "pubkey",
          },
          {
            name: "epoch",
            type: "u64",
          },
          {
            name: "admin",
            type: "pubkey",
          },
          {
            name: "destination",
            type: "pubkey",
          },
          {
            name: "usdcAmountWithdrawn",
            type: "u64",
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
