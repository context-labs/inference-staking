use anchor_lang::prelude::*;

use crate::error::ErrorCode;

pub fn get_usdc_mint() -> Result<Pubkey> {
    let solana_environment =
        std::env::var("SOLANA_ENVIRONMENT").unwrap_or_else(|_| "localnet".to_string());

    match solana_environment.as_str() {
        "localnet" | "test" => Ok(pubkey!("usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV")),
        "devnet" => Ok(pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")),
        "mainnet" => Ok(pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")),
        _ => Err(ErrorCode::InvalidUsdcMint.into()),
    }
}
