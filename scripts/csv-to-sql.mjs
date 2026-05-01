// Run with: node scripts/csv-to-sql.mjs > scripts/import-alat.sql

const csv = `Code,Nama Barang,Merk,Status,Sumber,Foto Real,Lokasi,Keterangan,Mahasiswa,Mahasiswa Pascasarjana,Dosen/Karyawan,Kerjasama,Umum,Satuan,Status Pinjam
USC-0001,Vital Capacity Meter,,Rusak,SSFC,Inventaris_Images/USC-0001.Foto Real.054323.jpg,1415,,"Rp0,00","Rp112.500,00","Rp150.000,00","Rp187.000,00","Rp225.000,00",hari,
USC-0002,Speed Anticipation,,Baik,SSFC,Inventaris_Images/USC-0002.Foto Real.054408.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0003,Whole Body Reaction,,Baik,SSFC,Inventaris_Images/USC-0003.Foto Real.054453.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp100.000,00","Rp150.000,00",hari,
USC-0004,Whole Body Reaction,,Baik,SSFC,Inventaris_Images/USC-0004.Foto Real.054533.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp100.000,00","Rp150.000,00",hari,
USC-0005,Standing trunk Flexion,,Baik,SSFC,Inventaris_Images/USC-0005.Foto Real.054658.jpg,1415,,"Rp0,00","Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,
USC-0006,Attachment Selector,,Kurang Baik,SSFC,Inventaris_Images/USC-0006.Foto Real.054821.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0007,Speed anticipation,,Baik,SSFC,Inventaris_Images/USC-0007.Foto Real.054913.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0008,Jump MD,Takei,Baik,SSFC,Inventaris_Images/USC-0008.Foto Real.053310.jpg,1415,,"Rp0,00","Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,
USC-0009,Digital dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0009.Foto Real.055046.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0010,Speed anticipation,,Kurang Baik,SSFC,Inventaris_Images/USC-0010.Foto Real.055226.jpg,1415,Lampu nya mati,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0011,Jump DF,Takei,Baik,SSFC,Inventaris_Images/USC-0011.Foto Real.055318.jpg,1415,,"Rp0,00","Rp56.250,00","Rp75.000,00","Rp93.750,00","Rp112.500,00",hari,
USC-0012,Force plate,,Kurang Baik,SSFC,Inventaris_Images/USC-0012.Foto Real.055438.jpg,1415,Harus update driver,"Rp0,00","Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,
USC-0013,Ergoline,,Baik,SSFC,Inventaris_Images/USC-0013.Foto Real.055550.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0014,Cosmed,,Rusak,FIKK,Inventaris_Images/USC-0014.Foto Real.055651.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0015,Side Step,,Baik,SSFC,Inventaris_Images/USC-0015.Foto Real.055846.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0016,Mirror drawing,,Baik,SSFC,Inventaris_Images/USC-0016.Foto Real.055940.jpg,1415,,"Rp0,00","Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,
USC-0017,CPET,,Kurang Baik,SSFC,Inventaris_Images/USC-0017.Foto Real.060044.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0018,CPET,,Kurang Baik,SSFC,Inventaris_Images/USC-0018.Foto Real.060138.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0019,CPET,,Rusak,SSFC,Inventaris_Images/USC-0019.Foto Real.060224.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0020,CPET,,Rusak,SSFC,Inventaris_Images/USC-0020.Foto Real.060304.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0021,CPET,,Rusak,SSFC,Inventaris_Images/USC-0021.Foto Real.060348.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0022,CPET,,Rusak,SSFC,Inventaris_Images/USC-0022.Foto Real.060536.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0023,CPET,,Rusak,SSFC,Inventaris_Images/USC-0023.Foto Real.060608.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0024,CPET,,Rusak,SSFC,Inventaris_Images/USC-0024.Foto Real.060640.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0025,CPET,,Rusak,SSFC,Inventaris_Images/USC-0025.Foto Real.060717.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0026,Antropometri,,Baik,SSFC,Inventaris_Images/USC-0026.Foto Real.060826.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0027,Cosmed K4,,Rusak,SSFC,Inventaris_Images/USC-0027.Foto Real.061208.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0028,Cosmed K4,,Rusak,SSFC,Inventaris_Images/USC-0028.Foto Real.061033.jpg,1415,,"Rp0,00","Rp150.000,00","Rp175.000,00","Rp200.000,00","Rp250.000,00",orang,
USC-0029,Kamera Panasonic,,Kurang Baik,SSFC,Inventaris_Images/USC-0029.Foto Real.061414.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0030,Kamera vicon,,Kurang Baik,SSFC,Inventaris_Images/USC-0030.Foto Real.061534.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0031,Smart speed,,Kurang Baik,SSFC,Inventaris_Images/USC-0031.Foto Real.061703.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0032,Ball medicine,,Baik,SSFC,Inventaris_Images/USC-0032.Foto Real.061758.jpg,1415,,"Rp0,00","Rp18.750,00","Rp25.000,00","Rp31.250,00","Rp37.500,00",hari,
USC-0033,Jump DF,,Baik,SSFC,Inventaris_Images/USC-0033.Foto Real.061848.jpg,1415,Plate cuman 1,"Rp0,00","Rp56.250,00","Rp75.000,00","Rp93.750,00","Rp112.500,00",hari,
USC-0034,Speed light,,Kurang Baik,SSFC,Inventaris_Images/USC-0034.Foto Real.061947.jpg,1415,,"Rp0,00","Rp100.000,00","Rp125.000,00","Rp150.000,00","Rp175.000,00",hari,
USC-0035,Skinfold caliper,,Baik,SSFC,Inventaris_Images/USC-0035.Foto Real.062124.jpg,1415,,"Rp0,00","Rp67.500,00","Rp90.000,00","Rp112.500,00","Rp135.000,00",hari,
USC-0036,Sit and reach,,Baik,SSFC,Inventaris_Images/USC-0036.Foto Real.062413.jpg,1415,,"Rp0,00","Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,
USC-0037,Back and leg dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0037.Foto Real.062511.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0038,Back and leg dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0038.Foto Real.062542.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0039,Back and leg dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0039.Foto Real.062640.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0040,Back and leg dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0040.Foto Real.062704.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0041,Grip Strength Dynamometer,Takei,Baik,SSFC,Inventaris_Images/USC-0041.Foto Real.024637.jpg,1415,,"Rp0,00","Rp75.000,00","Rp100.000,00","Rp125.000,00","Rp150.000,00",hari,
USC-0076,Balance Board,Technogym,Baik,SSFC,Inventaris_Images/USC-0076.Foto Real.025045.jpg,2201,,"Rp0,00",,,,,,
USC-0077,Change Plate 2kg,Edge,Baik,DBON,Inventaris_Images/USC-0077.Foto Real.024232.jpg,2201,,"Rp0,00",,,,,,
USC-0078,Change Plate 2.5kg,Edge,Baik,DBON,Inventaris_Images/USC-0078.Foto Real.024304.jpg,2201,,"Rp0,00",,,,,,
USC-0079,Change Plate 5kg,Edge,Baik,DBON,Inventaris_Images/USC-0079.Foto Real.024130.jpg,2201,,"Rp0,00",,,,,,
USC-0080,Change Plate 1.5kg,Edge,Baik,DBON,Inventaris_Images/USC-0080.Foto Real.023941.jpg,2201,,"Rp0,00",,,,,,
USC-0088,Balance Board,Technogym,Baik,SSFC,Inventaris_Images/USC-0088.Foto Real.025205.jpg,2201,,"Rp0,00",,,,,,
USC-0089,Meteran TB,Gea Medical,Baik,,Inventaris_Images/USC-0089.Foto Real.041905.jpg,1415,,,,,,,hari,
USC-0097,Balance Board,Technogym,Baik,SSFC,Inventaris_Images/USC-0097.Foto Real.025134.jpg,2201,,"Rp0,00",,,,,,
USC-0099,Battle Rope,Edge,Baik,DBON,Inventaris_Images/USC-0099.Foto Real.024609.jpg,2201,,"Rp0,00",,,,,,
USC-0102,Ergocycle,Technogym,Baik,SSFC,Inventaris_Images/USC-0102.Foto Real.010309.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0103,Ergocycle,Technogym,Baik,SSFC,Inventaris_Images/USC-0103.Foto Real.010347.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0104,Ergocycle,Technogym,Baik,SSFC,Inventaris_Images/USC-0104.Foto Real.010553.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0105,Ergocycle,Technogym,Baik,SSFC,Inventaris_Images/USC-0105.Foto Real.010712.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0106,Ergocycle,Technogym,Rusak,SSFC,Inventaris_Images/USC-0106.Foto Real.010955.jpg,SSFC Gym Area Lt. 1,Mati,"Rp0,00",,,,,,
USC-0107,Ergocycle,Technogym,Rusak,SSFC,Inventaris_Images/USC-0107.Foto Real.011021.jpg,SSFC Gym Area Lt. 1,Mati,"Rp0,00",,,,,,
USC-0108,Ergocycle,Technogym,Baik,SSFC,Inventaris_Images/USC-0108.Foto Real.011040.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0109,Treadmill,Technogym,Baik,SSFC,Inventaris_Images/USC-0109.Foto Real.011204.jpg,,,"Rp0,00",,,,,,
USC-0110,Treadmill,Technogym,Baik,SSFC,Inventaris_Images/USC-0110.Foto Real.011256.jpg,,,"Rp0,00",,,,,,
USC-0111,Treadmill,Technogym,Baik,SSFC,Inventaris_Images/USC-0111.Foto Real.011325.jpg,,,"Rp0,00",,,,,,
USC-0112,Treadmill,Technogym,Baik,SSFC,Inventaris_Images/USC-0112.Foto Real.011335.jpg,,,"Rp0,00",,,,,,
USC-0113,Treadmill,Technogym,Rusak,SSFC,Inventaris_Images/USC-0113.Foto Real.011421.jpg,,Karpet tidak ada,"Rp0,00",,,,,,
USC-0114,Treadmill,Technogym,Rusak,SSFC,Inventaris_Images/USC-0114.Foto Real.011423.jpg,,,"Rp0,00",,,,,,
USC-0115,Treadmill,Technogym,Rusak,SSFC,Inventaris_Images/USC-0115.Foto Real.011514.jpg,,Karpet tidak ada,"Rp0,00",,,,,,
USC-0116,Crossover 700,Technogym,Rusak,SSFC,Inventaris_Images/USC-0116.Foto Real.010754.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0117,Crossover 700,Technogym,Rusak,SSFC,Inventaris_Images/USC-0117.Foto Real.010827.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0118,Excite,Technogym,Rusak,SSFC,Inventaris_Images/USC-0118.Foto Real.010915.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0119,Bike race,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0119.Foto Real.011503.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0120,Pulley,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0120.Foto Real.011541.jpg,,,"Rp0,00",,,,,,
USC-0121,Lat machine,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0121.Foto Real.011702.jpg,,,"Rp0,00",,,,,,
USC-0122,Leg Press,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0122.Foto Real.012230.jpg,,Perlu dirakit,"Rp0,00",,,,,,
USC-0123,Multi Power,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0123.Foto Real.011807.jpg,,,"Rp0,00",,,,,,
USC-0124,Leg Curl,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0124.Foto Real.011834.jpg,,Belum dirakit,"Rp0,00",,,,,,
USC-0125,Multi hip,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0125.Foto Real.011754.jpg,,,"Rp0,00",,,,,,
USC-0126,bod pod,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0126.Foto Real.123656.jpg,SSFC Gym Area Lt. 1,Tinggal di rakit,"Rp0,00",,,,,,
USC-0127,Chest Press,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0127.Foto Real.012418.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0128,Chest Incline,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0128.Foto Real.012531.jpg,SSFC Gym Area Lt. 1,Belum dirakit,"Rp0,00",,,,,,
USC-0129,Butterfly,Technogym,Baik,SSFC,Inventaris_Images/USC-0129.Foto Real.013409.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0130,Multi Hip,Technogym,Baik,SSFC,Inventaris_Images/USC-0130.Foto Real.013502.jpg,,,"Rp0,00",,,,,,
USC-0131,Arm Curl,Technogym,Baik,SSFC,Inventaris_Images/USC-0131.Foto Real.013548.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0132,Shoulder Press,Technogym,Baik,SSFC,Inventaris_Images/USC-0132.Foto Real.013633.jpg,,,"Rp0,00",,,,,,
USC-0133,Leg Curl,Technogym,Baik,SSFC,Inventaris_Images/USC-0133.Foto Real.013726.jpg,,,"Rp0,00",,,,,,
USC-0134,Glute,Technogym,Baik,SSFC,Inventaris_Images/USC-0134.Foto Real.013800.jpg,,,"Rp0,00",,,,,,
USC-0135,Arm Extension,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0135.Foto Real.013917.jpg,SSFC Gym Area Lt. 2,Pegangan kiri hilang,"Rp0,00",,,,,,
USC-0136,Feed back point offline,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0136.Foto Real.013110.jpg,SSFC Gym Area Lt. 1,Tidak ada kabel power,"Rp0,00",,,,,,
USC-0137,Lower Back,Technogym,Baik,SSFC,Inventaris_Images/USC-0137.Foto Real.015725.jpg,,,"Rp0,00",,,,,,
USC-0138,Adductor,Technogym,Baik,SSFC,Inventaris_Images/USC-0138.Foto Real.014023.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0139,Chest Incline,Technogym,Baik,SSFC,Inventaris_Images/USC-0139.Foto Real.014440.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0142,Pulldown,Technogym,Baik,SSFC,Inventaris_Images/USC-0142.Foto Real.015817.jpg,,,"Rp0,00",,,,,,
USC-0143,Abductor,Technogym,Baik,SSFC,Inventaris_Images/USC-0143.Foto Real.014450.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0144,Upper Back,Technogym,Baik,SSFC,Inventaris_Images/USC-0144.Foto Real.014445.jpg,,,"Rp0,00",,,,,,
USC-0145,Delts Machine,Technogym,Baik,SSFC,Inventaris_Images/USC-0145.Foto Real.014556.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0146,Abdominal Crunch,Technogym,Baik,SSFC,Inventaris_Images/USC-0146.Foto Real.014459.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0147,Vertical Traction,Technogym,Baik,SSFC,Inventaris_Images/USC-0147.Foto Real.015938.jpg,,,"Rp0,00",,,,,,
USC-0148,Pulley,Technogym,Baik,SSFC,Inventaris_Images/USC-0148.Foto Real.020012.jpg,,,"Rp0,00",,,,,,
USC-0149,Rotary Calf,Technogym,Baik,SSFC,Inventaris_Images/USC-0149.Foto Real.014519.jpg,,,"Rp0,00",,,,,,
USC-0150,Chest Press,Technogym,Baik,SSFC,Inventaris_Images/USC-0150.Foto Real.014654.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0151,Rotary Torso,Technogym,Baik,SSFC,Inventaris_Images/USC-0151.Foto Real.014731.jpg,,,"Rp0,00",,,,,,
USC-0152,Pectoral,Technogym,Baik,SSFC,Inventaris_Images/USC-0152.Foto Real.014837.jpg,,,"Rp0,00",,,,,,
USC-0153,Low Row,Technogym,Baik,SSFC,Inventaris_Images/USC-0153.Foto Real.014805.jpg,,,"Rp0,00",,,,,,
USC-0154,Total Abdominal,Technogym,Baik,SSFC,Inventaris_Images/USC-0154.Foto Real.015012.jpg,,,"Rp0,00",,,,,,
USC-0155,Lat Machine,Technogym,Baik,SSFC,Inventaris_Images/USC-0155.Foto Real.014917.jpg,,,"Rp0,00",,,,,,
USC-0156,Pull Up,Technogym,Baik,SSFC,Inventaris_Images/USC-0156.Foto Real.015224.jpg,,,"Rp0,00",,,,,,
USC-0157,Leg Press,Technogym,Baik,SSFC,Inventaris_Images/USC-0157.Foto Real.015307.jpg,,,"Rp0,00",,,,,,
USC-0158,Ercolina Radiant,Technogym,Baik,SSFC,Inventaris_Images/USC-0158.Foto Real.020115.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0159,Cable Jungle,Technogym,Baik,SSFC,Inventaris_Images/USC-0159.Foto Real.020335.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0160,Flexibility Anterior,Technogym,Baik,SSFC,Inventaris_Images/USC-0160.Foto Real.020239.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0201,Kinesis,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0201.Foto Real.021255.jpg,,Tidak ada kunci pemberat,"Rp0,00",,,,,,
USC-0202,Kinesis,Technogym,Baik,SSFC,Inventaris_Images/USC-0202.Foto Real.021340.jpg,,,"Rp0,00",,,,,,
USC-0203,Indoor Rowing,Concept 2,Baik,SSFC,Inventaris_Images/USC-0203.Foto Real.021515.jpg,,,"Rp0,00",,,,,,
USC-0204,Indoor Rowing,Concept 2,Baik,SSFC,Inventaris_Images/USC-0204.Foto Real.021539.jpg,,,"Rp0,00",,,,,,
USC-0205,Kinesis,Technogym,Baik,SSFC,Inventaris_Images/USC-0205.Foto Real.021623.jpg,,,"Rp0,00",,,,,,
USC-0206,Kinesis,Technogym,Baik,SSFC,Inventaris_Images/USC-0206.Foto Real.021703.jpg,,,"Rp0,00",,,,,,
USC-0207,Flexability Posterior,Technogym,Baik,SSFC,Inventaris_Images/USC-0207.Foto Real.021917.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0208,Multi Power,Technogym,Baik,SSFC,Inventaris_Images/USC-0208.Foto Real.022013.jpg,,,"Rp0,00",,,,,,
USC-0209,Multi Power,Technogym,Baik,SSFC,Inventaris_Images/USC-0209.Foto Real.022145.jpg,,,"Rp0,00",,,,,,
USC-0210,Bench,Technogym,Baik,SSFC,Inventaris_Images/USC-0210.Foto Real.022434.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0211,Bench Press,Technogym,Baik,SSFC,Inventaris_Images/USC-0211.Foto Real.022343.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0212,Shoulder Bench,Technogym,Kurang Baik,SSFC,Inventaris_Images/USC-0212.Foto Real.022858.jpg,,Penahan beban kropos,"Rp0,00",,,,,,
USC-0213,Bench Press,Technogym,Baik,SSFC,Inventaris_Images/USC-0213.Foto Real.022510.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0214,Sit Up Bench,Technogym,Baik,SSFC,Inventaris_Images/USC-0214.Foto Real.022907.jpg,,,"Rp0,00",,,,,,
USC-0215,Sit Up Bench,Technogym,Baik,SSFC,Inventaris_Images/USC-0215.Foto Real.022104.jpg,,,"Rp0,00",,,,,,
USC-0216,Dumbel Rack,,Kurang Baik,SSFC,Inventaris_Images/USC-0216.Foto Real.022913.jpg,SSFC Gym Area Lt. 2,Berkarat,"Rp0,00",,,,,,
USC-0217,Indoor Rowing,Concept 2,Rusak,SSFC,Inventaris_Images/USC-0217.Foto Real.022918.jpg,,,"Rp0,00",,,,,,
USC-0218,EDGE Air Bike,,Baik,DBON,,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0219,EDGE Air Bike,,Baik,DBON,,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0222,Dumbbell Rack 3 Tier,Edge,Baik,DBON,Inventaris_Images/USC-0222.Foto Real.020516.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0223,Dumbbell Rack 4 Tier,Edge,Baik,DBON,Inventaris_Images/USC-0223.Foto Real.020536.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0224,Dumbbell Rack 5 Tier,Edge,Baik,DBON,Inventaris_Images/USC-0224.Foto Real.020629.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0225,Plate & Bar Tree,Edge,Baik,DBON,Inventaris_Images/USC-0225.Foto Real.022848.jpg,,,"Rp0,00",,,,,,
USC-0226,Elite 2D Squat Rack,Edge,Baik,DBON,Inventaris_Images/USC-0226.Foto Real.024638.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0227,Edge - SID Bench,Edge,Baik,DBON,Inventaris_Images/USC-0227.Foto Real.011953.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0228,Elite 2D Squat Rack,Edge,Baik,DBON,Inventaris_Images/USC-0228.Foto Real.024524.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0229,Edge - SID Bench,Edge,Baik,DBON,Inventaris_Images/USC-0229.Foto Real.011921.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0230,Elite 2D Squat Rack,Edge,Baik,DBON,Inventaris_Images/USC-0230.Foto Real.024440.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0231,Edge - SID Bench,Edge,Baik,DBON,Inventaris_Images/USC-0231.Foto Real.011840.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0232,Power Slide,Edge,Baik,DBON,Inventaris_Images/USC-0232.Foto Real.024357.jpg,,,"Rp0,00",,,,,,
USC-0234,Wooden Box,,Baik,DBON,Inventaris_Images/USC-0234.Foto Real.022554.jpg,,,"Rp0,00",,,,,,
USC-0235,Plate Rack,Technogym,Baik,SSFC,Inventaris_Images/USC-0235.Foto Real.022256.jpg,,,"Rp0,00",,,,,,
USC-0237,Plyosoft Box,Edge,Baik,DBON,Inventaris_Images/USC-0237.Foto Real.022351.jpg,,,"Rp0,00",,,,,,
USC-0238,VIPR 6KG,Edge,Baik,DBON,Inventaris_Images/USC-0238.Foto Real.022258.jpg,,,"Rp0,00",,,,,,
USC-0239,Bosu Balance Ball,SVRG,Baik,SSFC,Inventaris_Images/USC-0239.Foto Real.021109.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0240,Bosu Balance Ball,Livepro,Baik,DBON,Inventaris_Images/USC-0240.Foto Real.020906.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0241,Agility Leader,SVRG,Baik,SSFC,Inventaris_Images/USC-0241.Foto Real.024832.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0242,Agility Leader,SVRG,Baik,DBON,Inventaris_Images/USC-0242.Foto Real.024732.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0243,Plyosoft Box,Edge,Baik,DBON,Inventaris_Images/USC-0243.Foto Real.022413.jpg,,,"Rp0,00",,,,,,
USC-0244,Wooden Box,Edge,Baik,DBON,Inventaris_Images/USC-0244.Foto Real.022653.jpg,,,"Rp0,00",,,,,,
USC-0245,Equalizer,Edge,Baik,DBON,Inventaris_Images/USC-0245.Foto Real.022203.jpg,SSFC Gym Area Lt. 2,4 pc,"Rp0,00",,,,,,
USC-0248,Plate & Bar Tree,Edge,Baik,DBON,Inventaris_Images/USC-0248.Foto Real.014604.jpg,,,"Rp0,00",,,,,,
USC-0249,Elite Hollow Kettlebell 32KG,Edge,Baik,DBON,Inventaris_Images/USC-0249.Foto Real.021529.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0250,Elite Hollow Kettlebell 28KG,,Baik,DBON,Inventaris_Images/USC-0250.Foto Real.021542.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0251,Elite Hollow Kettlebell 24KG,,Baik,DBON,Inventaris_Images/USC-0251.Foto Real.021618.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0252,Elite Hollow Kettlebell 22KG,,Baik,DBON,Inventaris_Images/USC-0252.Foto Real.021633.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0253,Elite Hollow Kettlebell 20KG,,Baik,DBON,Inventaris_Images/USC-0253.Foto Real.021652.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0254,Elite Hollow Kettlebell 16KG,,Baik,DBON,Inventaris_Images/USC-0254.Foto Real.021722.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0255,Elite Hollow Kettlebell 12KG,,Baik,DBON,Inventaris_Images/USC-0255.Foto Real.021740.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0256,Elite Hollow Kettlebell 10KG,,Baik,DBON,Inventaris_Images/USC-0256.Foto Real.021752.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0257,Elite Hollow Kettlebell 8KG,,Baik,DBON,Inventaris_Images/USC-0257.Foto Real.021818.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0258,Abductor,Technogym,Rusak,SSFC,Inventaris_Images/USC-0258.Foto Real.014049.jpg,SSFC Lt. 1 Gym Area,,"Rp0,00",,,,,,
USC-0259,Stadiometer,TTM,Baik,SSFC,Inventaris_Images/USC-0259.Foto Real.014246.jpg,,,"Rp0,00",,,,,,
USC-0262,Lifting Platform,Edge,Baik,DBON,Inventaris_Images/USC-0262.Foto Real.014925.jpg,,,"Rp0,00",,,,,,
USC-0263,Junior Bar,Edge,Baik,DBON,Inventaris_Images/USC-0263.Foto Real.015156.jpg,,,"Rp0,00",,,,,,
USC-0264,Women Warza Bar,Edge,Baik,DBON,Inventaris_Images/USC-0264.Foto Real.015247.jpg,,,"Rp0,00",,,,,,
USC-0265,Edge RZ Garuda Bar,Edge,Baik,DBON,Inventaris_Images/USC-0265.Foto Real.015340.jpg,SSFC Gym Area Lt. 1,,"Rp0,00",,,,,,
USC-0266,Livepro Eco Black Plate 5kg,Livepro,Baik,DBON,Inventaris_Images/USC-0266.Foto Real.015602.jpg,,2 pairs lt. 1; 1 pairs lt. 2,"Rp0,00",,,,,,
USC-0267,Livepro Eco Black Plate 10kg,Livepro,Baik,DBON,Inventaris_Images/USC-0267.Foto Real.015703.jpg,,2 pairs,"Rp0,00",,,,,,
USC-0268,Livepro Eco Black Plate 15kg,Livepro,Baik,DBON,Inventaris_Images/USC-0268.Foto Real.015842.jpg,,2 pairs,"Rp0,00",,,,,,
USC-0269,Livepro Eco Black Plate 20kg,Livepro,Baik,DBON,Inventaris_Images/USC-0269.Foto Real.015934.jpg,,,"Rp0,00",,,,,,
USC-0270,Trolley,Krisbow,Baik,SSFC,Inventaris_Images/USC-0270.Foto Real.020331.jpg,,,"Rp0,00",,,,,,
USC-0271,Junior Bar,Edge,Baik,DBON,Inventaris_Images/USC-0271.Foto Real.023619.jpg,,2 pcs,"Rp0,00",,,,,,
USC-0272,Women Warza Bar,Edge,Baik,DBON,Inventaris_Images/USC-0272.Foto Real.023503.jpg,,2 pcs,"Rp0,00",,,,,,
USC-0273,Edge RZ Garuda Bar,Edge,Baik,DBON,Inventaris_Images/USC-0273.Foto Real.023430.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0274,Bosu Balance Ball,SVRG,Baik,SSFC,Inventaris_Images/USC-0274.Foto Real.021411.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0275,VIPR 8kg,Edge,Baik,DBON,Inventaris_Images/USC-0275.Foto Real.022457.jpg,,,"Rp0,00",,,,,,
USC-0276,VIPR 4kg,Edge,Baik,DBON,Inventaris_Images/USC-0276.Foto Real.022533.jpg,,,"Rp0,00",,,,,,
USC-0277,Hexabar,Edge,Baik,DBON,Inventaris_Images/USC-0277.Foto Real.022812.jpg,,,"Rp0,00",,,,,,
USC-0278,EZ Curl Bar,Edge,Baik,DBON,Inventaris_Images/USC-0278.Foto Real.022947.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0279,Change Plate 0.5kg,Edge,Baik,DBON,Inventaris_Images/USC-0279.Foto Real.023906.jpg,SSFC Gym Area Lt. 2,3 pairs,"Rp0,00",,,,,,
USC-0280,Change Plate 1kg,Edge,Baik,DBON,Inventaris_Images/USC-0280.Foto Real.024038.jpg,SSFC Gym Area Lt. 2,,"Rp0,00",,,,,,
USC-0281,Push Pull Dynamometer,TTM,Baik,,Inventaris_Images/USC-0281.Foto Real.062124.jpg,1415,Pindah Lt 4,,"Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,Dipinjam
USC-0282,Push Pull Dynamometer,TTM,Baik,,Inventaris_Images/USC-0282.Foto Real.062415.jpg,1415,Pindah Lt 4,,"Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,Tersedia
USC-0283,Push Pull Dynamometer,TTM,Baik,,Inventaris_Images/USC-0283.Foto Real.062628.jpg,1415,Pindah Lt 4,,"Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,Tersedia
USC-0284,Push Pull Dynamometer,TTM,Baik,,Inventaris_Images/USC-0284.Foto Real.062812.jpg,1415,Pindah Lt 4,,"Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,Tersedia
USC-0285,Push Pull Dynamometer,TTM,Kurang Baik,,Inventaris_Images/USC-0285.Foto Real.062941.jpg,1415,Pindah Lt 4,,"Rp37.500,00","Rp50.000,00","Rp62.500,00","Rp75.000,00",hari,Tersedia
USC-0286,Timbangan BB,MI (Gea Medical),Baik,,Inventaris_Images/USC-0286.Foto Real.040145.jpg,1415,,,,,,,hari,Tersedia
USC-0287,Meteran TB,Gea Medical,Baik,,Inventaris_Images/USC-0287.Foto Real.040350.jpg,1415,,,,,,,hari,Tersedia
USC-0288,Timbangan BB,MI (Gea Medical),Baik,,Inventaris_Images/USC-0288.Foto Real.041802.jpg,1415,,,,,,,hari,Tersedia
USC-0289,Meteran TB,Gea Medical,Baik,,Inventaris_Images/USC-0289.Foto Real.042014.jpg,1415,,,,,,,hari,Tersedia
USC-0290,Meteran TB,Gea Medical,Baik,,Inventaris_Images/USC-0290.Foto Real.134116.jpg,1415,,,,,,,hari,Tersedia
USC-0293,Meteran Roll,Krisbow,Baik,,Inventaris_Images/USC-0293.Foto Real.111027.jpg,1415,,,"Rp40.000,00","Rp40.000,00",,,hari,Tersedia
USC-0294,Meteran Roll,Krisbow,Baik,,Inventaris_Images/USC-0294.Foto Real.091232.jpg,1415,,,"Rp40.000,00","Rp40.000,00",,,hari,Tersedia
USC-300,Cone,-,Baik,-,Inventaris_Images/USC-300.Foto Real.133849.jpg,1415,1 set (10 cone),"Rp0,00","Rp0,00","Rp10.000,00","Rp0,00","Rp0,00",hari,Tersedia
USC-0291,Sound JBL,JBL,Baik,,Inventaris_Images/USC-0291.Foto Real.035544.jpg,,,,,,,,hari,Tersedia
USC-0295,Mix Wireless Microphone System,JBL,Baik,,Inventaris_Images/USC-0295.Foto Real.035746.jpg,,,,,,,,hari,Tersedia
USC-0296,Matras,,,,,,,,,,,,,hari,Tersedia
USC-03001,Body Scale,-,Baik,,Inventaris_Images/USC-03001.Foto Real.071721.jpg,1415,,,,,,,hari,Tersedia
USC-03002,Marker,-,Baik,,Inventaris_Images/USC-03002.Foto Real.072139.jpg,1415,,,,,,,hari,Tersedia
USC-0303,Tensi,omron,Baik,,Inventaris_Images/USC-0303.Foto Real.053424.jpg,1415,,,"Rp25.000,00","Rp25.000,00",,"Rp35.000,00",hari,Tersedia
USC-0304,Polar Verity,,Baik,,Inventaris_Images/USC-0304.Foto Real.053243.jpg,1415,harga per polar,,"Rp35.000,00","Rp35.000,00",,"Rp45.000,00",hari,Tersedia
USC-305,Body Scale,OnPoint,Baik,PUI Keolahragaan,Inventaris_Images/USC-305.Foto Real.052548.jpg,1218,,,,,,,hari,Tersedia`

function parsePrice(str) {
  if (!str || str.trim() === '') return null
  const cleaned = str.replace(/Rp/g, '').replace(/\./g, '').replace(',', '.').trim()
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

function mapCondition(status) {
  if (status === 'Baik') return 'good'
  if (status === 'Kurang Baik') return 'needs_repair'
  if (status === 'Rusak') return 'damaged'
  return 'good'
}

function mapKetersediaan(statusPinjam) {
  if (statusPinjam === 'Dipinjam') return 'digunakan'
  return 'tersedia'
}

function esc(str) {
  if (!str || str.trim() === '' || str === '-') return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

const lines = csv.trim().split('\n')
const rows = lines.slice(1).map(parseCSVLine)

console.log('-- ============================================================')
console.log('-- STEP 1: Add new columns to assets table')
console.log('-- ============================================================')
console.log(`ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS asset_code TEXT,
  ADD COLUMN IF NOT EXISTS rate_mahasiswa NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_pascasarjana NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_dosen_karyawan NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_kerjasama NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_umum NUMERIC(12,2);
`)

console.log('-- ============================================================')
console.log('-- STEP 2: Insert equipment data from CSV')
console.log('-- ============================================================')
console.log(`INSERT INTO public.assets (
  name, category, merk, current_condition, sumber, description,
  ketersediaan, status_tindakan, asset_code,
  rate_mahasiswa, rate_pascasarjana, rate_dosen_karyawan, rate_kerjasama, rate_umum
) VALUES`)

const insertRows = rows.map(cols => {
  const code       = cols[0]?.trim() ?? ''
  const nama       = cols[1]?.trim() ?? ''
  const merk       = cols[2]?.trim() ?? ''
  const status     = cols[3]?.trim() ?? ''
  const sumber     = cols[4]?.trim() ?? ''
  const keterangan = cols[7]?.trim() ?? ''
  const mahasiswa  = parsePrice(cols[8])
  const pasca      = parsePrice(cols[9])
  const dosen      = parsePrice(cols[10])
  const kerjasama  = parsePrice(cols[11])
  const umum       = parsePrice(cols[12])
  const statusPinjam = cols[14]?.trim() ?? ''

  const condition   = mapCondition(status)
  const ketersediaan = mapKetersediaan(statusPinjam)

  const mVal  = mahasiswa  !== null ? mahasiswa  : 'NULL'
  const pVal  = pasca      !== null ? pasca      : 'NULL'
  const dVal  = dosen      !== null ? dosen      : 'NULL'
  const kVal  = kerjasama  !== null ? kerjasama  : 'NULL'
  const uVal  = umum       !== null ? umum       : 'NULL'

  return `  (${esc(nama)}, 'equipment', ${esc(merk)}, '${condition}', ${esc(sumber)}, ${esc(keterangan)}, '${ketersediaan}', 'normal', ${esc(code)}, ${mVal}, ${pVal}, ${dVal}, ${kVal}, ${uVal})`
})

console.log(insertRows.join(',\n') + ';')
