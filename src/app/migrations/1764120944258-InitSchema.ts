import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1764120944258 implements MigrationInterface {
    name = 'InitSchema1764120944258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "attempt_annotations" ("id" SERIAL NOT NULL, "attempt_id" integer NOT NULL, "is_false_positive" boolean NOT NULL DEFAULT false, "updated_by" character varying, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fdef14a591ab3576d840e324535" UNIQUE ("attempt_id"), CONSTRAINT "REL_fdef14a591ab3576d840e32453" UNIQUE ("attempt_id"), CONSTRAINT "PK_468d36af8cec0e8976597ec32da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attempts" ("id" SERIAL NOT NULL, "report_id" integer NOT NULL, "uuid" uuid NOT NULL, "seq" integer NOT NULL, "status" integer NOT NULL, "probe_classname" character varying, "goal" text, "prompt" jsonb, "outputs" jsonb, "detector_results" jsonb, "notes" jsonb, "conversations" jsonb, "reverse_translation_outputs" jsonb, "probe_params" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_295ca261e361fd2fd217754dcac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_86a3bd87b2a96a1aac5a77fdc9" ON "attempts" ("report_id", "status", "seq") `);
        await queryRunner.query(`CREATE INDEX "IDX_17fc75e68779dbacd9230d9a34" ON "attempts" ("report_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_0cf12f5864bc873ffe82fd3cae" ON "attempts" ("report_id", "seq") `);
        await queryRunner.query(`CREATE TABLE "reports" ("id" SERIAL NOT NULL, "run_id" character varying NOT NULL, "report_filename" text, "garak_version" character varying, "model_type" character varying, "model_name" character varying, "config" jsonb, "started_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0dfd317780c4f72776c5bed5523" UNIQUE ("run_id"), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "attempt_annotations" ADD CONSTRAINT "FK_fdef14a591ab3576d840e324535" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_0d90eb501fc60e79b1115a45166" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_0d90eb501fc60e79b1115a45166"`);
        await queryRunner.query(`ALTER TABLE "attempt_annotations" DROP CONSTRAINT "FK_fdef14a591ab3576d840e324535"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0cf12f5864bc873ffe82fd3cae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17fc75e68779dbacd9230d9a34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86a3bd87b2a96a1aac5a77fdc9"`);
        await queryRunner.query(`DROP TABLE "attempts"`);
        await queryRunner.query(`DROP TABLE "attempt_annotations"`);
    }

}
