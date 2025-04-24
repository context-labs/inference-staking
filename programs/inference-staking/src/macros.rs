#[macro_export]
macro_rules! operator_pool_signer_seeds {
    ($operator_pool:expr) => {
        &[
            b"OperatorPool",
            &$operator_pool.pool_id.to_le_bytes(),
            &[$operator_pool.bump],
        ]
    };
}
