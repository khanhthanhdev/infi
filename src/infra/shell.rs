use std::collections::HashMap;
use std::ffi::{OsStr, OsString};
use std::io::IsTerminal;
use std::path::{Path, PathBuf};
#[cfg(unix)]
use std::process::{Command, Stdio};
use std::sync::OnceLock;

// Marker-wrapped JSON lets us parse env output even if the shell prints noise.
const ENV_MARKER_START: &str = "__LAREVIEW_ENV_START__";
const ENV_MARKER_END: &str = "__LAREVIEW_ENV_END__";

static PATH_INIT: OnceLock<()> = OnceLock::new();

pub fn init_process_path() {
    PATH_INIT.get_or_init(init_process_path_internal);
}

// Used by login-shell capture (`--printenv`) to return a clean env payload.
pub fn print_env_for_capture() {
    let env_vars: HashMap<String, String> = std::env::vars().collect();
    let json = serde_json::to_string(&env_vars).unwrap_or_else(|_| "{}".to_string());
    println!("{ENV_MARKER_START}{json}{ENV_MARKER_END}");
}

fn init_process_path_internal() {
    #[cfg(unix)]
    {
        if should_load_shell_environment()
            && let Some(env) = capture_login_shell_environment()
        {
            apply_shell_environment(env);
        }
    }

    if path_is_missing_or_empty() {
        let fallback = default_path_env();
        if !fallback.is_empty() {
            unsafe {
                std::env::set_var("PATH", fallback);
            }
        }
    }
}

#[must_use]
pub fn find_bin(command: &str) -> Option<PathBuf> {
    init_process_path();

    let path = Path::new(command);
    if path.components().count() > 1 && path.is_file() {
        return Some(path.to_path_buf());
    }

    let candidate_names = candidate_names(command);
    for dir in collect_search_paths() {
        for name in &candidate_names {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    None
}

/// Locate a coding-agent CLI binary.
///
/// On Unix this is identical to [`find_bin`] (a PATH lookup, similar to `which`).
///
/// On Windows the lookup performs the Tolaria-style two-step fallback:
///
/// 1. PATH lookup (the same logic `where.exe` uses).
/// 2. If still not found, probe well-known per-user install directories
///    (`AppData\Roaming\npm`, `AppData\Local\pnpm`, `scoop\shims`,
///    `.npm-global\bin`, `.local\bin`, `.local\share\mise\shims`,
///    `.asdf\shims`, `.bun\bin`, `.<agent>\bin`) for `.exe` and `.cmd`
///    binaries matching the agent name.
#[must_use]
pub fn find_agent_bin(agent: &str) -> Option<PathBuf> {
    if let Some(path) = find_bin(agent) {
        return Some(path);
    }
    #[cfg(target_os = "windows")]
    {
        return find_agent_in_windows_locations(agent);
    }
    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

#[cfg(target_os = "windows")]
fn find_agent_in_windows_locations(agent: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let exe = format!("{agent}.exe");
    let cmd = format!("{agent}.cmd");

    let candidates: Vec<PathBuf> = vec![
        home.join("AppData").join("Roaming").join("npm").join(&cmd),
        home.join("AppData").join("Roaming").join("npm").join(&exe),
        home.join("AppData").join("Local").join("pnpm").join(&cmd),
        home.join("AppData").join("Local").join("pnpm").join(&exe),
        home.join("scoop").join("shims").join(&cmd),
        home.join("scoop").join("shims").join(&exe),
        home.join(".npm-global").join("bin").join(&cmd),
        home.join(".npm-global").join("bin").join(&exe),
        home.join(".npm").join("bin").join(&cmd),
        home.join(".npm").join("bin").join(&exe),
        home.join(".local").join("bin").join(&exe),
        home.join(format!(".{agent}")).join("bin").join(&exe),
        home.join(".local")
            .join("share")
            .join("mise")
            .join("shims")
            .join(&exe),
        home.join(".asdf").join("shims").join(&exe),
        home.join(".bun").join("bin").join(&cmd),
        home.join(".bun").join("bin").join(&exe),
    ];

    candidates.into_iter().find(|path| path.is_file())
}

/// Build a `std::process::Command` that does not flash a console window on
/// Windows. On other platforms this is identical to `Command::new`.
#[must_use]
pub fn hidden_std_command(program: impl AsRef<OsStr>) -> std::process::Command {
    let mut command = std::process::Command::new(program);
    suppress_windows_console_std(&mut command);
    command
}

#[cfg(target_os = "windows")]
fn suppress_windows_console_std(command: &mut std::process::Command) {
    use std::os::windows::process::CommandExt;
    // CREATE_NO_WINDOW: prevents a console window from being created for the
    // child process. https://learn.microsoft.com/windows/win32/procthread/process-creation-flags
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn suppress_windows_console_std(_command: &mut std::process::Command) {}

/// Apply the Windows `CREATE_NO_WINDOW` flag to a Tokio command so that
/// spawning a child process does not flash a console window. Safe no-op on
/// non-Windows targets.
pub fn suppress_windows_console_tokio(_command: &mut tokio::process::Command) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        _command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn collect_search_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(env_path) = std::env::var_os("PATH") {
        push_unique_paths(&mut paths, std::env::split_paths(&env_path));
    }

    if paths.is_empty() {
        push_unique_paths(&mut paths, default_search_paths());
    }

    paths
}

fn path_is_missing_or_empty() -> bool {
    match std::env::var_os("PATH") {
        None => true,
        Some(value) => value.to_string_lossy().trim().is_empty(),
    }
}

fn default_path_env() -> OsString {
    let paths = default_search_paths();
    if paths.is_empty() {
        return OsString::new();
    }
    std::env::join_paths(paths).unwrap_or_default()
}

fn default_search_paths() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        vec![
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/usr/sbin"),
            PathBuf::from("/sbin"),
        ]
    }
    #[cfg(target_os = "linux")]
    {
        let mut paths = vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/usr/local/sbin"),
            PathBuf::from("/usr/sbin"),
            PathBuf::from("/sbin"),
        ];
        // Add ~/.local/bin for user-installed binaries (common on Linux/WSL)
        if let Some(home) = dirs::home_dir() {
            paths.insert(0, home.join(".local/bin"));
        }
        paths
    }
    #[cfg(target_os = "windows")]
    {
        let mut paths = Vec::new();
        if let Some(root) = std::env::var_os("SystemRoot") {
            let root = PathBuf::from(root);
            paths.push(root.join("System32"));
            paths.push(root);
        }
        paths
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Vec::new()
    }
}

#[cfg(unix)]
fn should_load_shell_environment() -> bool {
    if cfg!(test) {
        return false;
    }
    !std::io::stdout().is_terminal()
}

#[cfg(not(unix))]
fn should_load_shell_environment() -> bool {
    false
}

#[cfg(unix)]
fn capture_login_shell_environment() -> Option<HashMap<String, String>> {
    let shell = system_shell_path()?;
    let home_dir = dirs::home_dir()?;
    let exe_path = std::env::current_exe().ok()?;

    let home_arg = shell_escape_arg(&home_dir)?;
    let exe_arg = shell_escape_arg(&exe_path)?;
    let command = format!("cd {home_arg}; {exe_arg} --printenv");

    let mut shell_command = Command::new(&shell);
    shell_command.args(["-l", "-i", "-c", &command]);
    shell_command.stdin(Stdio::null());

    let output = shell_command.output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let env_json = extract_marked_env(&stdout)?;
    serde_json::from_str(env_json).ok()
}

#[cfg(unix)]
fn system_shell_path() -> Option<PathBuf> {
    if let Ok(shell) = std::env::var("SHELL") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() {
            let path = PathBuf::from(trimmed);
            if path.exists() {
                return Some(path);
            }
        }
    }

    let fallbacks = [
        "/bin/zsh",
        "/usr/bin/zsh",
        "/bin/bash",
        "/usr/bin/bash",
        "/bin/sh",
    ];
    fallbacks
        .iter()
        .map(PathBuf::from)
        .find(|path| path.exists())
}

#[cfg(unix)]
fn extract_marked_env(output: &str) -> Option<&str> {
    let start = output.rfind(ENV_MARKER_START)?;
    let after_start = start + ENV_MARKER_START.len();
    let rest = &output[after_start..];
    let end = rest.find(ENV_MARKER_END)? + after_start;
    let json = output[after_start..end].trim();
    if json.is_empty() { None } else { Some(json) }
}

#[cfg(unix)]
fn apply_shell_environment(env: HashMap<String, String>) {
    for (key, value) in env {
        unsafe {
            std::env::set_var(&key, value);
        }
    }
}

#[cfg(unix)]
fn shell_escape_arg(path: &Path) -> Option<String> {
    shell_escape_value(path.as_os_str())
}

#[cfg(unix)]
fn shell_escape_value(value: &OsStr) -> Option<String> {
    let value = value.to_str()?;
    let mut escaped = String::with_capacity(value.len() + 2);
    escaped.push('\'');
    for ch in value.chars() {
        if ch == '\'' {
            escaped.push_str("'\\''");
        } else {
            escaped.push(ch);
        }
    }
    escaped.push('\'');
    Some(escaped)
}

fn candidate_names(command: &str) -> Vec<OsString> {
    #[cfg(target_os = "windows")]
    {
        let mut names = Vec::new();
        if Path::new(command).extension().is_none() {
            // Try PATHEXT extensions first (.COM, .EXE, .BAT, .CMD) so that
            // e.g. `npx.cmd` is found before the extensionless `npx` shell
            // script that Node.js installs on Windows. CreateProcessW can only
            // execute .exe/.com/.bat/.cmd directly.
            let exts =
                std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_string());
            for ext in exts.split(';') {
                let ext = ext.trim();
                if ext.is_empty() {
                    continue;
                }
                names.push(OsString::from(format!("{command}{ext}")));
            }
        }
        names.push(OsString::from(command));
        names
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec![OsString::from(command)]
    }
}

fn push_unique_paths<I>(dest: &mut Vec<PathBuf>, paths: I)
where
    I: IntoIterator<Item = PathBuf>,
{
    for path in paths {
        if !dest.iter().any(|existing| existing == &path) {
            dest.push(path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_bin_missing() {
        assert!(find_bin("non_existent_binary_12345").is_none());
    }

    #[test]
    fn test_candidate_names() {
        let names = candidate_names("test");
        assert!(names.contains(&OsString::from("test")));
    }

    #[test]
    fn test_push_unique_paths() {
        let mut dest = vec![PathBuf::from("/a")];
        let paths = vec![PathBuf::from("/a"), PathBuf::from("/b")];
        push_unique_paths(&mut dest, paths);
        assert_eq!(dest.len(), 2);
        assert_eq!(dest[1], PathBuf::from("/b"));
    }

    #[test]
    #[cfg(unix)]
    fn test_extract_marked_env() {
        let output = format!("noise{ENV_MARKER_START}{{\"PATH\":\"/bin\"}}{ENV_MARKER_END}more");
        let extracted = extract_marked_env(&output).expect("marker");
        assert_eq!(extracted, "{\"PATH\":\"/bin\"}");
    }
}
