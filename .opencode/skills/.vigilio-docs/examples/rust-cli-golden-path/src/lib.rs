//! Procesador CLI mínimo sin dependencias externas; los tests no requieren red.
use std::{fs, io, path::Path};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseError { EmptyInput, InvalidLine { line: usize } }

/// Convierte líneas `nombre,centimos` a un total en unidades menores.
/// Nunca usa f64 para cantidades monetarias.
pub fn sum_minor_units(text: &str) -> Result<i64, ParseError> {
    if text.trim().is_empty() { return Err(ParseError::EmptyInput); }
    let mut total = 0i64;
    for (index, line) in text.lines().enumerate() {
        let (_, value) = line.split_once(',').ok_or(ParseError::InvalidLine { line: index + 1 })?;
        let cents: i64 = value.trim().parse().map_err(|_| ParseError::InvalidLine { line: index + 1 })?;
        total = total.checked_add(cents).ok_or(ParseError::InvalidLine { line: index + 1 })?;
    }
    Ok(total)
}

pub fn run(path: &Path) -> Result<i64, io::Error> {
    let content = fs::read_to_string(path)?;
    sum_minor_units(&content).map_err(|problem| io::Error::new(io::ErrorKind::InvalidData, format!("{problem:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn sums_minor_units() { assert_eq!(sum_minor_units("a,120\nb,30"),Ok(150)); }
    #[test] fn rejects_bad_line() { assert_eq!(sum_minor_units("a,xx"),Err(ParseError::InvalidLine {line:1})); }
    #[test] fn avoids_overflow() { assert!(sum_minor_units("a,9223372036854775807\nb,1").is_err()); }
}
