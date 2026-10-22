#!/bin/sh
set -e

BUILD_DATE="Unknown"
if [ -f "build_info.txt" ]; then
  BUILD_DATE=$(cat build_info.txt)
fi

echo "=========================================================="
echo " [ZAFI BACKEND] CONTAINER INITIALIZATION"
echo " Image Build Time : $BUILD_DATE"
echo " Node Version     : $(node -v)"
echo " Environment      : ${NODE_ENV:-development}"
echo " Database Host    : ${DATABASE_URL%%@*}@..."
echo "=========================================================="

SCHEMA_PATH="src/core/prisma/schema.prisma"
if [ ! -f "$SCHEMA_PATH" ]; then
  if [ -f "apps/backend/src/core/prisma/schema.prisma" ]; then
    SCHEMA_PATH="apps/backend/src/core/prisma/schema.prisma"
  fi
fi

echo "==> Menggunakan Prisma Schema di: $SCHEMA_PATH"

# 1. Retry loop untuk menghubungkan ke database dan push schema (tabel & kolom baru otomatis dibuat)
if [ "$SKIP_DB_PUSH" = "true" ]; then
  echo "==> [Info] SKIP_DB_PUSH=true, melewati prisma db push untuk mempercepat boot time."
else
  MAX_RETRIES=3
  RETRY_COUNT=0
  DB_SUCCESS=false

  echo "==> Menyinkronkan struktur database (prisma db push)..."
  until [ $RETRY_COUNT -ge $MAX_RETRIES ]
  do
    if npx prisma db push --accept-data-loss --schema="$SCHEMA_PATH"; then
      echo "==> [Sukses] Database berhasil disinkronkan dengan schema terbaru!"
      DB_SUCCESS=true
      break
    else
      RETRY_COUNT=$((RETRY_COUNT+1))
      echo "==> [Peringatan] Gagal sinkronisasi DB (Percobaan $RETRY_COUNT/$MAX_RETRIES). Menunggu 1 detik..."
      sleep 1
    fi
  done

  if [ "$DB_SUCCESS" = false ]; then
    echo "==> [Warning] prisma db push belum berhasil setelah $MAX_RETRIES percobaan. Aplikasi tetap melanjutkan boot..."
  fi
fi

# 2. Generate Prisma Client hanya jika belum ada di image (menghemat 5-8 detik saat reboot)
if [ ! -d "node_modules/.prisma/client" ] && [ ! -d "apps/backend/node_modules/.prisma/client" ]; then
  echo "==> Prisma Client belum terdeteksi, meng-generate..."
  npx prisma generate --schema="$SCHEMA_PATH" || echo "[Warning] prisma generate selesai dengan catatan."
fi

# 3. Sinkronisasikan folder .prisma client ke node_modules root
if [ -d "apps/backend/node_modules/.prisma" ]; then
  mkdir -p node_modules/.prisma
  cp -r apps/backend/node_modules/.prisma/* node_modules/.prisma/ 2>/dev/null || true
fi
if [ -d "node_modules/.prisma" ]; then
  mkdir -p apps/backend/node_modules/.prisma
  cp -r node_modules/.prisma/* apps/backend/node_modules/.prisma/ 2>/dev/null || true
fi

# 4. Jalankan aplikasi NestJS
echo "==> Menjalankan server backend NestJS..."
if [ -f "dist/main.js" ]; then
  exec node dist/main.js
elif [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
else
  echo "ERROR: Entrypoint NestJS tidak ditemukan di dist/main.js atau dist/src/main.js!"
  exit 1
fi
