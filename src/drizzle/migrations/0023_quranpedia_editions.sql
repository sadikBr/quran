ALTER TABLE "user_settings" ALTER COLUMN "arabic_edition" SET DEFAULT 'quranpedia.mushaf.1';--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "translation_edition" SET DEFAULT 'quranpedia.translation.13638';--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "tafsir_edition" SET DEFAULT 'quranpedia.tafsir.2012';
--> statement-breakpoint
UPDATE "user_settings" SET "arabic_edition" = 'quranpedia.mushaf.1'
WHERE "arabic_edition" NOT IN ('quranpedia.mushaf.1', 'quranpedia.mushaf.2');
--> statement-breakpoint
UPDATE "user_settings" SET "translation_edition" = 'quranpedia.translation.13638'
WHERE "translation_edition" NOT IN (
    'quranpedia.translation.13638', 'quranpedia.translation.1948',
    'quranpedia.translation.13604', 'quranpedia.translation.13605',
    'quranpedia.translation.13640', 'quranpedia.translation.13644',
    'quranpedia.translation.13645', 'quranpedia.translation.13661'
);
--> statement-breakpoint
UPDATE "user_settings" SET "tafsir_edition" = 'quranpedia.tafsir.2012'
WHERE "tafsir_edition" NOT IN (
    'quranpedia.tafsir.2012', 'quranpedia.tafsir.272', 'quranpedia.tafsir.363',
    'quranpedia.tafsir.321', 'quranpedia.tafsir.2',
    'quranpedia.tafsir.3', 'quranpedia.tafsir.4'
);
--> statement-breakpoint
UPDATE "user_settings" SET "reciter" = CASE WHEN "riwayah" = 'warsh' THEN 'quranpedia/263' ELSE 'quranpedia/255' END
WHERE "reciter" !~ '^quranpedia/[0-9]+$';
