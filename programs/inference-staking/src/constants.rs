use anchor_lang::prelude::*;

#[cfg(feature = "test")]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV");

#[cfg(feature = "devnet")]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

#[cfg(all(not(feature = "test"), not(feature = "devnet")))]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
