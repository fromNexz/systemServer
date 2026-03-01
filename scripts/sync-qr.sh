SOURCE="/var/www/systemServer/data/image/whatsapp_qr.png"
DEST="/var/www/html/qr.png"

echo "🔄 Iniciando sincronização do QR Code..."

while true; do
    if [ -f "$SOURCE" ]; then
        # Copiar se o arquivo fonte for mais novo
        if [ "$SOURCE" -nt "$DEST" ] || [ ! -f "$DEST" ]; then
            cp "$SOURCE" "$DEST"
            chmod 644 "$DEST"
            echo "📸 QR Code atualizado: $(date)"
        fi
    fi
    sleep 2
done
