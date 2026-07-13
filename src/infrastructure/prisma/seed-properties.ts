import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Properties...');

  // Zafi Residence
  await prisma.property.create({
    data: {
      name: 'Zafi Residence - Tipe 36 Subsidi',
      location: 'Jl. Ayani - Jl. Parit Sembin, Kabupaten Kuburaya',
      type: 'Subsidi',
      cashPrice: 195000000,
      adminFee: 1000000,
      dp: null, // Bervariasi tergantung blok
      landArea: 'Bervariasi (7x22m - 10x24m)',
      electricity: '1300 Watt',
      bedrooms: 2,
      bathrooms: 1,
      specifications: 'Tanah Blok A 7 x 22 m, Tanah Blok B 7 x 24 m. Teras Depan, Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm, Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu, Rangka Atap Kayu, Atap Genteng Metal.',
      facilities: 'Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter.',
      installmentInfo: `DP + Akad bervariasi:
BLOK A:
- A1 - A3 (7x22m) = Rp. 14.000.000
- A4 - A26 (7x22m) = Rp. 10.000.000
- A15 (8x23m) = Rp. 27.000.000
- A27 (8x22m) = Rp. 18.000.000

BLOK B:
- B1 - B3 (7x24m) = Rp. 22.000.000
- B4 - B30 (7x24m) = Rp. 18.000.000
- B31 (10x24m) = Rp. 14.000.000

Estimasi Cicilan:
- 10 Tahun = Rp. 1.901.400 / bulan
- 15 Tahun = Rp. 1.414.500 / bulan
- 20 Tahun = Rp. 1.178.800 / bulan`,
    },
  });

  // Griya Amanah 2 - Type 40
  await prisma.property.create({
    data: {
      name: 'Griya Amanah 2 - Tipe 40',
      location: 'Jl. Berdikari - Jl. Bukit Batu 2, Pal V, Pontianak Barat',
      type: 'Komersil',
      cashPrice: 295000000,
      adminFee: 5000000,
      dp: 40000000,
      landArea: '8 x 16 m',
      electricity: '1300 Watt',
      bedrooms: 2,
      bathrooms: 1,
      specifications: 'Teras Depan, Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm, Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu, Rangka Atap Baja Ringan, Atap Genteng Metal.',
      facilities: 'Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 7 Meter.',
      installmentInfo: `Estimasi BSN:
15 Tahun (Plafon 250 Juta):
- Tahun 1: Rp 2,108,292
- Tahun 2: Rp 2,316,110
- Tahun 3: Rp 2,684,984
- Tahun 4: Rp 3,079,678
- Tahun 5 - Lunas: Rp 3,161,461

20 Tahun (Plafon 250 Juta):
- Tahun 1: Rp 1,789,636
- Tahun 2: Rp 2,012,455
- Tahun 3: Rp 2,410,898
- Tahun 4: Rp 2,838,589
- Tahun 5 - Lunas: Rp 2,927,158

Estimasi BSI (Tenor 15 Tahun):
Rp 2,671,239 / Bulan Flat`,
    },
  });

  // Griya Amanah 2 - Type 45
  await prisma.property.create({
    data: {
      name: 'Griya Amanah 2 - Tipe 45',
      location: 'Jl. Berdikari - Jl. Bukit Batu 2, Pal V, Pontianak Barat',
      type: 'Komersil',
      cashPrice: 330000000,
      adminFee: 5000000,
      dp: 45000000,
      landArea: '9 x 16 m',
      electricity: '1300 Watt Up To 2200 Watt',
      bedrooms: 2,
      bathrooms: 1,
      specifications: 'Teras Depan, Pondasi Setinggi 50 cm, Keramik Ukuran 60x60 cm, Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu, Rangka Atap Baja Ringan, Atap Genteng Metal.',
      facilities: 'Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 7 Meter.',
      installmentInfo: `Estimasi BSN:
15 Tahun (Plafon 280 Juta):
- Tahun 1: Rp 2,361,287
- Tahun 2: Rp 2,594,044
- Tahun 3: Rp 3,007,182
- Tahun 4: Rp 3,449,240
- Tahun 5 - Lunas: Rp 3,540,836

20 Tahun (Plafon 280 Juta):
- Tahun 1: Rp 2,004,392
- Tahun 2: Rp 2,253,949
- Tahun 3: Rp 2,700,206
- Tahun 4: Rp 3,179,220
- Tahun 5 - Lunas: Rp 3,278,417

Estimasi BSI (Tenor 15 Tahun):
Rp 2,991,788 / Bulan Flat`,
    },
  });

  // Seven Residence
  await prisma.property.create({
    data: {
      name: 'Seven Residence - Tipe 45',
      location: 'Jl. Parit Haji Muhsin II, Gg. Abdul Karim',
      type: 'Komersil',
      cashPrice: 375000000,
      adminFee: 6000000,
      dp: 50000000,
      landArea: '8 x 20 m',
      electricity: '1300 Watt',
      bedrooms: 2,
      bathrooms: 1,
      specifications: 'Air PDAM. Teras Depan, Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm, Kusen & Daun Pintu Kayu Bengkirai, Kusen & Daun Jendela Kayu Bengkirai, Rangka Atap Baja Ringan, Atap Genteng Metal.',
      facilities: 'Carport, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter.',
      installmentInfo: `Estimasi BSN:
15 Tahun (Plafon 319 juta):
- Tahun 1: Rp 2.690.179
- Tahun 2: Rp 2.955.357
- Tahun 3: Rp 3.426.039
- Tahun 4: Rp 3.929.670
- Tahun 5 – Lunas: Rp 4.034.024

20 Tahun (Plafon 319 juta):
- Tahun 1: Rp 2.283.576
- Tahun 2: Rp 2.567.892
- Tahun 3: Rp 3.076.304
- Tahun 4: Rp 3.622.040
- Tahun 5 – Lunas: Rp 3.735.055

Estimasi BSI (Tenor 15 tahun, flat):
Rp 3.408.460 / bulan`,
    },
  });

  // Kahyana Residence
  await prisma.property.create({
    data: {
      name: 'Kahyana Residence - Tipe 36 Subsidi',
      location: 'Jl. Usaha Baru - Parit langgar, Kabupaten Kuburaya',
      type: 'Subsidi',
      cashPrice: 195000000,
      adminFee: null,
      dp: 1000000, // 1 Juta DP + Akad
      landArea: '7 x 22 - 24 m',
      electricity: '1300 Watt',
      bedrooms: 2,
      bathrooms: 1,
      specifications: 'Teras Depan, Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm, Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu, Rangka Atap Kayu, Atap Genteng.',
      facilities: 'Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter.',
      installmentInfo: `Harga Cash: Rp 195 Juta (Cash Keras), Rp 205 Juta (Cash Tempo).
DP + Akad: 1 Juta (Di Luar angsuran mengendap).

Estimasi Cicilan:
- 10 Tahun = Rp. 1.901.400 / bulan
- 15 Tahun = Rp. 1.414.500 / bulan
- 20 Tahun = Rp. 1.178.800 / bulan`,
    },
  });

  console.log('Properties seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
