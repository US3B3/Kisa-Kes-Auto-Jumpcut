#!/bin/bash
# Kısa Kes Premiere Pro eklentisini kurar (çift tıklayın)
set -e
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/com.kisakes.panel"

# İmzasız eklentilere izin ver (Premiere 2020 ve sonrası)
for v in 9 10 11 12; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1; done

mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$SOURCE/CSXS" "$SOURCE/jsx" "$SOURCE/panel" "$TARGET/"
xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true

echo ""
echo "Kısa Kes kuruldu. Premiere Pro'yu yeniden başlatın:"
echo "Pencere > Uzantılar > Kısa Kes"
echo ""
read -n 1 -s -r -p "Kapatmak için bir tuşa basın..."
