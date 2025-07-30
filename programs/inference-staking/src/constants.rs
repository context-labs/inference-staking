use anchor_lang::prelude::*;

#[cfg(feature = "test")]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV");

#[cfg(feature = "devnet")]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("usd4j6yiMZEWHSFzPJVEL2Yt6bH2AKYobdECrGNeAcx");

#[cfg(all(not(feature = "test"), not(feature = "devnet")))]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

#[cfg(feature = "test")]
pub const MIN_SLASHING_DELAY_SECONDS: u64 = 3;

#[cfg(feature = "devnet")]
pub const MIN_SLASHING_DELAY_SECONDS: u64 = 30;

#[cfg(all(not(feature = "test"), not(feature = "devnet")))]
pub const MIN_SLASHING_DELAY_SECONDS: u64 = 86_400;

/// Precision scalar for USDC calculations
/// Using 1e18 for maximum precision with large share counts
pub const USDC_PRECISION_FACTOR: u128 = 1_000_000_000_000_000_000;
