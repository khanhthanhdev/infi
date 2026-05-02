#!/usr/bin/env sh
# Infi installer for Linux (AppImage)
#
# Usage:
#   curl -fsSL https://khanhthanhdev.github.io/infi/install.sh | sh
#
# Environment overrides:
#   INFI_VERSION       Pin a specific version (e.g. 0.1.0). Defaults to latest release.
#   INFI_INSTALL_DIR   Where to drop the `infi` launcher. Defaults to $HOME/.local/bin.

set -eu

REPO="khanhthanhdev/infi"
BIN_NAME="infi"
INSTALL_DIR="${INFI_INSTALL_DIR:-$HOME/.local/bin}"

OS=$(uname -s)
case "$OS" in
    Linux) ;;
    *)
        echo "Error: this installer only supports Linux. Detected: $OS" >&2
        echo "       For macOS use: brew install --cask khanhthanhdev/tap/infi" >&2
        exit 1
        ;;
esac

ARCH=$(uname -m)
case "$ARCH" in
    x86_64 | amd64) ARCH_TAG="amd64" ;;
    *)
        echo "Error: unsupported architecture '$ARCH' (only x86_64 is published today)." >&2
        exit 1
        ;;
esac

need() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Error: required command '$1' not found." >&2
        exit 1
    }
}
need curl
need install

VERSION="${INFI_VERSION:-}"
if [ -z "$VERSION" ]; then
    VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' \
        | head -n 1)
fi
if [ -z "$VERSION" ]; then
    echo "Error: could not determine the latest Infi version. Set INFI_VERSION=x.y.z and retry." >&2
    exit 1
fi

ASSET="Infi_${VERSION}_${ARCH_TAG}.AppImage"
URL="https://github.com/${REPO}/releases/download/v${VERSION}/${ASSET}"

mkdir -p "$INSTALL_DIR"
TMP=$(mktemp -t infi.XXXXXX.AppImage)
trap 'rm -f "$TMP"' EXIT

echo "Downloading Infi v${VERSION} (${ARCH_TAG}) ..."
echo "  $URL"
curl -fL --progress-bar "$URL" -o "$TMP"

TARGET="$INSTALL_DIR/$BIN_NAME"
install -m 0755 "$TMP" "$TARGET"

echo
echo "Installed: $TARGET"

case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
        echo
        echo "Note: '$INSTALL_DIR' is not on your PATH. Add this to your shell rc:"
        echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
        ;;
esac

echo
echo "Launch with: infi"
