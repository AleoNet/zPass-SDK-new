use thiserror::Error;

#[derive(Error, Debug)]
pub enum CustomError {
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}
