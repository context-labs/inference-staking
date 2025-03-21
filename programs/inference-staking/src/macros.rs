#[macro_export]
macro_rules! operator_pool_signer_seeds {
    ($operator_pool:expr) => {
        &[
            &$operator_pool.pool_id.to_le_bytes(),
            b"OperatorPool",
            &[$operator_pool.bump],
        ]
    };
}
