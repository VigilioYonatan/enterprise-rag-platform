use std::{fs,process::Command};
#[test]
fn executable_reads_file() {
    let temp = std::env::temp_dir().join(format!("vigilio-native-test-{}.csv",std::process::id()));
    fs::write(&temp,"venta,180\nreversa,-30\n").unwrap();
    let output=Command::new(env!("CARGO_BIN_EXE_vigilio-native-cli-reference")).arg(&temp).output().unwrap();
    let _=fs::remove_file(&temp);
    assert!(output.status.success(),"{:?}",output);
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(),"150");
}
