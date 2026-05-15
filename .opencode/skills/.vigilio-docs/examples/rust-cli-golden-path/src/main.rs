use std::{env, process, path::Path};
fn main() {
    let mut args = env::args_os(); let _ = args.next();
    let Some(path) = args.next() else { eprintln!("Uso: vigilio-native-cli-reference archivo.csv"); process::exit(2); };
    if args.next().is_some() { eprintln!("Solo se admite un archivo"); process::exit(2); }
    match vigilio_native_cli_reference::run(Path::new(&path)) {
        Ok(total) => println!("{total}"),
        Err(err) => { eprintln!("Entrada invalida o inaccesible: {err}");process::exit(1); }
    }
}
