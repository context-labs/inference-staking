#[macro_export]
macro_rules! operator_pool_signer_seeds {
    ($operator_pool:expr) => {
        &[
            b"OperatorPool",
            &$operator_pool.initial_pool_admin.as_ref(),
            &[$operator_pool.bump],
        ]
    };
}
